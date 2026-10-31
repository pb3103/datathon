"""Reconstruction audit tests; no publication or historical scope is inferred from agreement."""

from decimal import Decimal as D
import hashlib
import pytest
from pipeline.audit_collection_rates import calculate_rate, matches_precision, report
from pipeline.extract import ROOT


def test_berek_example_is_2024_and_matches_source_precision():
    actual = calculate_rate(D("124.20"), D("100.36"))
    assert abs(actual - D("19.1948470209339774557")) < D("1e-18")
    assert matches_precision(D("124.20"), D("100.36"), D("19.2"), D(".005"), D(".005"))
    assert not matches_precision(D("124.20"), D("100.36"), D("25"), D(".005"), D(".005"))


@pytest.mark.parametrize(
    "total,mixed",
    [
        (None, D(1)),
        (D(1), None),
        (D(0), D(0)),
        (D(-1), D(0)),
        (D(1), D(-1)),
        (D(1), D(2)),
        (D("NaN"), D(0)),
        (D(1), D("Infinity")),
    ],
)
def test_invalid_inputs_are_missing_not_zero(total, mixed):
    assert calculate_rate(total, mixed) is None
    assert not matches_precision(total, mixed, D(10), D(".005"), D(".005"))


def test_real_zero_is_retained_and_tiny_total_cannot_certify_precision():
    assert calculate_rate(D(10), D(10)) == 0
    assert calculate_rate(D(10), D(0)) == 100
    assert not matches_precision(D(".001"), D(0), D(100), D(".005"), D(".005"))


def test_all_newer_rows_match_and_audit_is_read_only():
    import json

    sources = json.loads((ROOT / "data/manifests/source_files.json").read_text())
    before = {
        e["path"]: hashlib.sha256((ROOT / e["path"]).read_bytes()).hexdigest() for e in sources
    }
    result = report()
    assert [y["year"] for y in result["years"]] == [2021, 2022, 2023, 2024]
    for year in result["years"]:
        assert year["rows"] == year["compared"] == year["matched"] == 556
        assert year["unmatched"] == 0
    berek = next(r for r in result["years"][-1]["records"] if r["name"] == "Berek")
    assert berek["total_t"] == D("124.20") and berek["published_rate_pct"] == D("19.2")
    assert result["historical_decision"]["new_rates_by_year"] == dict.fromkeys(
        ["2017", "2018", "2019", "2020"], 0
    )
    assert before == {
        e["path"]: hashlib.sha256((ROOT / e["path"]).read_bytes()).hexdigest() for e in sources
    }
