"""Read-only audit of every original JLS row used by the Simulator."""

import hashlib
import json
from decimal import localcontext
from types import SimpleNamespace
from backend.app.config import get_settings
from backend.app.simulation_quality import eligibility, MANIFEST, CONFIG, EVIDENCE
from pipeline.extract import ROOT, load_sources


def report():
    checksums = [
        {
            "path": e["path"],
            "unchanged": hashlib.sha256((ROOT / e["path"]).read_bytes()).hexdigest() == e["sha256"],
        }
        for e in MANIFEST
    ]
    if not all(c["unchanged"] for c in checksums):
        raise ValueError("Izvorna datoteka ne odgovara manifestu.")
    years = []
    for entry, rows in load_sources(
        get_settings().data_dir, ROOT / "data/manifests/source_files.json"
    ):
        if entry["year"] not in (2023, 2024):
            continue
        values = []
        config = CONFIG[str(entry["year"])]
        for row in rows:
            obs = SimpleNamespace(
                year=entry["year"],
                scope="public_service",
                total_t=row.total_t,
                mixed_t=row.mixed_t,
                published_separate_collection_pct=row.published_separate_collection_pct,
            )
            source = SimpleNamespace(scope="public_service", sha256=entry["sha256"])
            reasons = eligibility(obs, source)
            with localcontext() as ctx:
                ctx.prec = 40
                t, m, g = row.total_t, row.mixed_t, row.published_separate_collection_pct
                derived = 100 * (t - m) / t if t and m is not None else None
                values.append(
                    {
                        "name": row.name,
                        "row": row.source_row,
                        "total_t": t,
                        "mixed_t": m,
                        "published_rate_pct": g,
                        "calculated_rate_pct": derived,
                        "difference_pp": derived - g
                        if derived is not None and g is not None
                        else None,
                        "eligible": not reasons,
                        "reasons": reasons,
                        "population_usable": row.population_usable,
                    }
                )
        years.append(
            {
                "year": entry["year"],
                "source_sha256": entry["sha256"],
                "rows": len(values),
                "eligible": sum(v["eligible"] for v in values),
                "excluded": sum(not v["eligible"] for v in values),
                "mass_half_t": config["mass_half"],
                "rate_half_pp": config["rate_half"],
                "max_abs_difference_pp": max(
                    abs(v["difference_pp"]) for v in values if v["difference_pp"] is not None
                ),
                "records": values,
            }
        )
    return {
        "model": "public-service-mass-balance-v1",
        "evidence": EVIDENCE,
        "rounding_assumption": "Intervali preciznosti objavljenih masa i stope; pretpostavka najbližeg zaokruživanja, ne dodatna potvrda pravila izdavača.",
        "checksums": checksums,
        "years": years,
    }


if __name__ == "__main__":
    print(json.dumps(report(), ensure_ascii=False, indent=2, default=str))
