"""Read-only 2019 broad-share audit of every CSV row against reviewed PDF evidence."""

import csv
import hashlib
import json
from decimal import Decimal as D, localcontext
from pathlib import Path
from backend.app.historical_share import historical_share, HASHES

ROOT = Path(__file__).resolve().parents[1]


def report():
    proof = json.loads((ROOT / "data/manifests/historical_verification.json").read_text())["2019"]
    for kind in ("csv", "pdf"):
        assert (
            hashlib.sha256((ROOT / proof[f"{kind}_path"]).read_bytes()).hexdigest()
            == proof[f"{kind}_sha256"]
        )
    with (ROOT / proof["csv_path"]).open(encoding="utf-8-sig", newline="") as stream:
        rows = list(csv.DictReader(stream))
    assert len(rows) == len(proof["rows"]) == 556
    assert len({r["municipality_id"] for r in proof["rows"]}) == 556
    assert len({r["csv_row"] for r in proof["rows"]}) == 556
    records = []
    for evidence in proof["rows"]:
        row = rows[evidence["csv_row"] - 2]
        t, m = D(row["ukupno_sakupljeno_jls_t"]), D(row["mijesani_jls_t"])
        assert [t, m] == [D(v) for v in evidence["values"][:2]]
        assert int(row["godina"]) == 2019
        assert int(row["obuhvaceni_stanovnici"]) == int(evidence["values"][2])
        value, reason = historical_share(2019, "historical_collection_2019", HASHES[2019], t, m)
        assert value is not None and reason is None
        records.append(
            {
                "id": evidence["municipality_id"],
                "name": evidence["canonical_name"],
                "county": evidence["county"],
                "csv_row": evidence["csv_row"],
                "pdf_page": evidence["pdf_page"],
                "pdf_tokens": evidence["pdf_tokens"][:2],
                "total_t": t,
                "mixed_t": m,
                "population": int(evidence["values"][2]),
                "share_pct": value,
            }
        )
    samples = [r for r in records if r["name"] in ("Zagreb", "Split")]
    used = {r["county"] for r in samples}
    for county in sorted({r["county"] for r in records} - used)[:10]:
        samples.append(
            min(
                (r for r in records if r["county"] == county),
                key=lambda r: (r["population"], r["name"]),
            )
        )
    if not any(r["name"] == "Berek" for r in samples):
        samples.append(next(r for r in records if r["name"] == "Berek"))
    with localcontext() as ctx:
        ctx.prec = 40
        total = sum(r["total_t"] for r in records)
        mixed = sum(r["mixed_t"] for r in records)
        share = 100 * (total - mixed) / total
        official_share = 100 * D(285486) / D(1372358)
        aggregate = {
            "calculated_jls_sum_not_official_national_total": True,
            "total_t": total,
            "mixed_t": mixed,
            "outside_mixed_t": total - mixed,
            "weighted_share_pct": share,
            "published_rounded_share_pct": 21,
            "difference_from_rounded_pp": share - 21,
            "published_table11_total_t": 1372358,
            "published_table11_mixed_t": 1086872,
            "published_table11_other_t": 285486,
            "published_masses_share_pct": official_share,
            "difference_from_published_masses_pp": share - official_share,
            "total_difference_t": total - D(1372358),
            "mixed_difference_t": mixed - D(1086872),
            "rounds_to_published_integer_pct": share.quantize(D(1)) == D(21),
            "max_556_row_rounding_half_t": D(556) * D(".005"),
        }
    return {
        "year": 2019,
        "pdf_path": proof["pdf_path"],
        "pdf_sha256": proof["pdf_sha256"],
        "csv_path": proof["csv_path"],
        "csv_sha256": proof["csv_sha256"],
        "table": "Tablica 27 / Prilog 1",
        "pdf_pages": [119, 135],
        "definitions_pages": [12, 13, 14, 34, 39, 40],
        "rows": 556,
        "unique_jls": 556,
        "mass_pairs_matching_reviewed_pdf": 556,
        "available_shares": 556,
        "mass_extraction_mismatches": 0,
        "published_kg_corrections_already_documented": sum(
            "published_kg_per_capita" in r["corrections"] for r in proof["rows"]
        ),
        "samples": samples,
        "aggregate": aggregate,
        "limitations": "Razlika agregata nije objašnjena samim zaokruživanjem redaka; uzrok razlike među tablicama nije potvrđen. Lokalne mase nisu mijenjane niti skalirane. Široki udio nije stopa prema Uredbi (14%), RH udio (37%), recikliranje niti potvrđen međugodišnji trend.",
    }


if __name__ == "__main__":
    print(json.dumps(report(), ensure_ascii=False, indent=2, default=str))
