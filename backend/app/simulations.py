from decimal import Decimal
from typing import Literal
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session
from backend.app.db import get_session
from backend.app.models import SourceDataset
from backend.app.observations import municipality_or_404, observations_for, observation_out
from backend.app.schemas import MunicipalityOut, ObservationOut
from backend.app.simulation_math import MODEL_VERSION, simulate
from backend.app.simulation_quality import eligibility, EVIDENCE

router = APIRouter(prefix="/api/v1")


class ReferenceInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    municipality_id: UUID
    observation_id: UUID
    source_id: UUID
    sha256: str = Field(pattern="^[a-f0-9]{64}$")
    metric: Literal["separate_collection_pct"] = "separate_collection_pct"
    target: Decimal = Field(ge=0, le=100, allow_inf_nan=False)


class ScenarioInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference: ReferenceInput | None = None
    name: str = Field(min_length=1, max_length=80)
    model: Literal["diversion", "prevention"]
    kind: Literal["fraction", "tonnes", "target"]
    value: Decimal = Field(allow_inf_nan=False, max_digits=24, decimal_places=12)


class SimulationInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    municipality_id: UUID
    year: int = Field(ge=2017, le=2024)
    observation_id: UUID
    sha256: str = Field(pattern="^[a-f0-9]{64}$")
    model_version: Literal["public-service-mass-balance-v1"] = MODEL_VERSION
    scenarios: list[ScenarioInput] = Field(min_length=1, max_length=4)


class SimulationContext(BaseModel):
    municipality: MunicipalityOut
    observation: ObservationOut
    available: bool
    reasons: list[str]
    model_version: str
    evidence: str


class ScenarioState(BaseModel):
    total_t: Decimal
    mixed_t: Decimal
    separate_t: Decimal
    rate_pct: Decimal | None
    total_kg_per_person: Decimal | None
    mixed_kg_per_person: Decimal | None
    separate_kg_per_person: Decimal | None


class ScenarioResult(BaseModel):
    input: ScenarioInput
    reference: SimulationContext | None = None
    initial: ScenarioState
    result: ScenarioState
    difference: dict[str, Decimal | None]
    change_t: Decimal
    already_reached: bool
    mixed_reduction_pct: Decimal


class SimulationOutput(BaseModel):
    context: SimulationContext
    scenarios: list[ScenarioResult]
    assumptions: list[str]


def context(session, mid, year):
    municipality = municipality_or_404(session, mid)
    obs = next((o for o in observations_for(session, mid) if o.year == year), None)
    if obs is None:
        raise HTTPException(
            404,
            detail={"code": "observation_not_found", "message": "Nema zapisa za odabranu godinu."},
        )
    source = session.get(SourceDataset, obs.source_id)
    reasons = eligibility(obs, source)
    result = observation_out(session, obs, None)
    return obs, SimulationContext(
        municipality=MunicipalityOut.model_validate(municipality),
        observation=result,
        available=not reasons,
        reasons=reasons,
        model_version=MODEL_VERSION,
        evidence=EVIDENCE,
    )


@router.get("/municipalities/{mid}/simulation-context", response_model=SimulationContext)
def get_context(
    mid: UUID, year: int = Query(ge=2017, le=2024), session: Session = Depends(get_session)
):
    return context(session, mid, year)[1]


@router.post("/simulations", response_model=SimulationOutput)
def calculate(request: SimulationInput, session: Session = Depends(get_session)):
    obs, ctx = context(session, request.municipality_id, request.year)
    if obs.id != request.observation_id or ctx.observation.source.sha256 != request.sha256:
        raise HTTPException(
            409,
            detail={
                "code": "source_revision_changed",
                "message": "Promijenjena je revizija početnog izvora. Ponovno učitajte podatke.",
            },
        )
    if not ctx.available:
        raise HTTPException(
            422, detail={"code": "simulation_unavailable", "message": " ".join(ctx.reasons)}
        )
    results = []
    for scenario in request.scenarios:
        reference = None
        if scenario.reference:
            ref = scenario.reference
            other, reference = context(session, ref.municipality_id, request.year)
            if (
                other.id != ref.observation_id
                or other.source_id != ref.source_id
                or reference.observation.source.sha256 != ref.sha256
            ):
                raise HTTPException(
                    409,
                    detail={
                        "code": "reference_revision_changed",
                        "message": "Promijenjen referentni izvor.",
                    },
                )
            if (
                not reference.available
                or other.municipality_id == obs.municipality_id
                or other.scope != obs.scope
                or other.methodology_group != obs.methodology_group
                or other.published_separate_collection_pct != ref.target
            ):
                raise HTTPException(
                    422,
                    detail={
                        "code": "invalid_reference",
                        "message": "Referentni rezultat nije valjan za ovaj scenarij.",
                    },
                )
            if scenario.kind != "target" or scenario.value != ref.target:
                raise HTTPException(
                    422,
                    detail={
                        "code": "reference_target_mismatch",
                        "message": "Referentni cilj ne odgovara scenariju.",
                    },
                )
        try:
            values = simulate(
                obs.total_t,
                obs.mixed_t,
                scenario.model,
                scenario.kind,
                scenario.value,
                obs.covered_population if obs.population_usable else None,
            )
        except ValueError as exc:
            raise HTTPException(
                422, detail={"code": "invalid_scenario", "message": str(exc)}
            ) from exc
        results.append(ScenarioResult(input=scenario, reference=reference, **values))
    return SimulationOutput(
        context=ctx,
        scenarios=results,
        assumptions=[
            "Hipotetski matematički scenarij, bez prognoze učinka, roka ili troška mjera.",
            "Odvojeno sakupljanje nije recikliranje. Ne pretpostavljamo da je sav miješani otpad moguće odvojiti.",
            "Preusmjeravanje: T ostaje konstantan; sva promjena ostaje u istom obuhvatu, bez gubitaka.",
            "Prevencija: smanjuju se T i M za istu masu; odvojeno sakupljena masa ostaje ista.",
            "Obuhvaćena populacija ostaje konstantna; sporan nazivnik isključuje kg po stanovniku.",
            "Izračun polazi od masa; objavljena stopa ostaje zasebna zbog zaokruživanja.",
            "Usporedivost godina nije potvrđena; promjena izvještavanja recikliranih količina nije dio ovog modela.",
            "Sedam materijalnih kategorija ne raspodjeljuje se niti zbraja u scenariju.",
        ],
    )
