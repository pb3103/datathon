"""Read-only reconstruction audit; arithmetic agreement is not methodological certification."""

import json
from decimal import Decimal, localcontext
from backend.app.config import get_settings
from pipeline.extract import ROOT, load_sources

D = Decimal
CONFIG = json.loads((ROOT / "pipeline/config/year_maps.json").read_text())


def calculate_rate(total, mixed):
    if total is None or mixed is None or not total.is_finite() or not mixed.is_finite():
        return None
    if total <= 0 or mixed < 0 or mixed > total:
        return None
    with localcontext() as ctx:
        ctx.prec = 40
        return 100 * (total - mixed) / total


def matches_precision(total, mixed, published, mass_half, rate_half):
    if calculate_rate(total, mixed) is None or published is None or not published.is_finite():
        return False
    if not 0 <= published <= 100 or total <= mass_half:
        return False
    with localcontext() as ctx:
        ctx.prec = 40
        # Same declared source precision intervals as existing mass-balance validation.
        low = max(D(0), 100 * (1 - (mixed + mass_half) / (total - mass_half)))
        high = min(D(100), 100 * (1 - (mixed - mass_half) / (total + mass_half)))
        return low - rate_half - D("1e-8") <= published <= high + rate_half + D("1e-8")


def report():
    years = []
    for entry, rows in load_sources(
        get_settings().data_dir, ROOT / "data/manifests/source_files.json"
    ):
        config = CONFIG[str(entry["year"])]
        values = []
        for row in rows:
            calculated = calculate_rate(row.total_t, row.mixed_t)
            published = row.published_separate_collection_pct
            with localcontext() as ctx:
                ctx.prec = 40
                difference = (
                    calculated - published
                    if calculated is not None and published is not None
                    else None
                )
            values.append(
                {
                    "name": row.name,
                    "county": row.county,
                    "source_row": row.source_row,
                    "total_t": row.total_t,
                    "mixed_t": row.mixed_t,
                    "published_rate_pct": published,
                    "calculated_rate_pct": calculated,
                    "difference_pp": difference,
                    "matches_source_precision": matches_precision(
                        row.total_t,
                        row.mixed_t,
                        published,
                        D(config["mass_half"]),
                        D(config["rate_half"]),
                    ),
                }
            )
        compared = [v for v in values if v["difference_pp"] is not None]
        with localcontext() as ctx:
            ctx.prec = 40
            mae = (
                sum(v["difference_pp"].copy_abs() for v in compared) / len(compared)
                if compared
                else None
            )
            mean = sum(v["difference_pp"] for v in compared) / len(compared) if compared else None
        years.append(
            {
                "year": entry["year"],
                "source_sha256": entry["sha256"],
                "rows": len(values),
                "compared": len(compared),
                "matched": sum(v["matches_source_precision"] for v in compared),
                "unmatched": sum(not v["matches_source_precision"] for v in compared),
                "mass_half_t": config["mass_half"],
                "rate_half_pp": config["rate_half"],
                "mean_abs_difference_pp": mae,
                "mean_signed_difference_pp": mean,
                "max_abs_difference_pp": max(v["difference_pp"].copy_abs() for v in compared),
                "largest_deviations": sorted(
                    compared, key=lambda v: (-v["difference_pp"].copy_abs(), v["county"], v["name"])
                )[:10],
                "records": values,
            }
        )
    return {
        "formula": "100*(T-M)/T",
        "unit_for_differences": "postotni bodovi",
        "rounding_note": "Intervali preciznosti mase i objavljene stope iz postojećeg year_maps.json; nije neovisna potvrda izdavačeva algoritma zaokruživanja.",
        "interpretation": "Aritmetička podudarnost ne potvrđuje istovjetnost obuhvata, pravnu definiciju niti međugodišnju usporedivost.",
        "historical_decision": {
            "new_rates_by_year": {"2017": 0, "2018": 0, "2019": 0, "2020": 0},
            "reason": "Nije potvrđena ekvivalentnost povijesnog omjera s današnjom objavljenom stopom. Postojeći kontrolni omjer ostaje zaseban pokazatelj, bez zamjene objavljenih stopa.",
            "2020_note": "Tablica 89 (PDF str. 104–113) navodi isti organizacijski obuhvat T i M; str. 31 opisuje široki udio svih vrsta osim MKO. To podupire izračun širokog udjela, ali ne potvrđuje istovjetnost svim drugim definicijama stope niti povezani trend 2017.–2024.",
        },
        "years": years,
    }


if __name__ == "__main__":
    print(json.dumps(report(), ensure_ascii=False, indent=2, default=str))
