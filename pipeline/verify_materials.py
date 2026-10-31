"""Audit-only: compare XLSX published kg/person × reported P with PDF tonnes.
The multiplication is a unit/denominator control, never an exported waste mass.
Input words are produced read-only by pdf_material_words.swift (macOS PDFKit).
Unparsed or inconsistent PDF rows remain unverified, never guessed/fuzzy-matched.
"""

import argparse
import hashlib
import json
import re
from collections import Counter
from decimal import Decimal
from pathlib import Path
from pipeline.extract import ROOT, canonical_identity, read_cells, parse_decimal

MATERIALS = dict(zip("CDEFGHI", ["paper", "plastic", "glass", "metal", "bulky", "textile", "bio"]))


def verify(words_dir, data_dir):
    manifest = json.loads((ROOT / "data/manifests/source_files.json").read_text())
    audit = {}
    for year in range(2021, 2025):
        entry = next(m for m in manifest if m["year"] == year and m["path"].endswith(".xlsx"))
        pdf = next(m for m in manifest if m["year"] == year and m["path"].endswith(".pdf"))
        path = data_dir / str(year) / Path(entry["path"]).name
        assert hashlib.sha256(path.read_bytes()).hexdigest() == entry["sha256"]
        assert (
            hashlib.sha256((data_dir / str(year) / Path(pdf["path"]).name).read_bytes()).hexdigest()
            == pdf["sha256"]
        )
        from pipeline.extract import MAPS

        main = {
            canonical_identity(r["A"]["value"], r["B"]["value"], year)[0]: r
            for n, r in read_cells(path, MAPS[str(year)]["sheet"])
            if n > 1
        }
        import zipfile
        import xml.etree.ElementTree as ET

        with zipfile.ZipFile(path) as z:
            names = [
                s.get("name")
                for s in ET.fromstring(z.read("xl/workbook.xml")).findall("{*}sheets/{*}sheet")
            ]
        materials = {
            canonical_identity(r["A"]["value"], r["B"]["value"], year)[0]: (n, r)
            for n, r in read_cells(path, names[1])
            if n > 1
        }
        parsed = {}
        for page in json.loads((words_dir / f"words-{year}.json").read_text()):
            words = page["words"]
            headers = [w for w in words if w["text"] == "Papir"]
            if not headers:
                continue
            header = max(headers, key=lambda w: w["y"])
            numeric = [
                w
                for w in words
                if w["x"] > header["x0"] - 10
                and w["y"] < header["y"] - 5
                and re.fullmatch(r"\d[\d.]*,\d{2}", w["text"])
            ]
            groups = {}
            for w in numeric:
                anchor = next((y for y in groups if abs(y - w["y"]) < 1), w["y"])
                groups.setdefault(anchor, []).append(w)
            anchors = sorted([y for y, ws in groups.items() if len(ws) == 7], reverse=True)
            left = {2021: 190, 2022: 195, 2023: 200, 2024: 180}[year]
            for index, y in enumerate(anchors):
                top = (anchors[index - 1] + y) / 2 if index else y + 8
                bottom = (anchors[index + 1] + y) / 2 if index + 1 < len(anchors) else y - 8
                band = sorted(
                    [w for w in words if bottom < w["y"] < top and w["x0"] < header["x0"] - 10],
                    key=lambda w: (-round(w["y"]), w["x"]),
                )
                name = " ".join(w["text"] for w in band if w["x0"] >= left)
                county = " ".join(w["text"] for w in band if w["x0"] < left)
                mid = canonical_identity(county, name, year)[0]
                if mid not in materials:
                    continue
                amounts = [
                    parse_decimal(w["text"], text_cell=True)
                    for w in sorted(groups[y], key=lambda w: w["x"])
                ]
                parsed.setdefault(mid, []).append((page["page"], amounts, name, county))
        records = {}
        counts = Counter()
        for mid, (rn, raw) in materials.items():
            population = parse_decimal(main[mid]["E"]["value"]) if mid in main else None
            candidates = parsed.get(mid, [])
            evidence = {"source_row": rn, "pdf_page": None, "categories": {}}
            for index, (col, material) in enumerate(MATERIALS.items()):
                value = parse_decimal(raw[col]["value"])
                status = "pdf_row_not_unambiguously_parsed"
                if len(candidates) == 1 and population is not None and population > 0:
                    page, amounts, _, _ = candidates[0]
                    evidence["pdf_page"] = page
                    residual = (
                        abs(value * population / 1000 - amounts[index])
                        if value is not None
                        else None
                    )
                    nonzero_evidence = any(
                        parse_decimal(raw[c]["value"]) not in (None, Decimal(0)) for c in MATERIALS
                    )
                    status = (
                        (
                            "verified_against_pdf"
                            if nonzero_evidence
                            else "zero_only_denominator_unverified"
                        )
                        if residual is not None and residual <= Decimal("0.00500001")
                        else "pdf_mass_denominator_mismatch"
                    )
                    evidence["categories"][material] = {
                        "status": status,
                        "pdf_t": str(amounts[index]),
                        "control_residual_t": str(residual),
                        "covered_population": int(population),
                    }
                else:
                    evidence["categories"][material] = {"status": status}
                counts[status] += 1
            records[str(mid)] = evidence
        audit[str(year)] = {
            "xlsx_sha256": entry["sha256"],
            "pdf_sha256": pdf["sha256"],
            "sheet": names[1],
            "unit": "kg/person",
            "scope": "materials_public_service_and_public_containers"
            if year <= 2022
            else "materials_public_service",
            "cross_year_verified": False,
            "counts": dict(counts),
            "records": records,
        }
    return {
        "version": "material-audit-1",
        "policy": "PDF arithmetic control per municipality/category; no conversion or summation in application. Cross-year scope/denominator continuity is unverified.",
        "years": audit,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--words-dir", type=Path, required=True)
    parser.add_argument("--data-dir", type=Path, default=ROOT / "podaci")
    parser.add_argument(
        "--output", type=Path, default=ROOT / "data/manifests/material_verification.json"
    )
    args = parser.parse_args()
    result = verify(args.words_dir, args.data_dir)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({y: v["counts"] for y, v in result["years"].items()}, indent=2))
