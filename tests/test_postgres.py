from copy import deepcopy
from decimal import Decimal
import uuid
import pytest
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session
from backend.app.models import ImportRun, Municipality, QualityIssue, WasteObservation
from pipeline.import_data import import_source


def test_idempotent_full_import_and_audit(seeded_engine, extracted_sources):
    for entry, rows in extracted_sources:
        assert import_source(seeded_engine, entry, rows)["status"] == "skipped"
    with Session(seeded_engine) as session:
        assert session.scalar(select(func.count()).select_from(Municipality)) == 556
        assert session.scalar(select(func.count()).select_from(WasteObservation)) == 2224
        assert session.scalar(select(func.count()).select_from(ImportRun)) == 4
        assert (
            session.scalar(
                select(func.count())
                .select_from(QualityIssue)
                .where(QualityIssue.code == "kg_per_capita_mismatch")
            )
            == 11
        )
        assert (
            session.scalar(
                select(func.count())
                .select_from(QualityIssue)
                .where(QualityIssue.code == "source_aggregate_mismatch")
            )
            == 2
        )
        assert (
            session.scalar(
                select(func.count())
                .select_from(WasteObservation)
                .where(~WasteObservation.population_usable)
            )
            == 11
        )


def test_revision_activation_is_atomic_and_keeps_history(pg_engine, extracted_sources):
    entry, rows = extracted_sources[0]
    import_source(pg_engine, entry, rows)
    revision = {**entry, "sha256": "a" * 64}
    with pytest.raises(ValueError, match="aktivna druga revizija"):
        import_source(pg_engine, revision, rows)
    with Session(pg_engine) as session:
        assert (
            session.scalar(
                select(func.count()).select_from(WasteObservation).where(WasteObservation.active)
            )
            == 556
        )
        assert (
            session.scalar(
                select(func.count()).select_from(ImportRun).where(ImportRun.status == "failed")
            )
            == 1
        )
    with pytest.raises(ValueError, match="mijenja skup JLS"):
        import_source(pg_engine, revision, rows[:-1], activate_revision=True)
    assert import_source(pg_engine, revision, rows, activate_revision=True)["status"] == "completed"
    with Session(pg_engine) as session:
        assert session.scalar(select(func.count()).select_from(WasteObservation)) == 1112
        assert (
            session.scalar(
                select(func.count()).select_from(WasteObservation).where(WasteObservation.active)
            )
            == 556
        )
    assert import_source(pg_engine, revision, rows)["status"] == "skipped"


def test_database_failure_rolls_back_rows_and_preserves_failed_run(pg_engine, extracted_sources):
    entry, original = extracted_sources[0]
    rows = deepcopy(original[:2])
    rows[1].mixed_t = rows[1].total_t + 1
    with pytest.raises(ValueError, match="Uvoz nije uspio"):
        import_source(pg_engine, entry, rows)
    with Session(pg_engine) as session:
        assert session.scalar(select(func.count()).select_from(WasteObservation)) == 0
        assert session.scalar(select(func.count()).select_from(Municipality)) == 0
        assert session.scalar(select(ImportRun.status)) == "failed"
    assert import_source(pg_engine, entry, original)["status"] == "completed"


def test_rejected_row_retains_raw_values_in_quarantine(pg_engine, extracted_sources):
    from pipeline.extract import Issue

    entry, original = extracted_sources[0]
    rows = deepcopy(original[:2])
    rows[1].issues.append(Issue("synthetic_error", "error", "Synthetic test fixture."))
    report = import_source(pg_engine, entry, rows)
    assert report["accepted_rows"] == 1 and report["rejected_rows"] == 1
    with Session(pg_engine) as session:
        issue = session.scalar(select(QualityIssue).where(QualityIssue.code == "synthetic_error"))
        assert issue.observation_id is None
        assert issue.details["raw_values"] == rows[1].raw_values


def test_profile_and_quality_contract(client):
    response = client.get("/api/v1/municipalities", params={"q": "Bjelovar"})
    assert response.status_code == 200
    page = response.json()
    assert page["total"] == 1
    mid = page["items"][0]["id"]
    years = client.get(f"/api/v1/municipalities/{mid}/years").json()["years"]
    assert [r["year"] for r in years] == [2021, 2022, 2023, 2024]
    profile = client.get(f"/api/v1/municipalities/{mid}/observations").json()
    obs = profile["observations"]
    assert len(obs) == 4
    assert Decimal(obs[1]["metrics"]["separate_collection_pct"]["value"]) == 16
    # The original Excel XML contains 9773.8700000000008; compare the
    # published 0.01 t precision while retaining the exact lexeme below.
    assert Decimal(obs[3]["metrics"]["total_t"]["value"]).quantize(Decimal("0.01")) == Decimal(
        "9773.87"
    )
    assert obs[3]["raw_values"]["C"]["value"] == "9773.8700000000008"
    assert obs[1]["raw_values"]["G"]["value"] == "0.16"
    assert obs[2]["source"]["sha256"]
    assert obs[2]["source"]["issues"][0]["code"] == "source_aggregate_mismatch"
    assert all(not r["target_rate_available"] for r in obs)
    seget = client.get("/api/v1/municipalities", params={"q": "Seget"}).json()["items"][0]["id"]
    suspect = client.get(
        f"/api/v1/municipalities/{seget}/observations", params={"from_year": 2024}
    ).json()["observations"][0]
    assert suspect["metrics"]["total_kg_per_covered_person"]["value"] is None
    assert (
        suspect["metrics"]["total_kg_per_covered_person"]["reason"] == "population_requires_review"
    )
    assert (
        suspect["metrics"]["published_kg_per_covered_person"]["quality_status"] == "review_required"
    )
    assert Decimal(suspect["metrics"]["total_t"]["value"]) == Decimal("1698.02")
    assert client.get("/api/v1/health/ready").json()["data"]["status"] == "loaded"


def test_search_alias_pagination_filters_errors_and_sources(client):
    assert client.get("/api/v1/municipalities", params={"q": "Grad Zagreb"}).json()["total"] == 1
    assert client.get("/api/v1/municipalities", params={"q": "Sveta Nedelja"}).json()["total"] == 2
    assert (
        client.get(
            "/api/v1/municipalities", params={"q": "Sveta Nedelja", "county": "Istarska"}
        ).json()["total"]
        == 1
    )
    assert client.get("/api/v1/municipalities", params={"q": "%' OR 1=1 --"}).json()["total"] == 0
    assert client.get("/api/v1/municipalities", params={"q": "%"}).json()["total"] == 0
    first = client.get("/api/v1/municipalities", params={"page_size": 3}).json()
    second = client.get("/api/v1/municipalities", params={"page_size": 3, "page": 2}).json()
    assert not {m["id"] for m in first["items"]} & {m["id"] for m in second["items"]}
    assert client.get("/api/v1/municipalities", params={"page_size": 101}).status_code == 422
    assert client.get(f"/api/v1/municipalities/{uuid.uuid4()}/years").status_code == 404
    mid = first["items"][0]["id"]
    assert (
        client.get(
            f"/api/v1/municipalities/{mid}/observations",
            params={"from_year": 2024, "to_year": 2021},
        ).status_code
        == 422
    )
    assert (
        client.get(
            f"/api/v1/municipalities/{mid}/observations",
            params={"from_year": 2025, "to_year": 2026},
        ).json()["observations"]
        == []
    )
    sources = client.get("/api/v1/sources").json()
    assert sources["total"] == 4
    assert all(s["license"] is None and not s["methodology_verified"] for s in sources["items"])
    assert client.get("/openapi.json").status_code == 200
    allowed = client.get("/api/v1/health/live", headers={"Origin": "http://localhost:5173"})
    assert allowed.headers["access-control-allow-origin"] == "http://localhost:5173"
    blocked = client.get("/api/v1/health/live", headers={"Origin": "https://example.invalid"})
    assert "access-control-allow-origin" not in blocked.headers


def test_health_without_loaded_data_and_pending_migration(pg_engine):
    from backend.app.main import app
    from backend.app.db import get_session
    from fastapi.testclient import TestClient

    def sessions():
        with Session(pg_engine) as session:
            yield session

    app.dependency_overrides[get_session] = sessions
    try:
        client = TestClient(app)
        assert client.get("/api/v1/health/live").status_code == 200
        assert client.get("/api/v1/health/ready").json()["data"]["status"] == "empty"
        with pg_engine.begin() as connection:
            connection.execute(text("UPDATE alembic_version SET version_num='pending'"))
        assert client.get("/api/v1/health/ready").status_code == 503
    finally:
        app.dependency_overrides.clear()
