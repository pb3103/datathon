from pathlib import Path
from uuid import UUID
from alembic.config import Config
from alembic.script import ScriptDirectory
from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import exists, func, or_, select, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from backend.app.config import get_settings
from backend.app.db import get_session
from backend.app.models import (
    ImportRun,
    Municipality,
    MunicipalityAlias,
    QualityIssue,
    SourceDataset,
    WasteObservation,
)
from backend.app.schemas import (
    Comparability,
    IssueOut,
    Metric,
    MunicipalitiesPage,
    MunicipalityOut,
    ObservationOut,
    ProfileOut,
    SourceOut,
    SourcesPage,
    YearOut,
    YearsOut,
)
from pipeline.extract import normalize_name

app = FastAPI(
    title="WasteWise API",
    version="0.1.0",
    description="Podaci o sakupljanju u javnoj usluzi. Stopa odvojenog sakupljanja nije stopa recikliranja. Decimalne vrijednosti u JSON-u su stringovi radi očuvanja preciznosti.",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origins,
    allow_methods=["GET"],
    allow_headers=["Accept", "Content-Type"],
)
PREFIX = "/api/v1"


@app.exception_handler(SQLAlchemyError)
def database_error(request: Request, exc: SQLAlchemyError):
    return JSONResponse(
        status_code=503,
        content={
            "detail": {
                "code": "database_unavailable",
                "message": "Baza ili potrebna shema trenutačno nije dostupna.",
            }
        },
    )


def municipality_or_404(session: Session, mid: UUID):
    municipality = session.get(Municipality, mid)
    if municipality is None:
        raise HTTPException(
            404, detail={"code": "municipality_not_found", "message": "JLS ne postoji."}
        )
    return municipality


def issues_for(session: Session, source_id: UUID, observation_id: UUID | None = None):
    if observation_id is not None:
        query = select(QualityIssue).where(QualityIssue.observation_id == observation_id)
    else:
        query = (
            select(QualityIssue)
            .join(ImportRun)
            .where(
                ImportRun.source_id == source_id,
                ImportRun.status == "completed",
                QualityIssue.observation_id.is_(None),
                QualityIssue.source_row.is_(None),
            )
        )
    return [IssueOut.model_validate(i) for i in session.scalars(query.order_by(QualityIssue.id))]


def source_out(session: Session, source: SourceDataset):
    result = SourceOut.model_validate(source)
    result.issues = issues_for(session, source.id)
    return result


def comparability(obs: WasteObservation, previous: WasteObservation | None, source_issues):
    reasons = ["local_scope_and_boundary_continuity_not_verified"]
    if previous and previous.year != obs.year - 1:
        reasons.append("nonconsecutive_years")
    if previous and previous.methodology_group != obs.methodology_group:
        reasons.append("methodology_group_changed")
    if not obs.population_usable:
        reasons.append("population_requires_review_or_missing")
    if source_issues:
        reasons.extend(i.code for i in source_issues)
    changed = (
        previous.covered_population != obs.covered_population if previous is not None else None
    )
    if changed:
        reasons.append("covered_population_changed")
    return Comparability(
        methodology_group=obs.methodology_group,
        previous_year=previous.year if previous else None,
        population_changed=changed,
        reasons=reasons,
    )


def observations_for(session: Session, mid: UUID):
    return session.scalars(
        select(WasteObservation)
        .where(WasteObservation.municipality_id == mid, WasteObservation.active)
        .order_by(WasteObservation.year)
    ).all()


def metric(value, unit, reason=None, quality_status="available"):
    return Metric(
        value=value,
        unit=unit,
        reason=reason if value is None else None,
        quality_status=quality_status if value is not None else "unavailable",
    )


def observation_out(session: Session, obs: WasteObservation, previous: WasteObservation | None):
    source = session.get(SourceDataset, obs.source_id)
    src = source_out(session, source)
    issues = issues_for(session, source.id, obs.id)
    t, m, p = obs.total_t, obs.mixed_t, obs.covered_population
    population_reason = (
        "population_requires_review" if p is not None else "missing_covered_population"
    )
    valid_p = p is not None and p > 0 and obs.population_usable
    kg_bad = any(i.code == "kg_per_capita_mismatch" for i in issues)
    rate_bad = any(i.code == "separate_collection_rate_mismatch" for i in issues)
    values = {
        "total_t": metric(t, "t", "missing_total"),
        "mixed_t": metric(m, "t", "missing_mixed"),
        "covered_population": metric(
            p,
            "covered_persons",
            "missing_covered_population",
            "available" if obs.population_usable else "review_required",
        ),
        "published_kg_per_covered_person": metric(
            obs.published_kg_per_capita,
            "kg/covered_person",
            "missing_published_value",
            "review_required" if kg_bad else "available",
        ),
        "separate_collection_pct": metric(
            obs.published_separate_collection_pct,
            "%",
            "missing_published_rate",
            "review_required" if rate_bad else "available",
        ),
        "total_kg_per_covered_person": metric(
            1000 * t / p if valid_p and t is not None else None,
            "kg/covered_person",
            population_reason if not valid_p else "missing_total",
        ),
        "mixed_kg_per_covered_person": metric(
            1000 * m / p if valid_p and m is not None else None,
            "kg/covered_person",
            population_reason if not valid_p else "missing_mixed",
        ),
        "mixed_share_pct": metric(
            100 * m / t if t is not None and t > 0 and m is not None else None,
            "%",
            "zero_or_missing_total_or_missing_mixed",
        ),
        "total_minus_mixed_t": metric(
            t - m if t is not None and m is not None else None, "t", "missing_total_or_mixed"
        ),
        "control_separate_collection_pct": metric(
            100 * (t - m) / t if t is not None and t > 0 and m is not None else None,
            "%",
            "zero_or_missing_total_or_missing_mixed",
        ),
    }
    # Methodology is deliberately unverified for the audited files. A future
    # verified source still needs complete, coherent row inputs and a matching G.
    target_available = bool(
        source.methodology_verified
        and t is not None
        and t > 0
        and m is not None
        and 0 <= m <= t
        and obs.published_separate_collection_pct is not None
        and not rate_bad
    )
    return ObservationOut(
        id=obs.id,
        year=obs.year,
        scope=obs.scope,
        source_row=obs.source_row,
        source=src,
        quality_status=obs.quality_status,
        population_usable=obs.population_usable,
        raw_values=obs.raw_values,
        metrics=values,
        issues=issues,
        comparability=comparability(obs, previous, src.issues),
        target_rate_available=target_available,
        target_rate_unavailable_reason=None
        if target_available
        else "methodology_or_required_inputs_not_verified",
    )


@app.get(PREFIX + "/health/live")
def live():
    return {"status": "ok"}


@app.get(PREFIX + "/health/ready")
def ready(session: Session = Depends(get_session)):
    session.execute(text("SELECT 1"))
    versions = set(session.execute(text("SELECT version_num FROM alembic_version")).scalars())
    cfg = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    expected = set(ScriptDirectory.from_config(cfg).get_heads())
    if versions != expected or not expected:
        raise HTTPException(503, detail={"code": "migrations_required"})
    counts = dict(
        session.execute(
            select(WasteObservation.year, func.count())
            .where(WasteObservation.active)
            .group_by(WasteObservation.year)
        ).all()
    )
    return {
        "status": "ready",
        "database": "available",
        "migrations": "current",
        "data": {
            "status": "loaded"
            if set(counts) == {2021, 2022, 2023, 2024} and all(n == 556 for n in counts.values())
            else "empty"
            if not counts
            else "partial",
            "active_rows_by_year": counts,
        },
    }


@app.get(PREFIX + "/municipalities", response_model=MunicipalitiesPage)
def municipalities(
    q: str = Query("", max_length=200),
    county: str | None = Query(None, max_length=200),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    session: Session = Depends(get_session),
):
    filters = []
    if q.strip():
        token = normalize_name(q).replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        alias_match = exists(
            select(MunicipalityAlias.id).where(
                MunicipalityAlias.municipality_id == Municipality.id,
                func.lower(MunicipalityAlias.source_name).like("%" + token + "%", escape="\\"),
            )
        )
        filters.append(
            or_(Municipality.normalized_name.like("%" + token + "%", escape="\\"), alias_match)
        )
    if county:
        filters.append(Municipality.normalized_county == normalize_name(county))
    total = session.scalar(select(func.count()).select_from(Municipality).where(*filters))
    items = session.scalars(
        select(Municipality)
        .where(*filters)
        .order_by(Municipality.normalized_name, Municipality.normalized_county, Municipality.id)
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return MunicipalitiesPage(
        items=[MunicipalityOut.model_validate(m) for m in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@app.get(PREFIX + "/municipalities/{municipality_id}/years", response_model=YearsOut)
def years(municipality_id: UUID, session: Session = Depends(get_session)):
    municipality = municipality_or_404(session, municipality_id)
    observations = observations_for(session, municipality_id)
    result = []
    for idx, obs in enumerate(observations):
        source_issues = issues_for(session, obs.source_id)
        result.append(
            YearOut(
                year=obs.year,
                quality_status=obs.quality_status,
                population_usable=obs.population_usable,
                comparability=comparability(
                    obs, observations[idx - 1] if idx else None, source_issues
                ),
            )
        )
    return YearsOut(municipality=MunicipalityOut.model_validate(municipality), years=result)


@app.get(PREFIX + "/municipalities/{municipality_id}/observations", response_model=ProfileOut)
def observations(
    municipality_id: UUID,
    from_year: int = Query(2021, ge=1900, le=2100),
    to_year: int = Query(2024, ge=1900, le=2100),
    session: Session = Depends(get_session),
):
    if from_year > to_year:
        raise HTTPException(422, detail={"code": "invalid_year_range"})
    municipality = municipality_or_404(session, municipality_id)
    rows = observations_for(session, municipality_id)
    return ProfileOut(
        municipality=MunicipalityOut.model_validate(municipality),
        observations=[
            observation_out(session, obs, rows[idx - 1] if idx else None)
            for idx, obs in enumerate(rows)
            if from_year <= obs.year <= to_year
        ],
    )


@app.get(PREFIX + "/sources", response_model=SourcesPage)
def sources(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    session: Session = Depends(get_session),
):
    total = session.scalar(select(func.count()).select_from(SourceDataset))
    rows = session.scalars(
        select(SourceDataset)
        .order_by(SourceDataset.year, SourceDataset.id)
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return SourcesPage(
        items=[source_out(session, s) for s in rows], total=total, page=page, page_size=page_size
    )
