"""Deterministic peer discovery and descriptive comparisons; never causal recommendations."""

from decimal import Decimal, localcontext
from urllib.parse import urlencode
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Annotated, Literal
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.orm import Session
from backend.app.db import get_session
from backend.app.models import MaterialObservation, Municipality, SourceDataset, WasteObservation
from backend.app.observations import (
    municipality_or_404,
    observations_for,
    observation_out,
    source_out,
    metric,
)
from backend.app.schemas import (
    CompareMember,
    CompareMetric,
    ComparisonOut,
    DifferenceInsight,
    MaterialOut,
    MunicipalityOut,
    PeerOut,
    PeersOut,
)

router = APIRouter(prefix="/api/v1", tags=["Waste Compare"])
MATERIAL_LABELS = {
    "paper": "Papir",
    "plastic": "Plastika",
    "glass": "Staklo",
    "metal": "Metal",
    "bulky": "Glomazni otpad",
    "textile": "Tekstil",
    "bio": "Biootpad",
}
CORE = [
    (
        "calculated_nonmixed_share_pct",
        "Udio izvan miješanog toka · izračunato",
        "%",
        "pp",
        "historical_share",
    ),
    (
        "total_kg_per_covered_person",
        "Ukupno po obuhvaćenom stanovniku",
        "kg/covered_person",
        "kg/covered_person",
        "per_person",
    ),
    (
        "mixed_kg_per_covered_person",
        "Miješano po obuhvaćenom stanovniku",
        "kg/covered_person",
        "kg/covered_person",
        "per_person",
    ),
    ("separate_collection_pct", "Stopa odvojenog sakupljanja", "%", "pp", "rate"),
    ("total_t", "Ukupno sakupljeno", "t", "t", "mass"),
    ("mixed_t", "Miješani otpad", "t", "t", "mass"),
    (
        "published_kg_per_covered_person",
        "Ukupno po stanovniku · objavljeno",
        "kg/covered_person",
        "kg/covered_person",
        "published",
    ),
]
CATALOG = [
    CompareMetric(key=k, label=label, unit=u, difference_unit=d, family=f)
    for k, label, u, d, f in CORE
] + [
    CompareMetric(
        key="material_" + k,
        label=v + " · objavljeno",
        unit="kg/person",
        difference_unit="kg/person",
        family="materials",
    )
    for k, v in MATERIAL_LABELS.items()
]


def rank_population(base_population, candidates, limit=5):
    """Preferred [0.5,2] first, then nearest outside; input (id,population) pairs.
    Decimal ln, fixed precision and stable UUID tie break; no outcome variables.
    """
    result = []
    with localcontext() as ctx:
        ctx.prec = 32
        for mid, population in candidates:
            ratio = Decimal(population) / Decimal(base_population)
            distance = abs(Decimal(population).ln() - Decimal(base_population).ln()).quantize(
                Decimal("1e-24")
            )
            result.append(
                (not Decimal("0.5") <= ratio <= Decimal("2"), distance, str(mid), mid, ratio)
            )
    return sorted(result)[:limit]


@router.get("/municipalities/{municipality_id}/peers", response_model=PeersOut)
def peers(
    municipality_id: UUID,
    year: int = Query(..., ge=2017, le=2024),
    limit: int = Query(5, ge=1, le=5),
    county_scope: Literal["all", "same_county"] = "all",
    session: Session = Depends(get_session),
):
    base = municipality_or_404(session, municipality_id)
    obs = session.scalar(
        select(WasteObservation).where(
            WasteObservation.municipality_id == base.id,
            WasteObservation.year == year,
            WasteObservation.active,
        )
    )
    if obs is None:
        raise HTTPException(404, detail={"code": "observation_not_found"})
    common = dict(
        baseline=MunicipalityOut.model_validate(base),
        year=year,
        algorithm_version="covered-population-v2",
        county_scope=county_scope,
        expanded=False,
        eligible_candidates=0,
        exclusions={},
        items=[],
        warnings=[
            "comparability_provisional",
            "population_is_service_coverage_not_total_population",
        ],
    )
    if not obs.population_usable or not obs.covered_population or obs.covered_population <= 0:
        return PeersOut(
            **common, status="unavailable", reason="population_requires_review_or_missing"
        )
    if all(v is None for v in (obs.total_t, obs.mixed_t, obs.published_separate_collection_pct)):
        return PeersOut(**common, status="unavailable", reason="no_comparison_values")
    candidates = {}
    excluded = {}
    for m, o in session.execute(
        select(Municipality, WasteObservation)
        .join(WasteObservation)
        .where(WasteObservation.year == year, WasteObservation.active, Municipality.id != base.id)
    ):
        reason = None
        if county_scope == "same_county" and m.normalized_county != base.normalized_county:
            reason = "outside_county_filter"
        elif o.scope != obs.scope or o.methodology_group != obs.methodology_group:
            reason = "scope_or_methodology_mismatch"
        elif not o.population_usable or not o.covered_population or o.covered_population <= 0:
            reason = "population_requires_review_or_missing"
        elif all(v is None for v in (o.total_t, o.mixed_t, o.published_separate_collection_pct)):
            reason = "no_comparison_values"
        if reason:
            excluded[reason] = excluded.get(reason, 0) + 1
        else:
            candidates[m.id] = (m, o)
    ranked = rank_population(
        obs.covered_population,
        [(mid, o.covered_population) for mid, (m, o) in candidates.items()],
        limit,
    )
    items = [
        PeerOut(
            municipality=MunicipalityOut.model_validate(candidates[mid][0]),
            covered_population=candidates[mid][1].covered_population,
            population_ratio=ratio,
            log_distance=distance,
            within_preferred_range=not outside,
            quality_notes=["comparability_provisional"]
            + (["population_range_expanded"] if outside else []),
        )
        for outside, distance, _, mid, ratio in ranked
    ]
    common.update(
        items=items,
        expanded=any(not p.within_preferred_range for p in items),
        eligible_candidates=len(candidates),
        exclusions=excluded,
    )
    if common["expanded"]:
        common["warnings"].append("population_range_expanded")
    if len(items) < limit:
        common["warnings"].append("fewer_candidates_available")
    return PeersOut(**common, status="available" if items else "empty")


def materials_for(session, mid):
    result = {}
    rows = session.scalars(
        select(MaterialObservation)
        .where(MaterialObservation.municipality_id == mid, MaterialObservation.active)
        .order_by(MaterialObservation.year, MaterialObservation.material)
    ).all()
    main = {o.year: o for o in observations_for(session, mid)}
    sources = {
        sid: source_out(session, session.get(SourceDataset, sid))
        for sid in {r.source_id for r in rows}
    }
    for row in rows:
        o = main.get(row.year)
        main_source = session.get(SourceDataset, o.source_id) if o else None
        valid = (
            o is not None
            and o.population_usable
            and row.denominator_status == "verified_against_pdf"
            and row.evidence.get("covered_population") == o.covered_population
            and main_source.sha256 == sources[row.source_id].sha256
        )
        reason = (
            "population_requires_review_or_missing"
            if o is None or not o.population_usable
            else "material_denominator_not_verified"
        )
        value = metric(row.published_kg_per_person, "kg/person", "missing_published_value")
        result.setdefault(row.year, []).append(
            MaterialOut(
                material=row.material,
                label=MATERIAL_LABELS[row.material],
                published=value,
                comparable=metric(
                    row.published_kg_per_person if valid else None, "kg/person", reason
                ),
                source=sources[row.source_id],
                source_row=row.source_row,
                denominator_status=row.denominator_status,
                evidence=row.evidence,
            )
        )
    return result


def comparable_values(member, baseline, year):
    current = next((o for o in member.history if o.year == year), None)
    initial = next((o for o in baseline.history if o.year == year), None)
    values = {}
    for definition in CATALOG:
        if current is None or initial is None:
            values[definition.key] = metric(None, definition.unit, "missing_year")
            continue
        if (
            current.scope != initial.scope
            or current.comparability.methodology_group != initial.comparability.methodology_group
        ):
            values[definition.key] = metric(None, definition.unit, "scope_or_methodology_mismatch")
            continue
        if definition.family == "materials":
            own = next(
                (
                    m
                    for m in member.material_history.get(year, [])
                    if "material_" + m.material == definition.key
                ),
                None,
            )
            base = next(
                (
                    m
                    for m in baseline.material_history.get(year, [])
                    if "material_" + m.material == definition.key
                ),
                None,
            )
            if (
                own
                and base
                and (
                    own.source.scope != base.source.scope
                    or own.source.methodology_group != base.source.methodology_group
                )
            ):
                values[definition.key] = metric(
                    None, definition.unit, "scope_or_methodology_mismatch"
                )
            else:
                values[definition.key] = (
                    own.comparable
                    if own
                    else metric(None, definition.unit, "materials_not_imported")
                )
        else:
            values[definition.key] = current.metrics.get(
                definition.key, metric(None, definition.unit, "missing_value")
            )
    return values


def calculate_insights(members, catalog, year):
    candidates = []
    excluded = []
    for index, definition in enumerate(catalog):
        if definition.family in ("published", "historical_share"):
            continue  # Avoid double-counting the published/derived pair.
        values = [
            (m.metrics[definition.key].value, m)
            for m in members
            if m.metrics[definition.key].value is not None
            and m.metrics[definition.key].quality_status == "available"
        ]
        if len(values) < 2:
            excluded.append(definition.key)
            continue
        values.sort(key=lambda pair: (pair[0], str(pair[1].municipality.id)))
        low, lm = values[0]
        high, hm = values[-1]
        scale = max(abs(low), abs(high))
        if scale == 0 or high == low:
            continue
        spread = (high - low) / scale
        insight = DifferenceInsight(
            metric=definition.key,
            label=definition.label,
            year=year,
            unit=definition.unit,
            difference_unit=definition.difference_unit,
            low_municipality=lm.municipality,
            high_municipality=hm.municipality,
            low_value=low,
            high_value=high,
            difference=high - low,
            relative_range=spread,
            available_count=len(values),
        )
        # Prioritize size-normalized descriptions; masses remain a fallback and in all charts.
        priority = 1 if definition.family == "mass" else 0
        candidates.append((priority, -spread, index, definition.family, insight))
    chosen = []
    families = set()
    for _, _, _, family, insight in sorted(candidates, key=lambda item: item[:3]):
        if family not in families:
            chosen.append(insight)
            families.add(family)
        if len(chosen) == 3:
            break
    return chosen, excluded


@router.get("/comparisons", response_model=ComparisonOut)
def compare(
    ids: Annotated[list[UUID], Query(min_length=2, max_length=5)],
    year: int = Query(..., ge=2017, le=2024),
    baseline_id: UUID | None = None,
    session: Session = Depends(get_session),
):
    if len(set(ids)) != len(ids):
        raise HTTPException(422, detail={"code": "duplicate_municipalities"})
    baseline_id = baseline_id or ids[0]
    if baseline_id not in ids:
        raise HTTPException(422, detail={"code": "baseline_not_in_selection"})
    members = []
    for mid in ids:
        municipality = municipality_or_404(session, mid)
        history_rows = observations_for(session, mid)
        history = [
            observation_out(session, o, history_rows[i - 1] if i else None)
            for i, o in enumerate(history_rows)
        ]
        current = next((o for o in history if o.year == year), None)
        material_history = materials_for(session, mid)
        member = CompareMember(
            municipality=MunicipalityOut.model_validate(municipality),
            observation=current,
            history=history,
            metrics={},
            differences={},
            materials=material_history.get(year, []),
            material_history=material_history,
            history_metrics={},
            warnings=[],
            simulation_url=None,
            population_ratio=None,
        )
        for definition in CATALOG:
            if definition.key.startswith("material_"):
                entry = next(
                    (m for m in member.materials if "material_" + m.material == definition.key),
                    None,
                )
                value = (
                    entry.comparable
                    if entry
                    else metric(None, definition.unit, "materials_not_imported")
                )
            else:
                value = (
                    current.metrics.get(
                        definition.key, metric(None, definition.unit, "missing_value")
                    )
                    if current
                    else metric(None, definition.unit, "missing_year")
                )
            member.metrics[definition.key] = value
        if current is None:
            member.warnings.append("missing_year")
        else:
            member.warnings.extend(current.comparability.reasons)
            member.warnings.extend(i.code for i in current.issues)
        if member.materials:
            member.warnings.append("material_cross_year_unverified")
        members.append(member)
    baseline = next(m for m in members if m.municipality.id == baseline_id)
    years = sorted({o.year for m in members for o in m.history} | {year})
    for member in members:
        if (
            member.observation
            and baseline.observation
            and member.observation.population_usable
            and baseline.observation.population_usable
        ):
            own_p = member.observation.metrics["covered_population"].value
            base_p = baseline.observation.metrics["covered_population"].value
            if own_p is not None and base_p is not None and own_p > 0 and base_p > 0:
                member.population_ratio = own_p / base_p
                if not Decimal("0.5") <= member.population_ratio <= Decimal("2"):
                    member.warnings.append("population_outside_preferred_range")
        member.history_metrics = {y: comparable_values(member, baseline, y) for y in years}
        member.metrics = member.history_metrics[year]
    for member in members:
        same = bool(
            baseline.observation
            and member.observation
            and baseline.observation.scope == member.observation.scope
            and baseline.observation.comparability.methodology_group
            == member.observation.comparability.methodology_group
        )
        if not same:
            member.warnings.append(
                "scope_or_methodology_mismatch"
                if member.observation and baseline.observation
                else "missing_year"
            )
        for definition in CATALOG:
            value, base = member.metrics[definition.key], baseline.metrics[definition.key]
            reason = "missing_value"
            if not same:
                reason = (
                    "scope_or_methodology_mismatch"
                    if member.observation and baseline.observation
                    else "missing_year"
                )
            elif value.value is None or base.value is None:
                reason = value.reason or base.reason or "missing_value"
            elif value.quality_status != "available" or base.quality_status != "available":
                reason = "quality_requires_review"
            else:
                member.differences[definition.key] = metric(
                    value.value - base.value, definition.difference_unit
                )
                continue
            member.differences[definition.key] = metric(None, definition.difference_unit, reason)
        target = member.metrics["separate_collection_pct"]
        initial = baseline.metrics["separate_collection_pct"]
        if (
            member.municipality.id != baseline_id
            and same
            and target.value is not None
            and initial.value is not None
            and target.quality_status == initial.quality_status == "available"
        ):
            member.simulation_url = "/simulator?" + urlencode(
                {
                    "jls": str(baseline_id),
                    "godina": year,
                    "referenca": str(member.municipality.id),
                    "usporedi": ",".join(str(mid) for mid in ids if mid != baseline_id),
                    "pokazatelj": "separate_collection_pct",
                    "zapis": str(member.observation.id),
                    "izvor": str(member.observation.source.id),
                    "sha256": member.observation.source.sha256,
                    "pocetni_zapis": str(baseline.observation.id),
                    "pocetni_sha256": baseline.observation.source.sha256,
                    "cilj": str(target.value),
                }
            )
    insights, excluded = calculate_insights(members, CATALOG, year)
    return ComparisonOut(
        baseline_id=baseline_id,
        year=year,
        metrics=CATALOG,
        members=members,
        insights=insights,
        insight_method="normalized-first-relative-range-v2: per-person/rate/materials before mass; (max-min)/max(abs(min),abs(max)); max one per metric family; top 3; descriptive only",
        insight_exclusions=excluded,
        warnings=[
            "comparability_provisional",
            "descriptive_not_causal",
            "separate_collection_is_not_recycling",
            "material_cross_year_unverified",
        ],
    )
