from decimal import Decimal as D
from types import SimpleNamespace
import hashlib
import pytest
from sqlalchemy.orm import Session
from backend.app.models import WasteObservation
from backend.app.simulation_math import simulate
from backend.app.simulations import eligibility


def test_models_and_targets():
    for model, kind, value, t, m, s, rate in [
        ("diversion", "fraction", "0.1", "1000", "630", "370", "37"),
        ("prevention", "fraction", "0.1", "930", "630", "300", None),
        ("diversion", "target", "50", "1000", "500", "500", "50"),
        ("prevention", "target", "50", "600", "300", "300", "50"),
    ]:
        result = simulate(D(1000), D(700), model, kind, D(value), 1000)
        state = result["result"]
        assert (state["total_t"], state["mixed_t"], state["separate_t"]) == (D(t), D(m), D(s))
        assert state["mixed_kg_per_person"] == D(m)
        assert state["total_t"] == state["mixed_t"] + state["separate_t"]
        if rate:
            assert state["rate_pct"] == D(rate)
    assert simulate(D(1000), D(700), "prevention", "target", D(20))["already_reached"]


def test_edges_invariants_and_monotonicity():
    for model in ("diversion", "prevention"):
        previous = D(700)
        for fraction in (D(0), D(".05"), D(".1"), D(".5"), D(1)):
            result = simulate(D(1000), D(700), model, "fraction", fraction)
            r = result["result"]
            assert 0 <= r["mixed_t"] <= previous
            assert r["total_kg_per_person"] is None
            assert (
                (r["total_t"] == D(1000)) if model == "diversion" else (r["separate_t"] == D(300))
            )
            previous = r["mixed_t"]
        assert simulate(D(1000), D(700), model, "target", D(100))["result"]["mixed_t"] == 0
    assert simulate(D(100), D(100), "prevention", "fraction", D(1))["result"]["rate_pct"] is None
    assert simulate(D(100), D(0), "diversion", "fraction", D(1))["change_t"] == 0
    for args in [
        (D(0), D(0), "diversion", "fraction", D(0)),
        (D(100), D(101), "diversion", "fraction", D(0)),
        (D(100), D(100), "prevention", "target", D(20)),
        (D(100), D(70), "diversion", "fraction", D("1.1")),
        (D(100), D(70), "diversion", "tonnes", D(71)),
        (D(100), D(70), "prevention", "target", D("NaN")),
    ]:
        with pytest.raises(ValueError):
            simulate(*args)


def test_real_rows_rounding_and_original_hashes(extracted_sources):
    counts = {}
    from pipeline.extract import ROOT
    import json

    manifest = json.loads((ROOT / "data/manifests/source_files.json").read_text())
    for entry in manifest:
        assert hashlib.sha256((ROOT / entry["path"]).read_bytes()).hexdigest() == entry["sha256"]
    for entry, rows in extracted_sources:
        if entry["year"] not in (2023, 2024):
            continue
        source = SimpleNamespace(scope="public_service", sha256=entry["sha256"])
        count = 0
        for row in rows:
            obs = SimpleNamespace(
                year=entry["year"],
                scope="public_service",
                total_t=row.total_t,
                mixed_t=row.mixed_t,
                published_separate_collection_pct=row.published_separate_collection_pct,
            )
            assert eligibility(obs, source) == []
            count += 1
        counts[entry["year"]] = count
    assert counts == {2023: 556, 2024: 556}


def payload(client, name="Bjelovar", year=2024):
    mid = next(
        m["id"]
        for m in client.get("/api/v1/municipalities", params={"q": name}).json()["items"]
        if m["name"] == name
    )
    ctx = client.get(
        f"/api/v1/municipalities/{mid}/simulation-context", params={"year": year}
    ).json()
    o = ctx["observation"]
    return {
        "municipality_id": mid,
        "year": year,
        "observation_id": o["id"],
        "sha256": o["source"]["sha256"],
        "scenarios": [{"name": "Test", "model": "diversion", "kind": "target", "value": "50"}],
    }, ctx


def test_api_real_models_quality_and_versions(client, seeded_engine):
    request, ctx = payload(client)
    assert ctx["available"] and ctx["observation"]["target_rate_available"]
    assert ctx["observation"]["comparability"]["status"] == "provisional"
    request["scenarios"].append(
        {"name": "Prevencija", "model": "prevention", "kind": "target", "value": "50"}
    )
    response = client.post("/api/v1/simulations", json=request)
    assert response.status_code == 200, response.text
    body = response.json()
    for result in body["scenarios"]:
        assert D(result["result"]["rate_pct"]) == D(50)
        assert D(result["initial"]["total_t"]) == D(
            ctx["observation"]["metrics"]["total_t"]["value"]
        )
    assert body == client.post("/api/v1/simulations", json=request).json()
    bad = {**request, "sha256": "0" * 64}
    assert client.post("/api/v1/simulations", json=bad).status_code == 409
    old, _ = payload(client, year=2022)
    assert client.post("/api/v1/simulations", json=old).status_code == 422
    seget, _ = payload(client, name="Seget")
    response = client.post("/api/v1/simulations", json=seget)
    assert response.status_code == 200
    assert response.json()["scenarios"][0]["result"]["total_kg_per_person"] is None
    with Session(seeded_engine) as session, session.begin():
        obs = session.get(WasteObservation, request["observation_id"])
        obs.published_separate_collection_pct = D(99)
    unavailable = client.get(
        f"/api/v1/municipalities/{request['municipality_id']}/simulation-context?year=2024"
    ).json()
    assert not unavailable["available"]
    assert not unavailable["observation"]["target_rate_available"]
    assert client.post("/api/v1/simulations", json=request).status_code == 422


def test_reference_revalidation_and_input_validation(client):
    request, _ = payload(client)
    peer, ctx = payload(client, name="Daruvar")
    reference = {
        "municipality_id": peer["municipality_id"],
        "observation_id": peer["observation_id"],
        "source_id": ctx["observation"]["source"]["id"],
        "sha256": peer["sha256"],
        "metric": "separate_collection_pct",
        "target": ctx["observation"]["metrics"]["separate_collection_pct"]["value"],
    }
    request["scenarios"][0].update(reference=reference, value=reference["target"])
    response = client.post("/api/v1/simulations", json=request)
    assert response.status_code == 200, response.text
    assert response.json()["scenarios"][0]["reference"]["municipality"]["name"] == "Daruvar"
    request["scenarios"][0]["value"] = "99"
    assert client.post("/api/v1/simulations", json=request).status_code == 422
    request["scenarios"][0]["reference"]["sha256"] = "0" * 64
    assert client.post("/api/v1/simulations", json=request).status_code == 409
    request["scenarios"] = [
        {"name": "Bad", "model": "diversion", "kind": "fraction", "value": "NaN"}
    ]
    assert client.post("/api/v1/simulations", json=request).status_code == 422
    request["scenarios"] = [{"name": "Bad", "model": "diversion", "kind": "fraction", "value": "2"}]
    assert client.post("/api/v1/simulations", json=request).status_code == 422
    request["scenarios"] *= 5
    assert client.post("/api/v1/simulations", json=request).status_code == 422


def test_real_zero_separate_prevention_api(client):
    request, _ = payload(client, name="Janjina")
    request["scenarios"] = [
        {"name": "Nulta preostala masa", "model": "prevention", "kind": "fraction", "value": "1"}
    ]
    response = client.post("/api/v1/simulations", json=request)
    assert response.status_code == 200, response.text
    scenario = response.json()["scenarios"][0]
    assert D(scenario["result"]["total_t"]) == 0
    assert scenario["result"]["rate_pct"] is None
    assert scenario["difference"]["rate_pct"] is None
    request["scenarios"][0].update(kind="target", value="50")
    assert client.post("/api/v1/simulations", json=request).status_code == 422
