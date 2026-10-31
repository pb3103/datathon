from decimal import Decimal as D
import pytest
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from fastapi.testclient import TestClient
from pipeline.historical import load_historical, MAPS, VERSION
from pipeline.import_data import import_source
from backend.app.config import get_settings
from backend.app.models import Municipality, WasteObservation, SourceDataset


@pytest.fixture(scope="session")
def historical_sources():
    return load_historical(get_settings().data_dir)


@pytest.fixture
def historical_client(seeded_engine, historical_sources):
    from backend.app.main import app
    from backend.app.db import get_session

    for entry, rows in historical_sources:
        assert (
            import_source(
                seeded_engine, entry, rows, config=MAPS[str(entry["year"])], parser_version=VERSION
            )["status"]
            == "completed"
        )

    def sessions():
        with Session(seeded_engine) as session:
            yield session

    app.dependency_overrides[get_session] = sessions
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()


def test_pdf_verified_rows_identity_and_corrections(historical_sources, extracted_sources):
    base = {r.municipality_id for r in extracted_sources[0][1]}
    for entry, rows in historical_sources:
        assert len(rows) == 556 and {r.municipality_id for r in rows} == base
        assert not any(r.rejected or not r.population_usable for r in rows)
        assert all(r.published_separate_collection_pct is None for r in rows)
        assert (
            sum(any(i.code == "pdf_verified_correction" for i in r.issues) for r in rows)
            == {2017: 27, 2018: 21, 2019: 25, 2020: 0}[entry["year"]]
        )
    jan = next(r for r in historical_sources[0][1] if r.name == "JANJINA")
    assert jan.published_kg_per_capita == 1361 and jan.raw_values["F"]["value"] == "1"
    svete = [r for r in historical_sources[0][1] if r.name.casefold() == "sveta nedelja"]
    assert len(svete) == 2 and {r.county for r in svete} == {"Zagrebačka", "Istarska"}
    assert len({r.municipality_id for r in svete}) == 2


def test_all_eight_year_api_contract_and_same_year_comparison(historical_client):
    c = historical_client
    ids = {
        name: next(
            m["id"]
            for m in c.get("/api/v1/municipalities", params={"q": name}).json()["items"]
            if m["name"] == name
        )
        for name in ["Bjelovar", "Samobor"]
    }
    profiles = {
        name: c.get(f"/api/v1/municipalities/{mid}/observations").json()
        for name, mid in ids.items()
    }
    assert [o["year"] for o in profiles["Bjelovar"]["observations"]] == list(range(2017, 2025))
    for year in range(2017, 2025):
        params = [("ids", mid) for mid in ids.values()] + [
            ("year", year),
            ("baseline_id", ids["Bjelovar"]),
        ]
        response = c.get("/api/v1/comparisons", params=params)
        assert response.status_code == 200, response.text
        data = response.json()
        for m in data["members"]:
            o = next(
                o for o in profiles[m["municipality"]["name"]]["observations"] if o["year"] == year
            )
            for key in [
                "total_t",
                "mixed_t",
                "total_kg_per_covered_person",
                "mixed_kg_per_covered_person",
                "separate_collection_pct",
            ]:
                assert m["metrics"][key]["value"] == o["metrics"][key]["value"]
            assert o["comparability"]["status"] == "provisional"
            assert o["target_rate_available"] == (year >= 2023)
            if year < 2021:
                assert m["metrics"]["separate_collection_pct"]["value"] is None
                assert m["simulation_url"] is None
                assert m["history_metrics"][str(year)]["material_paper"]["value"] is None
                assert (
                    o["metrics"]["calculated_nonmixed_share_pct"]["quality_status"]
                    == "review_required"
                )
        for insight in data["insights"]:
            low, high = map(D, [insight["low_value"], insight["high_value"]])
            assert D(insight["difference"]) == high - low
            assert abs(D(insight["relative_range"]) - (high - low) / max(abs(low), abs(high))) < D(
                "1e-20"
            )
        if year < 2021:
            assert all(i["metric"] != "separate_collection_pct" for i in data["insights"])
        peer = c.get(
            f"/api/v1/municipalities/{ids['Bjelovar']}/peers", params={"year": year}
        ).json()
        assert peer["algorithm_version"] == "covered-population-v2"
        assert len(peer["items"]) == 5 and all(
            p["municipality"]["id"] != ids["Bjelovar"] for p in peer["items"]
        )
    ctx = c.get(f"/api/v1/municipalities/{ids['Bjelovar']}/simulation-context?year=2017").json()
    assert not ctx["available"]
    ready = c.get("/api/v1/health/ready").json()["data"]
    assert ready["historical_status"] == "loaded" and len(ready["active_rows_by_year"]) == 8


def test_historical_idempotency_keeps_existing_records(
    historical_client, seeded_engine, historical_sources
):
    with Session(seeded_engine) as s:
        before = [
            (o.id, o.total_t, o.mixed_t, o.published_separate_collection_pct)
            for o in s.scalars(
                select(WasteObservation)
                .where(WasteObservation.year >= 2021)
                .order_by(WasteObservation.id)
            )
        ]
    for entry, rows in historical_sources:
        assert (
            import_source(
                seeded_engine, entry, rows, config=MAPS[str(entry["year"])], parser_version=VERSION
            )["status"]
            == "skipped"
        )
    with Session(seeded_engine) as s:
        assert s.scalar(select(func.count()).select_from(Municipality)) == 556
        assert s.scalar(select(func.count()).select_from(WasteObservation)) == 4448
        assert s.scalar(select(func.count()).select_from(SourceDataset)) == 8
        after = [
            (o.id, o.total_t, o.mixed_t, o.published_separate_collection_pct)
            for o in s.scalars(
                select(WasteObservation)
                .where(WasteObservation.year >= 2021)
                .order_by(WasteObservation.id)
            )
        ]
        assert before == after


def test_history_rejects_changed_source(tmp_path):
    import shutil

    root = get_settings().data_dir
    for year in range(2017, 2021):
        shutil.copytree(root / str(year), tmp_path / str(year))
    path = next((tmp_path / "2017").glob("*.csv"))
    path.write_bytes(path.read_bytes() + b"\n")
    with pytest.raises(ValueError, match="promijenjen"):
        load_historical(tmp_path)
