from decimal import Decimal as D
import pytest
from backend.app.historical_share import historical_share, HASHES


@pytest.mark.parametrize("year", [2017, 2018, 2019, 2020])
def test_share_valid_and_never_claims_published_rate(year):
    value, reason = historical_share(
        year, f"historical_collection_{year}", HASHES[year], D("124.20"), D("100.36")
    )
    assert abs(value - D("19.1948470209339774557")) < D("1e-18")
    assert reason is None


@pytest.mark.parametrize(
    "total,mixed",
    [(None, D(1)), (D(1), None), (D(0), D(0)), (D(1), D(-1)), (D(1), D(2)), (D("NaN"), D(0))],
)
@pytest.mark.parametrize("year", [2019, 2020])
def test_invalid_share_is_missing(total, mixed, year):
    assert (
        historical_share(year, f"historical_collection_{year}", HASHES[year], total, mixed)[0]
        is None
    )


def test_incompatible_scope_revision_and_true_zero():
    assert historical_share(2019, "historical_collection_2019", HASHES[2019], D(100), D(50)) == (
        D(50),
        None,
    )
    assert historical_share(2019, "public_service", HASHES[2019], D(100), D(50))[0] is None
    assert historical_share(2020, "public_service", HASHES[2020], D(100), D(50))[0] is None
    assert historical_share(2020, "historical_collection_2020", "unknown", D(100), D(50))[0] is None
    assert (
        historical_share(2020, "historical_collection_2020", HASHES[2020], D(100), D(100))[0] == 0
    )


def test_2019_pdf_rows_and_aggregate():
    from pipeline.audit_2019_share import report

    result = report()
    assert result["rows"] == result["unique_jls"] == result["available_shares"] == 556
    assert result["mass_extraction_mismatches"] == 0
    assert len(result["samples"]) >= 10
    assert len({r["county"] for r in result["samples"]}) >= 10
    assert result["aggregate"]["total_t"] == D("1372385.76")
    assert result["aggregate"]["mixed_t"] == D("1086393.41")
    assert result["aggregate"]["rounds_to_published_integer_pct"]
    assert abs(result["aggregate"]["difference_from_published_masses_pp"]) < D(".04")
    z = next(r for r in result["samples"] if r["name"] == "Zagreb")
    s = next(r for r in result["samples"] if r["name"] == "Split")
    assert z["share_pct"].quantize(D(".01")) == D("22.26")
    assert s["share_pct"].quantize(D(".01")) == D("15.28")
