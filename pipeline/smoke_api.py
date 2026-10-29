"""Read-only HTTP smoke check against a running API; no TestClient or mock DB."""

import argparse
import json
from decimal import Decimal
from urllib.request import urlopen


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default="http://localhost:8000")
    args = parser.parse_args()
    base = args.base_url.rstrip("/") + "/api/v1"

    def get(path):
        with urlopen(base + path, timeout=10) as response:
            return json.load(response)

    assert get("/health/live")["status"] == "ok"
    ready = get("/health/ready")
    assert ready["data"]["status"] == "loaded", ready
    search = get("/municipalities?q=Bjelovar")
    assert search["total"] == 1, search
    municipality = search["items"][0]
    mid = municipality["id"]
    years = get(f"/municipalities/{mid}/years")["years"]
    assert [r["year"] for r in years] == [2021, 2022, 2023, 2024]
    observations = get(f"/municipalities/{mid}/observations")["observations"]
    assert len(observations) == 4
    assert Decimal(observations[1]["metrics"]["separate_collection_pct"]["value"]) == 16
    assert observations[1]["raw_values"]["G"]["value"] == "0.16"
    assert all(not r["target_rate_available"] for r in observations)
    sources = get("/sources")
    assert sources["total"] == 4
    print(
        json.dumps(
            {
                "status": "passed",
                "municipality": municipality,
                "years": [r["year"] for r in observations],
                "observations": [
                    {
                        "year": r["year"],
                        "total_t": r["metrics"]["total_t"]["value"],
                        "separate_collection_pct": r["metrics"]["separate_collection_pct"]["value"],
                        "source_row": r["source_row"],
                    }
                    for r in observations
                ],
                "rows_by_year": ready["data"]["active_rows_by_year"],
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
