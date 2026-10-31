"""Read-only Prilog 2 ETL. Never convert published kg/person to tonnes or sum categories."""

import argparse
import hashlib
import json
from collections import Counter
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
from sqlalchemy import select, text, update
from sqlalchemy.orm import Session
from backend.app.config import get_settings
from backend.app.db import get_engine
from backend.app.models import (
    ImportRun,
    MaterialObservation,
    QualityIssue,
    SourceDataset,
    WasteObservation,
)
from pipeline.extract import ROOT, canonical_identity, json_default, parse_decimal, read_cells
from pipeline.verify_materials import MATERIALS

PARSER_VERSION = "materials-1.0.0"


def extract_materials(path, year, config):
    rows = []
    header = None
    for rn, raw in read_cells(path, config["sheet"]):
        if header is None:
            header = {k: v["value"] for k, v in raw.items() if v["value"] not in (None, "")}
            if rn != 1 or header != config["headers"]:
                raise ValueError(
                    "Materijalno zaglavlje ili jedinica promijenjeni; potreban pregled."
                )
            continue
        item = {"source_row": rn, "raw_values": raw, "issues": [], "values": {}}
        try:
            if any(v["formula"] or v["type"] == "e" for v in raw.values()):
                raise ValueError("Formula ili Excel pogreška u materijalnom retku.")
            item["municipality_id"] = canonical_identity(
                raw["A"]["value"], raw["B"]["value"], year
            )[0]
            for col, key in MATERIALS.items():
                cell = raw.get(col, {})
                value = parse_decimal(
                    cell.get("value"), text_cell=cell.get("type", "n") in ("s", "str", "inlineStr")
                )
                if value is not None and (value < 0 or value >= Decimal("1e12")):
                    raise ValueError("Nevaljana materijalna vrijednost.")
                item["values"][key] = value
        except (ValueError, KeyError, TypeError) as exc:
            item["issues"].append(str(exc))
        rows.append(item)
    if header is None:
        raise ValueError("Prazan materijalni list.")
    counts = Counter(r.get("municipality_id") for r in rows if r.get("municipality_id"))
    for row in rows:
        if counts.get(row.get("municipality_id"), 0) > 1:
            row["issues"].append("Ponovljena JLS: svi ponovljeni retci odbijeni.")
    return rows


def load_material_sources(data_dir):
    manifest = json.loads((ROOT / "data/manifests/source_files.json").read_text())
    maps = json.loads((ROOT / "pipeline/config/material_maps.json").read_text())
    evidence = json.loads((ROOT / "data/manifests/material_verification.json").read_text())
    result = []
    for year, config in maps.items():
        entry = next(m for m in manifest if m["year"] == int(year) and m["path"].endswith(".xlsx"))
        path = data_dir / year / Path(entry["path"]).name
        if hashlib.sha256(path.read_bytes()).hexdigest() != entry["sha256"]:
            raise ValueError("Materijalni checksum ne odgovara manifestu.")
        proof = evidence["years"].get(year, {})
        pdf = next(m for m in manifest if m["year"] == int(year) and m["path"].endswith(".pdf"))
        if proof.get("xlsx_sha256") != entry["sha256"] or proof.get("pdf_sha256") != pdf["sha256"]:
            raise ValueError("Potrebna nova metodološka provjera za ovu verziju izvora.")
        if (
            hashlib.sha256((data_dir / year / Path(pdf["path"]).name).read_bytes()).hexdigest()
            != pdf["sha256"]
        ):
            raise ValueError("PDF checksum ne odgovara provjeri.")
        result.append((entry, config, proof, extract_materials(path, int(year), config)))
    return result


def import_material_source(engine, entry, config, proof, rows, activate_revision=False):
    with Session(engine) as session, session.begin():
        session.execute(text("SELECT pg_advisory_xact_lock(8703292026)"))
        source = session.scalar(
            select(SourceDataset).where(
                SourceDataset.sha256 == entry["sha256"], SourceDataset.sheet == config["sheet"]
            )
        )
        if source:
            run = session.scalar(
                select(ImportRun).where(
                    ImportRun.source_id == source.id, ImportRun.status == "completed"
                )
            )
            if run:
                if run.parser_version != PARSER_VERSION:
                    raise ValueError("Potreban izričiti podatkovni upgrade parsera materijala.")
                return {"year": entry["year"], "status": "skipped", **run.report}
        if source is None:
            source = SourceDataset(
                title=Path(entry["path"]).name,
                path=entry["path"],
                sha256=entry["sha256"],
                year=entry["year"],
                sheet=config["sheet"],
                scope=proof["scope"],
                methodology_group=proof["scope"] + "_provisional_v1",
                methodology_verified=False,
            )
            session.add(source)
            session.flush()
        run = ImportRun(
            source_id=source.id,
            parser_version=PARSER_VERSION,
            started_at=datetime.now(timezone.utc),
            status="running",
            report={},
        )
        session.add(run)
        session.flush()
        run_id = run.id
        failure = None
        report = {}
        try:
            with session.begin_nested():
                old_ids = set(
                    session.scalars(
                        select(MaterialObservation.source_id).where(
                            MaterialObservation.year == entry["year"], MaterialObservation.active
                        )
                    )
                )
                main = {
                    o.municipality_id: o
                    for o in session.scalars(
                        select(WasteObservation).where(
                            WasteObservation.year == entry["year"], WasteObservation.active
                        )
                    )
                }
                if not main:
                    raise ValueError("Najprije učitajte glavni Prilog 1.")
                if old_ids and old_ids != {source.id}:
                    if not activate_revision:
                        raise ValueError(
                            "Postoji druga aktivna materijalna revizija; potreban pregled i --activate-revision."
                        )
                    if any(r["issues"] for r in rows) or {
                        r.get("municipality_id") for r in rows
                    } != set(main):
                        raise ValueError("Nepotpuna revizija materijala nije dopuštena.")
                    session.execute(
                        update(MaterialObservation)
                        .where(
                            MaterialObservation.year == entry["year"], MaterialObservation.active
                        )
                        .values(active=False)
                    )
                accepted = 0
                rejected = 0
                counts = Counter()
                session.add(
                    QualityIssue(
                        import_run_id=run.id,
                        code="material_cross_year_unverified",
                        severity="warning",
                        description="Kontinuitet nazivnika i obuhvata materijala među godinama nije potvrđen. Nema pretvorbe u tone ni zbrajanja kategorija.",
                        details={"scope": proof["scope"], "pdf_sha256": proof["pdf_sha256"]},
                    )
                )
                for row in rows:
                    mid = row.get("municipality_id")
                    errors = list(row["issues"])
                    if mid not in main:
                        errors.append("Materijalna JLS nema aktivni glavni zapis iste godine.")
                    if errors:
                        rejected += 1
                        session.add(
                            QualityIssue(
                                import_run_id=run.id,
                                source_row=row["source_row"],
                                code="material_row_quarantined",
                                severity="error",
                                description="; ".join(errors),
                                details={"raw_values": row["raw_values"]},
                            )
                        )
                        continue
                    accepted += 1
                    evidence = proof["records"].get(str(mid), {})
                    for material, value in row["values"].items():
                        control = evidence.get("categories", {}).get(material, {})
                        status = control.get("status", "not_verified")
                        if evidence.get("source_row") != row["source_row"]:
                            status = "source_row_not_verified"
                        counts[status] += 1
                        session.add(
                            MaterialObservation(
                                municipality_id=mid,
                                source_id=source.id,
                                import_run_id=run.id,
                                year=entry["year"],
                                source_row=row["source_row"],
                                material=material,
                                published_kg_per_person=value,
                                raw_values=row["raw_values"],
                                scope=proof["scope"],
                                denominator_status=status,
                                evidence={
                                    **control,
                                    "pdf_page": evidence.get("pdf_page"),
                                    "pdf_sha256": proof["pdf_sha256"],
                                    "audit_version": "material-audit-1",
                                },
                                active=True,
                            )
                        )
                report = {
                    "source_rows": len(rows),
                    "accepted_rows": accepted,
                    "rejected_rows": rejected,
                    "material_observations": accepted * 7,
                    "denominator_counts": dict(counts),
                }
                session.flush()
                run.accepted_rows = accepted
                run.rejected_rows = rejected
                run.report = report
                run.status = "completed"
                run.finished_at = datetime.now(timezone.utc)
        except Exception as exc:
            failure = exc
            run.status = "failed"
            run.report = {"error_type": type(exc).__name__, "error": str(exc)}
            run.finished_at = datetime.now(timezone.utc)
    if failure:
        raise ValueError(f"Materijalni uvoz nije uspio, run={run_id}: {failure}") from failure
    return {"year": entry["year"], "status": "completed", **report}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--activate-revision", action="store_true")
    args = parser.parse_args()
    results = []
    for entry, config, proof, rows in load_material_sources(get_settings().data_dir):
        if args.dry_run:
            results.append(
                {
                    "year": entry["year"],
                    "rows": len(rows),
                    "rejected_rows": sum(bool(r["issues"]) for r in rows),
                    "proof_counts": proof["counts"],
                }
            )
        else:
            results.append(
                import_material_source(
                    get_engine(), entry, config, proof, rows, args.activate_revision
                )
            )
    print(json.dumps(results, default=json_default, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
