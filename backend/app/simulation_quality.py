"""Narrow within-year mass-balance verification; not cross-year certification."""

from decimal import Decimal, localcontext
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[2]
CONFIG = json.loads((ROOT / "pipeline/config/year_maps.json").read_text())
MANIFEST = json.loads((ROOT / "data/manifests/source_files.json").read_text())
METHOD = json.loads((ROOT / "data/manifests/simulator_methodology.json").read_text())
EVIDENCE = "Izvješće o komunalnom otpadu za 2024., str. 20 i 37, Tablica 11; potvrda javne usluge za 2023. i 2024."


def eligibility(obs, source):
    reasons = []
    if (
        obs.year not in METHOD["verified_years"]
        or obs.scope != "public_service"
        or source.scope != obs.scope
    ):
        reasons.append("Metodologija ovog modela potvrđena je samo za javnu uslugu 2023. i 2024.")
    if METHOD["xlsx_sha256_by_year"].get(str(obs.year)) != source.sha256:
        reasons.append("Revizija izvora nije obuhvaćena metodološkom provjerom.")
    t, m, g = obs.total_t, obs.mixed_t, obs.published_separate_collection_pct
    if t is None or m is None or t <= 0 or not 0 <= m <= t or g is None or not 0 <= g <= 100:
        reasons.append("Nedostaju valjane mase ili objavljena stopa.")
    elif str(obs.year) in CONFIG:
        with localcontext() as ctx:
            ctx.prec = 40
            c = CONFIG[str(obs.year)]
            h, gh, eps = Decimal(c["mass_half"]), Decimal(c["rate_half"]), Decimal("0.00000001")
            if t <= h:
                reasons.append("Ukupna masa premala je za pouzdanu kontrolu zaokruživanja.")
            else:
                lo = 100 * (1 - (m + h) / (t - h)) - gh - eps
                hi = 100 * (1 - (m - h) / (t + h)) + gh + eps
                if not lo <= g <= hi:
                    reasons.append("Objavljena stopa ne odgovara masama unutar preciznosti izvora.")
    return reasons
