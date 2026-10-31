"""Live all-row API parity audit: Explorer vs Compare and independent mass/unit checks."""

import argparse
import json
import sys
from concurrent.futures import ThreadPoolExecutor
from decimal import Decimal, localcontext
from urllib.request import urlopen
from urllib.parse import urlencode


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default="http://api:8000")
    args = parser.parse_args()
    base = args.base_url.rstrip("/") + "/api/v1"

    def get(path):
        with urlopen(base + path, timeout=60) as r:
            return json.load(r)

    municipalities = []
    for page in range(1, 7):
        municipalities += get(f"/municipalities?page={page}&page_size=100")["items"]
    if len(municipalities) != 556:
        raise ValueError("Unexpected JLS count")
    ids = [m["id"] for m in municipalities]
    profiles = {}
    checked = 0
    published_rates = 0
    historical_diagnostics = 0

    def profile(mid):
        return mid, get(f"/municipalities/{mid}/observations")["observations"]

    with ThreadPoolExecutor(max_workers=4) as pool:
        for mid, observations in pool.map(profile, ids):
            if [o["year"] for o in observations] != list(range(2017, 2025)):
                raise ValueError(("Incomplete profile", mid))
            profiles[mid] = {o["year"]: o for o in observations}
            for o in observations:
                m = o["metrics"]
                t = Decimal(m["total_t"]["value"])
                mixed = Decimal(m["mixed_t"]["value"])
                p = m["covered_population"]["value"]
                if t <= 0 or not 0 <= mixed <= t:
                    raise ValueError("Invalid masses")
                for key, mass in [
                    ("total_kg_per_covered_person", t),
                    ("mixed_kg_per_covered_person", mixed),
                ]:
                    if o["population_usable"]:
                        with localcontext() as ctx:
                            ctx.prec = 40
                            expected = 1000 * mass / Decimal(p)
                        if abs(Decimal(m[key]["value"]) - expected) > Decimal("1e-9"):
                            raise ValueError(("Unit formula mismatch", mid, o["year"], key))
                    elif m[key]["value"] is not None:
                        raise ValueError("Unusable population produced kg")
                if o["year"] < 2021:
                    if m["separate_collection_pct"]["value"] is not None:
                        raise ValueError("Calculated rate presented as official")
                    with localcontext() as ctx:
                        ctx.prec = 40
                        ratio = 100 * (t - mixed) / t
                    if abs(Decimal(m["calculated_nonmixed_share_pct"]["value"]) - ratio) > Decimal(
                        "1e-9"
                    ):
                        raise ValueError("Wrong calculated historical share")
                    historical_diagnostics += int(
                        m["calculated_nonmixed_share_pct"]["value"] is not None
                    )
                else:
                    published_rates += int(m["separate_collection_pct"]["value"] is not None)
                if o["year"] < 2023 and o["target_rate_available"]:
                    raise ValueError("Simulator widened")
                checked += 1
            if len(profiles) % 100 == 0:
                print(f"Profiles checked: {len(profiles)}", file=sys.stderr, flush=True)
    groups = [ids[i : i + 5] for i in range(0, len(ids), 5)]
    if len(groups[-1]) == 1:
        groups[-1] = [ids[-2], ids[-1]]

    def compare(group):
        query = urlencode([("ids", i) for i in group] + [("year", 2024), ("baseline_id", group[0])])
        return get("/comparisons?" + query)

    parity = set()
    cells = 0
    keys = [
        "calculated_nonmixed_share_pct",
        "total_t",
        "mixed_t",
        "total_kg_per_covered_person",
        "mixed_kg_per_covered_person",
        "published_kg_per_covered_person",
        "separate_collection_pct",
    ]
    with ThreadPoolExecutor(max_workers=4) as pool:
        for comparison in pool.map(compare, groups):
            for member in comparison["members"]:
                mid = member["municipality"]["id"]
                for year, o in profiles[mid].items():
                    for key in keys:
                        own = member["history_metrics"][str(year)][key]
                        other = o["metrics"][key]
                        if (
                            own["value"] != other["value"]
                            or own["quality_status"] != other["quality_status"]
                        ):
                            raise ValueError(("Explorer/Compare mismatch", mid, year, key))
                        cells += 1
                    parity.add((mid, year))
    print(
        json.dumps(
            {
                "status": "passed",
                "years": list(range(2017, 2025)),
                "municipalities": len(ids),
                "observations_checked": checked,
                "explorer_compare_pairs": len(parity),
                "metric_cells_checked_including_overlap": cells,
                "historical_control_ratios_not_official": historical_diagnostics,
                "published_rates": published_rates,
                "tolerance_for_decimal_serialization": "1e-9",
                "checks": [
                    "T>=M>=0",
                    "1000*mass/P",
                    "unusable denominator stays null",
                    "historical official rates null",
                    "historical diagnostic ratio",
                    "Simulator only eligible 2023/2024",
                    "Explorer/Compare same-year values and quality flags",
                ],
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
