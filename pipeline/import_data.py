"""python -m pipeline.import_data [--dry-run] [--activate-revision]."""

from __future__ import annotations
import argparse
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
    Municipality,
    MunicipalityAlias,
    QualityIssue,
    SourceDataset,
    WasteObservation,
)
from pipeline.extract import MAPS, PARSER_VERSION, ROOT, json_default, load_sources, normalize_name

# These reference aggregates are audit findings, not replacement values for JLS.
# Only attach them to the exact audited file checksum, never to future revisions.
AUDITED_CHECKSUMS = {
    "2023": "df0950bb499be23f75183b96e545ca583b691b230dda78c8722e5701a42d3761",
    "2024": "11c98568f49d18f4a6592e3a1f1efdfdc81fabb31e2d3fdc8ad9ab8d07ed4f72",
}
AGGREGATE_FINDINGS = {
    "2023": {
        "pdf_total_t": "1291424",
        "pdf_mixed_t": "912465",
        "pdf_table": "9",
        "pdf_pages": "30–31",
    },
    "2024": {
        "pdf_total_t": "1352204",
        "pdf_mixed_t": "914636",
        "pdf_table": "11",
        "pdf_pages": "37",
    },
}


def summary(entry, rows, parser_version=PARSER_VERSION):
    return {
        "year": entry["year"],
        "sha256": entry["sha256"],
        "parser_version": parser_version,
        "source_rows": len(rows),
        "accepted_rows": sum(not r.rejected for r in rows),
        "rejected_rows": sum(r.rejected for r in rows),
        "issues": dict(Counter(i.code for r in rows for i in r.issues)),
        "total_t": str(
            sum((r.total_t for r in rows if not r.rejected and r.total_t is not None), Decimal(0))
        ),
        "mixed_t": str(
            sum((r.mixed_t for r in rows if not r.rejected and r.mixed_t is not None), Decimal(0))
        ),
    }


def import_source(
    engine, entry, rows, *, activate_revision=False, config=None, parser_version=PARSER_VERSION
):
    config = config or MAPS[str(entry["year"])]
    report = summary(entry, rows, parser_version)
    with Session(engine) as session, session.begin():
        # Serialize dataset activation and ID/alias creation across concurrent imports.
        session.execute(text("SELECT pg_advisory_xact_lock(8703292026)"))
        source = session.scalar(
            select(SourceDataset).where(
                SourceDataset.sha256 == entry["sha256"], SourceDataset.sheet == config["sheet"]
            )
        )
        if source is not None:
            complete = session.scalar(
                select(ImportRun).where(
                    ImportRun.source_id == source.id, ImportRun.status == "completed"
                )
            )
            if complete is not None:
                if complete.parser_version != parser_version:
                    raise ValueError(
                        "Isti izvor već je uvezen drugim parserom; potrebna izričita migracija podataka."
                    )
                return {
                    "year": entry["year"],
                    "status": "skipped",
                    "reason": "checksum_already_imported",
                    "import_run_id": str(complete.id),
                    **complete.report,
                }
        if source is None:
            source = SourceDataset(
                title=Path(entry["path"]).name,
                path=entry["path"],
                sha256=entry["sha256"],
                year=entry["year"],
                sheet=config["sheet"],
                scope=config["scope"],
                methodology_group=config["methodology_group"],
                methodology_verified=False,
                publisher=entry.get("publisher"),
                catalog_url=entry.get("catalog_url"),
                resource_url=entry.get("resource_url"),
                license=entry.get("license"),
                downloaded_at=entry.get("downloaded_at"),
            )
            session.add(source)
            session.flush()
        run = ImportRun(
            source_id=source.id,
            parser_version=parser_version,
            started_at=datetime.now(timezone.utc),
            status="running",
            report=report,
        )
        session.add(run)
        session.flush()
        failure = None
        try:
            with session.begin_nested():
                old_source_ids = set(
                    session.scalars(
                        select(WasteObservation.source_id).where(
                            WasteObservation.year == entry["year"],
                            WasteObservation.scope == config["scope"],
                            WasteObservation.active,
                        )
                    ).all()
                )
                if old_source_ids and old_source_ids != {source.id}:
                    if not activate_revision:
                        raise ValueError(
                            "Postoji aktivna druga revizija godine. Pregledajte izvor pa koristite --activate-revision."
                        )
                    active_ids = set(
                        session.scalars(
                            select(WasteObservation.municipality_id).where(
                                WasteObservation.year == entry["year"],
                                WasteObservation.scope == config["scope"],
                                WasteObservation.active,
                            )
                        )
                    )
                    replacement_ids = {r.municipality_id for r in rows if not r.rejected}
                    if active_ids != replacement_ids:
                        raise ValueError(
                            "Revizija mijenja skup JLS; potrebno je zasebno pregledano usklađenje obuhvata."
                        )
                    if any(r.rejected for r in rows):
                        raise ValueError(
                            "Nova revizija s odbijenim retcima ne može zamijeniti aktivni skup."
                        )
                    session.execute(
                        update(WasteObservation)
                        .where(
                            WasteObservation.year == entry["year"],
                            WasteObservation.scope == config["scope"],
                            WasteObservation.active,
                        )
                        .values(active=False)
                    )
                for note in config.get("source_issues", []):
                    session.add(QualityIssue(import_run_id=run.id, **note))
                year = str(entry["year"])
                if entry["sha256"] == AUDITED_CHECKSUMS.get(year):
                    session.add(
                        QualityIssue(
                            import_run_id=run.id,
                            code="source_aggregate_mismatch",
                            severity="warning",
                            description="Zbroj XLSX-a i PDF agregata nije usklađen; ne proglašavati zbroj provjerenom nacionalnom vrijednosti.",
                            details={
                                **AGGREGATE_FINDINGS[year],
                                "xlsx_total_t": report["total_t"],
                                "xlsx_mixed_t": report["mixed_t"],
                            },
                        )
                    )
                for row in rows:
                    observation = None
                    if not row.rejected:
                        municipality = session.get(Municipality, row.municipality_id)
                        if municipality is None:
                            municipality = Municipality(
                                id=row.municipality_id,
                                name=row.name,
                                county=row.county,
                                normalized_name=normalize_name(row.name),
                                normalized_county=normalize_name(row.county),
                            )
                            session.add(municipality)
                            session.flush()
                        session.add(
                            MunicipalityAlias(
                                municipality_id=municipality.id,
                                source_id=source.id,
                                source_name=row.raw_values["B"]["value"],
                                source_county=row.raw_values["A"]["value"],
                                resolution=row.alias_reason,
                            )
                        )
                        observation = WasteObservation(
                            municipality_id=municipality.id,
                            source_id=source.id,
                            import_run_id=run.id,
                            year=entry["year"],
                            source_row=row.source_row,
                            scope=config["scope"],
                            total_t=row.total_t,
                            mixed_t=row.mixed_t,
                            covered_population=row.covered_population,
                            published_kg_per_capita=row.published_kg_per_capita,
                            published_separate_collection_pct=row.published_separate_collection_pct,
                            raw_values=row.raw_values,
                            methodology_group=config["methodology_group"],
                            quality_status="review_required" if row.issues else "valid",
                            population_usable=row.population_usable,
                            active=True,
                        )
                        session.add(observation)
                        session.flush()
                    for issue in row.issues:
                        session.add(
                            QualityIssue(
                                import_run_id=run.id,
                                observation_id=observation.id if observation else None,
                                source_row=row.source_row,
                                code=issue.code,
                                severity=issue.severity,
                                description=issue.description,
                                details={
                                    **issue.details,
                                    **({"raw_values": row.raw_values} if row.rejected else {}),
                                },
                            )
                        )
                session.flush()
                run.accepted_rows = report["accepted_rows"]
                run.rejected_rows = report["rejected_rows"]
                run.status = "completed"
                run.finished_at = datetime.now(timezone.utc)
        except Exception as exc:
            failure = exc
            run.status = "failed"
            run.finished_at = datetime.now(timezone.utc)
            run.report = {**report, "error_type": type(exc).__name__, "error": str(exc)}
        result = {
            "year": entry["year"],
            "status": run.status,
            "import_run_id": str(run.id),
            **run.report,
        }
    if failure is not None:
        raise ValueError(
            f"Uvoz nije uspio; import_run={result['import_run_id']}: {failure}"
        ) from failure
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Čita izvore, piše staging/izvještaj, ne spaja se na bazu.",
    )
    parser.add_argument(
        "--activate-revision",
        action="store_true",
        help="Nakon pregleda zamijeni aktivnu reviziju i sačuvaj povijest.",
    )
    parser.add_argument("--output", type=Path, default=ROOT / "data/staging")
    args = parser.parse_args()
    sources = load_sources(get_settings().data_dir, ROOT / "data/manifests/source_files.json")
    args.output.mkdir(parents=True, exist_ok=True)
    results = []
    for entry, rows in sources:
        (args.output / f"{entry['year']}.json").write_text(
            json.dumps(
                {"source": entry, "rows": rows}, default=json_default, ensure_ascii=False, indent=2
            )
            + "\n"
        )
        results.append(
            {**summary(entry, rows), "status": "dry_run"}
            if args.dry_run
            else import_source(get_engine(), entry, rows, activate_revision=args.activate_revision)
        )
    (args.output / "import_report.json").write_text(
        json.dumps(results, ensure_ascii=False, indent=2) + "\n"
    )
    print(json.dumps(results, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
