from uuid import UUID
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from backend.app.models import (
    ImportRun,
    Municipality,
    QualityIssue,
    SourceDataset,
    WasteObservation,
)
from backend.app.schemas import Comparability, IssueOut, Metric, ObservationOut, SourceOut


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
    historical = obs.scope.startswith("historical_")
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
            "historical_rate_not_published" if historical else "missing_published_rate",
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
    if historical:
        values["calculated_nonmixed_share_pct"] = Metric(
            value=100 * (t - m) / t if t is not None and t > 0 and m is not None else None,
            unit="%",
            quality_status="review_required",
            reason="historical_ratio_not_official_rate",
        )
    # Verified mass balance is separate from cross-year comparability.
    from backend.app.simulation_quality import eligibility

    target_available = not eligibility(obs, source)
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
