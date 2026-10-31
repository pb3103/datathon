"""Regenerate reviewed evidence; never edits CSV/PDF files. Requires macOS PDFKit word export."""

import json
import csv
import pathlib
import re
import unicodedata
import hashlib
from decimal import Decimal as D
import argparse

parser = argparse.ArgumentParser(
    description="Rebuild PDF geometry verification from read-only word exports and the canonical 2021 registry."
)
parser.add_argument("--baseline", type=pathlib.Path, required=True)
parser.add_argument("--words-dir", type=pathlib.Path, required=True)
args = parser.parse_args()
ROOT = pathlib.Path(__file__).resolve().parents[1]


def n(s):
    return " ".join(unicodedata.normalize("NFC", s).casefold().split())


b = json.loads(args.baseline.read_text())
base = {(n(r["county"]), n(r["name"])): r for r in b}
aliases = json.loads((ROOT / "pipeline/config/historical_aliases.json").read_text())
proof = {}
fail = []
for year in range(2017, 2021):
    path = next((ROOT / "podaci" / str(year)).glob("*.csv"))
    pdf = next(path.parent.glob("*.pdf"))
    pages = json.loads((args.words_dir / f"historical-words-{year}.json").read_text())
    columns = {
        2017: [130, 270, 340, 410, 490, 560],
        2018: [140, 270, 340, 410, 490, 560],
        2019: [180, 370, 500, 600, 725, 810],
        2020: [160, 300, 365, 425, 490, 560],
    }[year]
    pdfrows = []
    for page in pages:
        words = page["words"]
        anchors = [
            w
            for w in words
            if columns[1] <= w["x"] < columns[2] and re.fullmatch(r"\d[\d.,]*", w["text"])
        ]
        for a in anchors:
            line = [w for w in words if abs(w["y"] - a["y"]) < 1.8]
            vals = []
            for j in range(1, 5):
                tokens = [
                    w["text"]
                    for w in line
                    if columns[j] <= w["x"] < columns[j + 1]
                    and re.fullmatch(r"\d[\d.,]*", w["text"])
                ]
                if len(tokens) != 1:
                    break
                vals.append(tokens[0])
            if len(vals) != 4:
                continue
            name = " ".join(
                w["text"]
                for w in sorted(line, key=lambda w: w["x"])
                if columns[0] <= w["x"] < columns[1]
            )
            pdfrows.append(
                {
                    "name": name,
                    "page": page["page"],
                    "y": a["y"],
                    "tokens": vals,
                    "values": [str(D(v.replace(".", "").replace(",", "."))) for v in vals],
                }
            )
    rows = list(csv.DictReader(path.open(encoding="utf-8-sig")))
    yearproof = []
    for idx, r in enumerate(rows, 2):
        county, name = r["zupanija"], r["jls"]
        for alias in aliases:
            if (
                alias["year"] == year
                and n(alias["county"]) == n(county)
                and n(alias["source_name"]) == n(name)
            ):
                county = alias.get("canonical_county", county)
                name = alias["canonical_name"]
                break
        match = base.get((n(county), n(name)))
        if match is None:
            fail.append((year, r["jls"], "unresolved identity"))
            continue
        matches = [
            q
            for q in pdfrows
            if q["page"] == int(r["stranica_pdf"]) and n(q["name"]) == n(r["jls"])
        ]
        if len(matches) > 1 and n(r["jls"]) == "otok":
            # Reviewed table county boundary: the northern Otok precedes the Dalmatian Otok.
            if r["zupanija"] not in ("Vukovarsko-srijemska", "Splitsko-dalmatinska"):
                raise ValueError("Unreviewed Otok county")
            matches = sorted(matches, key=lambda q: -q["y"])
            matches = [matches[0 if "Vukovarsko" in r["zupanija"] else -1]]
        if len(matches) != 1:
            fail.append(
                (
                    year,
                    r["jls"],
                    "pdf",
                    [(q["name"], q["page"]) for q in pdfrows if n(q["name"]) == n(r["jls"])],
                )
            )
            continue
        q = matches[0]
        old = [
            r[k]
            for k in [
                "ukupno_sakupljeno_jls_t",
                "mijesani_jls_t",
                "obuhvaceni_stanovnici",
                "objavljeno_kg_po_stanovniku",
            ]
        ]
        corrections = {
            k: {"csv": a, "pdf": v}
            for k, a, v in zip(
                ["total_t", "mixed_t", "covered_population", "published_kg_per_capita"],
                old,
                q["values"],
            )
            if D(a) != D(v)
        }
        if county != r["zupanija"]:
            corrections["county"] = {
                "csv": r["zupanija"],
                "pdf": county,
                "evidence": "Reviewed county section on PDF page 101; distinct from Istrian row on page 94.",
            }
        yearproof.append(
            {
                "csv_row": idx,
                "municipality_id": match["id"],
                "canonical_name": match["name"],
                "county": match["county"],
                "pdf_page": q["page"],
                "pdf_y": q["y"],
                "pdf_tokens": q["tokens"],
                "values": q["values"],
                "corrections": corrections,
            }
        )
    proof[str(year)] = {
        "csv_path": str(path.relative_to(ROOT)),
        "csv_sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        "pdf_path": str(pdf.relative_to(ROOT)),
        "pdf_sha256": hashlib.sha256(pdf.read_bytes()).hexdigest(),
        "rows": yearproof,
    }
if fail:
    raise ValueError(fail)
for year, entry in proof.items():
    if len(entry["rows"]) != 556 or len({r["municipality_id"] for r in entry["rows"]}) != 556:
        raise ValueError("Incomplete or duplicate canonical historical identities")
print(json.dumps(proof, ensure_ascii=False, indent=2))
