"""Broad non-mixed share, never a published separate-collection rate."""

import json
from decimal import localcontext
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCES = json.loads((ROOT / "data/manifests/historical_sources.json").read_text())
HASHES = {e["year"]: e["sha256"] for e in SOURCES if e["path"].endswith(".csv")}


def historical_share(year, scope, checksum, total, mixed):
    if year not in (2017, 2018, 2019, 2020):
        return None, "historical_share_not_applicable"
    if scope != f"historical_collection_{year}" or checksum != HASHES[year]:
        return None, "historical_share_source_not_verified"
    if total is None or mixed is None or not total.is_finite() or not mixed.is_finite():
        return None, "missing_or_invalid_mass"
    if total <= 0 or mixed < 0 or mixed > total:
        return None, "missing_or_invalid_mass"
    with localcontext() as ctx:
        ctx.prec = 40
        return 100 * (total - mixed) / total, None
