from decimal import Decimal
import pytest
from openpyxl import Workbook
from pipeline.extract import MAPS, canonical_identity, extract, parse_decimal


@pytest.mark.parametrize(
    "value,text_cell,expected",
    [
        ("1.234,56", True, "1234.56"),
        ("1.234", True, "1234"),
        ("1234.56", False, "1234.56"),
        ("0", False, "0"),
        ("1.2E-3", False, "0.0012"),
        ("-", True, None),
        ("", False, None),
        (None, False, None),
        (" 1\u00a0234,50 ", True, "1234.50"),
    ],
)
def test_number_parsing(value, text_cell, expected):
    assert parse_decimal(value, text_cell=text_cell) == (
        Decimal(expected) if expected is not None else None
    )


@pytest.mark.parametrize("value", ["NaN", "Infinity", "napomena", "1,2,3"])
def test_invalid_numeric_rejected(value):
    with pytest.raises(ValueError):
        parse_decimal(value, text_cell=True)


def workbook(tmp_path, year, records):
    book = Workbook()
    sheet = book.active
    sheet.title = MAPS[str(year)]["sheet"]
    sheet.append(list(MAPS[str(year)]["headers"].values()))
    for record in records:
        sheet.append(record)
    if year == 2022:
        for row in range(2, sheet.max_row + 1):
            sheet.cell(row, 7).number_format = "0%"
    path = tmp_path / "synthetic.xlsx"
    book.save(path)
    return path


def test_duplicate_all_rows_quarantined(tmp_path):
    record = ["Zagrebačka", "Primjer", 100, 70, 1000, 100, 30]
    rows = extract(workbook(tmp_path, 2024, [record, record]), 2024)
    assert len(rows) == 2 and all(r.rejected for r in rows)
    assert all(any(i.code == "duplicate_jls" for i in r.issues) for r in rows)


def test_zero_missing_invalid_and_decimal_scale(tmp_path):
    rows = extract(
        workbook(
            tmp_path,
            2022,
            [
                ["Zagrebačka", "Nula", 100, 100, 1000, 100, 0],
                ["Zagrebačka", "Nedostaje", None, 70, 1000, None, None],
                ["Zagrebačka", "Nevaljano", 100, 110, 1000, 100, 0.16],
                ["Zagrebačka", "Stopa", 100, 84, 1000, 100, 0.16],
            ],
        ),
        2022,
    )
    assert rows[0].published_separate_collection_pct == 0 and not rows[0].rejected
    assert rows[1].total_t is None and not rows[1].rejected
    assert any(i.code == "missing_value" for i in rows[1].issues)
    assert rows[2].rejected
    assert rows[3].published_separate_collection_pct == 16
    assert rows[3].raw_values["G"]["value"] == "0.16"


def test_reviewed_zagreb_alias_and_county_disambiguation():
    assert (
        canonical_identity("21. Grad Zagreb", "Zagreb", 2023)[0]
        == canonical_identity("Grad Zagreb", "Grad Zagreb", 2024)[0]
    )
    assert (
        canonical_identity("Zagrebačka", "Sveta Nedelja", 2024)[0]
        != canonical_identity("Istarska", "Sveta Nedelja", 2024)[0]
    )


def test_actual_sources_quality_findings(extracted_sources):
    counts = []
    ids = []
    for entry, rows in extracted_sources:
        assert len(rows) == 556 and not any(r.rejected for r in rows)
        ids.append({r.municipality_id for r in rows})
        counts.append(sum(any(i.code == "kg_per_capita_mismatch" for i in r.issues) for r in rows))
        assert not any(
            i.code == "separate_collection_rate_mismatch" for r in rows for i in r.issues
        )
    assert counts == [1, 1, 0, 9]
    assert ids[0] == ids[1] == ids[2] == ids[3]
    bjelovar = next(r for r in extracted_sources[1][1] if r.name == "Bjelovar")
    assert bjelovar.published_separate_collection_pct == 16
