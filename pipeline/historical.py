"""Read-only, PDF-verified historical CSV extraction using existing transactional importer."""

import argparse
import csv
import hashlib
import json
from collections import Counter
from decimal import Decimal, localcontext
from pathlib import Path
from pipeline.source_paths import resolve_source_path
from backend.app.config import get_settings
from backend.app.db import get_engine
from pipeline.extract import ROOT, Row, Issue, canonical_identity, normalize_name, parse_decimal
from pipeline.import_data import import_source, summary

VERSION = "historical-csv-1.0"
MAPS = json.loads((ROOT / "pipeline/config/historical_maps.json").read_text())
ALIASES = json.loads((ROOT / "pipeline/config/historical_aliases.json").read_text())
MANIFEST = ROOT / "data/manifests/historical_sources.json"
PROOF = ROOT / "data/manifests/historical_verification.json"
FIELDS = [
    "godina",
    "zupanija",
    "jls",
    "ukupno_sakupljeno_jls_t",
    "mijesani_jls_t",
    "obuhvaceni_stanovnici",
    "objavljeno_kg_po_stanovniku",
    "izracunata_stopa_odvojeno_pct",
    "stranica_pdf",
    "izvor",
    "napomena",
]


def load_historical(data_dir: Path):
    manifest = json.loads(MANIFEST.read_text())
    proof = json.loads(PROOF.read_text())
    result = []
    for year in range(2017, 2021):
        entry = next(e for e in manifest if e["year"] == year and e["path"].endswith(".csv"))
        check = proof[str(year)]
        for path_key, hash_key in [("csv_path", "csv_sha256"), ("pdf_path", "pdf_sha256")]:
            path = resolve_source_path(data_dir / str(year) / Path(check[path_key]).name)
            if hashlib.sha256(path.read_bytes()).hexdigest() != check[hash_key]:
                raise ValueError(f"Povijesni izvor promijenjen bez nove provjere: {path}")
        if entry["sha256"] != check["csv_sha256"]:
            raise ValueError("Manifest i PDF provjera nisu usklađeni.")
        path = resolve_source_path(data_dir / str(year) / Path(entry["path"]).name)
        with path.open(encoding="utf-8-sig", newline="") as handle:
            reader = csv.DictReader(handle)
            expected = FIELDS + (
                ["pdf_vrijednosti_provjerene", "zupanija_korekcija_izvor"] if year < 2020 else []
            )
            if reader.fieldnames != expected:
                raise ValueError(f"Promijenjeno CSV zaglavlje: {path}")
            raw_rows = list(reader)
        evidence = {r["csv_row"]: r for r in check["rows"]}
        if len(raw_rows) != 556 or len(evidence) != 556:
            raise ValueError("Nepotpun pregledani povijesni skup.")
        rows = []
        for rn, raw in enumerate(raw_rows, 2):
            row = Row(rn, {"A": {"value": raw["zupanija"]}, "B": {"value": raw["jls"]}, "csv": raw})
            ev = evidence.get(rn)
            try:
                if int(raw["godina"]) != year or ev is None:
                    raise ValueError("Neusklađena godina ili dokaz retka.")
                name = raw["jls"]
                county = raw["zupanija"]
                for alias in ALIASES:
                    if (
                        alias["year"] == year
                        and normalize_name(alias["county"]) == normalize_name(raw["zupanija"])
                        and normalize_name(alias["source_name"]) == normalize_name(name)
                    ):
                        name = alias["canonical_name"]
                        county = alias.get("canonical_county", county)
                        break
                row.municipality_id, row.county, row.name, row.key, row.alias_reason = (
                    canonical_identity(county, name, year)
                )
                if (
                    str(row.municipality_id) != ev["municipality_id"]
                    or row.name.casefold() != ev["canonical_name"].casefold()
                ):
                    raise ValueError("Identitet nije jednak neovisno pregledanom PDF dokazu.")
                t, m, p, f = map(parse_decimal, ev["values"])
                if (
                    any(
                        v is None or not v.is_finite() or v < 0 or v >= Decimal("1e12")
                        for v in (t, m, p, f)
                    )
                    or p <= 0
                    or p != p.to_integral_value()
                    or p > 2147483647
                    or m > t
                ):
                    raise ValueError("Nevaljane mase ili populacija.")
                row.total_t, row.mixed_t, row.covered_population, row.published_kg_per_capita = (
                    t,
                    m,
                    int(p),
                    f,
                )
                row.published_separate_collection_pct = None
                row.population_usable = True
                for key, value in zip("CDEF", FIELDS[3:7]):
                    row.raw_values[key] = {"value": raw[value], "type": "csv", "formula": None}
                ratio = parse_decimal(raw["izracunata_stopa_odvojeno_pct"])
                if ratio is not None and not 0 <= ratio <= 100:
                    raise ValueError("Nevaljan CSV kontrolni omjer.")
                row.raw_values["historical"] = {
                    "pdf_path": check["pdf_path"],
                    "pdf_sha256": check["pdf_sha256"],
                    "pdf_page": ev["pdf_page"],
                    "pdf_tokens": ev["pdf_tokens"],
                    "csv_calculated_ratio_pct": raw["izracunata_stopa_odvojeno_pct"],
                    "official_rate_published": False,
                    "effective_values_from_pdf": ev["values"],
                    "kg_control": MAPS[str(year)]["kg_control"],
                }
                if ev["corrections"]:
                    row.issues.append(
                        Issue(
                            "pdf_verified_correction",
                            "info",
                            "Vrijednost oštećena pri CSV izdvajanju zamijenjena je potvrđenom PDF vrijednošću; originalni CSV je očuvan.",
                            ev["corrections"],
                        )
                    )
                with localcontext() as ctx:
                    ctx.prec = 40
                    h = Decimal(MAPS[str(year)]["mass_half"])
                    lo = 1000 * (t - h) / p
                    hi = 1000 * (t + h) / p
                    eps = Decimal("0.00000001")
                    valid = (
                        (lo - Decimal(".5") - eps <= f <= hi + Decimal(".5") + eps)
                        if year < 2019
                        else (lo < f + 1 + eps and hi >= f - eps)
                    )
                    if not valid:
                        row.population_usable = False
                        row.issues.append(
                            Issue(
                                "kg_per_capita_mismatch",
                                "warning",
                                "Objavljeni kg/stan. nije usklađen s T i P unutar dokumentiranog intervala preciznosti.",
                                {"published": str(f), "derived": str(1000 * t / p)},
                            )
                        )
                    if (
                        t > 0
                        and ratio is not None
                        and abs(100 * (t - m) / t - ratio) > Decimal(".00500001")
                    ):
                        row.issues.append(
                            Issue(
                                "csv_calculated_ratio_mismatch",
                                "warning",
                                "CSV izračunati omjer nije jednak kontrolnom računu iz potvrđenih masa. Ne koristi se kao službena stopa.",
                            )
                        )
                row.issues.append(
                    Issue(
                        "historical_rate_not_published",
                        "info",
                        "U povijesnoj tablici nije objavljena službena stopa. Kontrolni omjer razlike tokova nije metodološki potvrđena stopa odvojenog sakupljanja.",
                    )
                )
            except (ValueError, ArithmeticError) as exc:
                row.issues.append(Issue("parse_error", "error", str(exc)))
            rows.append(row)
        counts = Counter(r.key for r in rows if r.key)
        for row in rows:
            if row.key and counts[row.key] > 1:
                row.issues.append(Issue("duplicate_jls", "error", "Ponovljen povijesni ključ JLS."))
        result.append((entry, rows))
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--activate-revision", action="store_true")
    args = parser.parse_args()
    sources = load_historical(get_settings().data_dir)
    if any(r.rejected for _, rows in sources for r in rows):
        raise ValueError("Povijesni audit ima odbijene retke; uvoz zaustavljen.")
    # Historical aliases may only reference the existing canonical 2021 baseline.
    from sqlalchemy.orm import Session
    from sqlalchemy import select
    from backend.app.models import Municipality

    with Session(get_engine()) as session:
        known = set(session.scalars(select(Municipality.id)))
    for _, rows in sources:
        if {r.municipality_id for r in rows} != known:
            raise ValueError(
                "Povijesni identiteti nisu jednaki aktivnom registru; prvo uvezite novije godine."
            )
    reports = [
        {**summary(e, rows, VERSION), "status": "dry_run"}
        if args.dry_run
        else import_source(
            get_engine(),
            e,
            rows,
            config=MAPS[str(e["year"])],
            parser_version=VERSION,
            activate_revision=args.activate_revision,
        )
        for e, rows in sources
    ]
    print(json.dumps(reports, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
