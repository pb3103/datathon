from copy import deepcopy
from decimal import Decimal
import uuid
import pytest
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from backend.app.comparison import rank_population
from backend.app.models import MaterialObservation, WasteObservation
from pipeline.materials import load_material_sources, import_material_source, extract_materials
from backend.app.config import get_settings


@pytest.fixture(scope="session")
def material_sources():
    return load_material_sources(get_settings().data_dir)


@pytest.fixture
def material_client(client, seeded_engine, material_sources):
    for entry, config, proof, rows in material_sources:
        import_material_source(seeded_engine, entry, config, proof, rows)
    return client


def mid(client, name, county=None):
    params = {"q": name}
    if county:
        params["county"] = county
    items = client.get("/api/v1/municipalities", params=params).json()["items"]
    return next(m["id"] for m in items if m["name"] == name)


def comparison(client, ids, year=2024, **kwargs):
    return client.get(
        "/api/v1/comparisons",
        params=[("ids", i) for i in ids] + [("year", year)] + list(kwargs.items()),
    )


def test_population_ranking_preferred_bounds_ties_and_expansion():
    ids = [uuid.UUID(int=i) for i in range(1, 7)]
    candidates = list(zip(ids, [100, 50, 200, 49, 201, 1000]))
    ranked = rank_population(100, candidates)
    assert [r[3] for r in ranked[:3]] == ids[:3]
    assert all(not r[0] for r in ranked[:3])
    assert all(r[0] for r in ranked[3:])
    assert ranked == rank_population(100, list(reversed(candidates)))
    assert len(rank_population(100, [])) == 0
    assert [r[3] for r in rank_population(100, [(ids[1], 100), (ids[0], 100)])] == ids[:2]


def test_actual_material_extraction_preserves_units_and_all_categories(material_sources):
    assert [len(rows) for _, _, _, rows in material_sources] == [556] * 4
    assert sum(len(r["values"]) for _, _, _, rows in material_sources for r in rows) == 15568
    assert not any(r["issues"] for _, _, _, rows in material_sources for r in rows)
    assert all(
        set(row["values"]) == {"paper", "plastic", "glass", "metal", "bulky", "textile", "bio"}
        for _, _, _, rows in material_sources
        for row in rows
    )
    entry, config, proof, rows = material_sources[-1]
    bjelovar = next(r for r in rows if r["raw_values"]["B"]["value"] == "Bjelovar")
    assert abs(bjelovar["values"]["paper"] - Decimal("27.856144079646516")) < Decimal("1e-12")
    assert (
        proof["records"][str(bjelovar["municipality_id"])]["categories"]["paper"]["pdf_t"]
        == "996.08"
    )
    assert proof["cross_year_verified"] is False
    assert proof["scope"] != material_sources[0][2]["scope"]
    assert sum(proof["counts"].values()) == 3892


def test_material_import_idempotent_and_original_published_values(
    material_client, seeded_engine, material_sources
):
    for entry, config, proof, rows in material_sources:
        assert (
            import_material_source(seeded_engine, entry, config, proof, rows)["status"] == "skipped"
        )
    with Session(seeded_engine) as session:
        assert session.scalar(select(func.count()).select_from(MaterialObservation)) == 15568
        assert (
            session.scalar(
                select(func.count())
                .select_from(MaterialObservation)
                .where(MaterialObservation.denominator_status == "zero_only_denominator_unverified")
            )
            == 819
        )
    ids = [mid(material_client, "Bjelovar"), mid(material_client, "Daruvar")]
    result = comparison(material_client, ids).json()
    assert len(result["members"][0]["materials"]) == 7
    paper = next(m for m in result["members"][0]["materials"] if m["material"] == "paper")
    assert paper["published"]["unit"] == "kg/person"
    assert paper["comparable"]["value"] is not None
    assert paper["cross_year_verified"] is False
    assert paper["source"]["sheet"] == "Prilog 2._KO_2024."
    assert paper["evidence"]["pdf_page"] == 100


def test_peers_population_only_county_filter_and_quality(client, seeded_engine):
    base = mid(client, "Bjelovar")
    a = client.get(f"/api/v1/municipalities/{base}/peers", params={"year": 2024}).json()
    assert len(a["items"]) == 5 and all(p["municipality"]["id"] != base for p in a["items"])
    assert all(Decimal(".5") <= Decimal(p["population_ratio"]) <= 2 for p in a["items"])
    county = client.get(
        f"/api/v1/municipalities/{base}/peers", params={"year": 2024, "county_scope": "same_county"}
    ).json()
    assert all(p["municipality"]["county"] == "Bjelovarsko-bilogorska" for p in county["items"])
    assert county["expanded"]
    assert "population_range_expanded" in county["warnings"]
    assert a == client.get(f"/api/v1/municipalities/{base}/peers", params={"year": 2024}).json()
    # Outcome changes never influence population-based peer discovery.
    with seeded_engine.begin() as conn:
        conn.execute(
            WasteObservation.__table__.update()
            .where(WasteObservation.year == 2024)
            .values(published_separate_collection_pct=0)
        )
    assert a == client.get(f"/api/v1/municipalities/{base}/peers", params={"year": 2024}).json()
    seget = mid(client, "Seget")
    unavailable = client.get(f"/api/v1/municipalities/{seget}/peers", params={"year": 2024}).json()
    assert unavailable["status"] == "unavailable" and unavailable["items"] == []
    assert (
        client.get(
            f"/api/v1/municipalities/{base}/peers", params={"year": 2024, "limit": 6}
        ).status_code
        == 422
    )


def test_comparison_differences_insights_and_handoff(material_client):
    ids = [mid(material_client, n) for n in ["Bjelovar", "Daruvar", "Čazma"]]
    response = comparison(material_client, ids)
    assert response.status_code == 200, response.text
    data = response.json()
    base = data["members"][0]
    other = data["members"][1]
    for key in [
        "total_t",
        "mixed_t",
        "total_kg_per_covered_person",
        "mixed_kg_per_covered_person",
        "separate_collection_pct",
        "material_paper",
    ]:
        assert Decimal(other["differences"][key]["value"]) == Decimal(
            other["metrics"][key]["value"]
        ) - Decimal(base["metrics"][key]["value"])
    assert other["differences"]["separate_collection_pct"]["unit"] == "pp"
    assert data["insights"] and len(data["insights"]) <= 3
    for insight in data["insights"]:
        assert insight["year"] == 2024
        assert Decimal(insight["difference"]) == Decimal(insight["high_value"]) - Decimal(
            insight["low_value"]
        )
    assert data == comparison(material_client, ids).json()
    assert "source_aggregate_mismatch" in base["warnings"]
    assert other["simulation_url"].startswith("/simulator?")
    assert "pokazatelj=separate_collection_pct" in other["simulation_url"]
    assert "sha256=" in other["simulation_url"]
    assert base["simulation_url"] is None
    assert all(m["cross_year_verified"] is False for m in base["materials"])


def test_quality_missing_year_and_scope_do_not_become_zero(material_client, seeded_engine):
    ids = [mid(material_client, "Seget"), mid(material_client, "Bjelovar")]
    data = comparison(material_client, ids).json()
    base = data["members"][0]
    assert base["metrics"]["total_kg_per_covered_person"]["value"] is None
    assert base["metrics"]["published_kg_per_covered_person"]["value"] is not None
    assert base["differences"]["published_kg_per_covered_person"]["value"] is None
    assert all(m["comparable"]["value"] is None for m in base["materials"])
    with seeded_engine.begin() as conn:
        conn.execute(
            WasteObservation.__table__.update()
            .where(
                WasteObservation.municipality_id == uuid.UUID(ids[1]), WasteObservation.year == 2024
            )
            .values(methodology_group="incompatible")
        )
    data = comparison(material_client, ids).json()
    assert all(m["value"] is None for m in data["members"][1]["metrics"].values())
    assert data["insights"] == []
    assert all(m["value"] is None for m in data["members"][1]["history_metrics"]["2024"].values())
    with seeded_engine.begin() as conn:
        conn.execute(
            WasteObservation.__table__.update()
            .where(
                WasteObservation.municipality_id == uuid.UUID(ids[0]), WasteObservation.year == 2024
            )
            .values(active=False)
        )
    data = comparison(material_client, ids).json()
    assert data["members"][0]["observation"] is None
    assert all(m["value"] is None for m in data["members"][0]["differences"].values())


def test_compare_selection_validation(client):
    ids = [mid(client, "Bjelovar"), mid(client, "Daruvar")]
    assert comparison(client, ids[:1]).status_code == 422
    assert comparison(client, ids * 3).status_code == 422
    assert comparison(client, [ids[0], ids[0]]).status_code == 422
    assert comparison(client, ids, baseline_id=str(uuid.uuid4())).status_code == 422
    assert comparison(client, [ids[0], str(uuid.uuid4())]).status_code == 404
    assert comparison(client, ids, year=2030).status_code == 422


def test_material_parser_missing_zero_duplicates_and_unit_drift(tmp_path, material_sources):
    from openpyxl import Workbook

    config = material_sources[0][1]
    book = Workbook()
    sheet = book.active
    sheet.title = config["sheet"]
    sheet.append(list(config["headers"].values()))
    sheet.append(["Zagrebačka", "Synthetic", None, 0, 0, 0, 0, 0, 0])
    path = tmp_path / "synthetic-materials.xlsx"
    book.save(path)
    rows = extract_materials(path, 2021, config)
    assert rows[0]["values"]["paper"] is None and rows[0]["values"]["plastic"] == 0
    assert rows[0]["issues"] == []
    sheet.append(["Zagrebačka", "Synthetic", 1, 0, 0, 0, 0, 0, 0])
    book.save(path)
    assert all(r["issues"] for r in extract_materials(path, 2021, config))
    sheet["C1"] = "Papir (t)"
    book.save(path)
    with pytest.raises(ValueError, match="jedinica promijenjeni"):
        extract_materials(path, 2021, config)


def test_material_failed_import_rolls_back_and_retry_preserves_audit(
    seeded_engine, material_sources
):
    from backend.app.models import ImportRun

    entry, config, proof, original = material_sources[0]
    bad = deepcopy(original[:2])
    bad[1]["values"]["paper"] = Decimal("-1")
    with pytest.raises(ValueError, match="Materijalni uvoz nije uspio"):
        import_material_source(seeded_engine, entry, config, proof, bad)
    with Session(seeded_engine) as session:
        assert session.scalar(select(func.count()).select_from(MaterialObservation)) == 0
        assert (
            session.scalar(
                select(func.count()).select_from(ImportRun).where(ImportRun.status == "failed")
            )
            == 1
        )
    assert (
        import_material_source(seeded_engine, entry, config, proof, original)["status"]
        == "completed"
    )
    replacement = {**entry, "sha256": "b" * 64}
    with pytest.raises(ValueError, match="Nepotpuna revizija"):
        import_material_source(
            seeded_engine, replacement, config, proof, original[:-1], activate_revision=True
        )
    with Session(seeded_engine) as session:
        assert (
            session.scalar(
                select(func.count())
                .select_from(MaterialObservation)
                .where(MaterialObservation.active)
            )
            == 3892
        )
