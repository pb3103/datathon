"""Read-only eight-year semantic audit; anomalies are review candidates, not causal claims."""

import json
from collections import Counter, defaultdict
from decimal import Decimal, localcontext
from backend.app.config import get_settings
from pipeline.extract import load_sources, ROOT
from pipeline.historical import load_historical


def report():
    data = get_settings().data_dir
    all_sources = load_historical(data) + load_sources(
        data, ROOT / "data/manifests/source_files.json"
    )
    identities = None
    years = []
    history = defaultdict(list)
    anomalies = []
    for entry, rows in all_sources:
        ids = {str(r.municipality_id) for r in rows if not r.rejected}
        if identities is None:
            identities = ids
        if len(rows) != 556 or len(ids) != 556 or ids != identities:
            raise ValueError("Nepotpuni, duplicirani ili nepovezani JLS identiteti.")
        totals = {"total_t": Decimal(0), "mixed_t": Decimal(0)}
        for row in rows:
            t, m, p = row.total_t, row.mixed_t, row.covered_population
            if (
                row.rejected
                or t is None
                or m is None
                or t < 0
                or not 0 <= m <= t
                or p is None
                or p <= 0
            ):
                raise ValueError("Nevaljan osnovni ulaz.")
            totals["total_t"] += t
            totals["mixed_t"] += m
            with localcontext() as ctx:
                ctx.prec = 40
                kg = 1000 * t / p if row.population_usable else None
                sample = {
                    "year": entry["year"],
                    "name": row.name,
                    "county": row.county,
                    "source_row": row.source_row,
                    "total_t": t,
                    "mixed_t": m,
                    "covered_population": p,
                    "calculated_kg": kg,
                    "published_kg": row.published_kg_per_capita,
                    "published_rate": row.published_separate_collection_pct,
                    "control_nonmixed_pct": 100 * (t - m) / t if t > 0 else None,
                }
                history[str(row.municipality_id)].append(sample)
                if kg is not None and kg > 1000:
                    anomalies.append(
                        {
                            **sample,
                            "kind": "high_kg_per_covered_person",
                            "interpretation": "Vrijednost potvrđena ili očuvana prema izvoru; uzrok nije utvrđen, nije automatski greška niti dokaz turističkog učinka.",
                        }
                    )
        years.append(
            {
                "year": entry["year"],
                "source_rows": len(rows),
                "accepted": sum(not r.rejected for r in rows),
                "unique_ids": len(ids),
                "published_rate_count": sum(
                    r.published_separate_collection_pct is not None for r in rows
                ),
                "population_unusable": sum(not r.population_usable for r in rows),
                "pdf_corrections": sum(
                    any(i.code == "pdf_verified_correction" for i in r.issues) for r in rows
                ),
                "issues": dict(Counter(i.code for r in rows for i in r.issues)),
                "jls_sums_not_national_totals": totals,
            }
        )
    for mid, observations in history.items():
        observations.sort(key=lambda o: o["year"])
        for old, new in zip(observations, observations[1:]):
            for key in ("published_rate", "control_nonmixed_pct"):
                if old[key] is not None and new[key] is not None and abs(new[key] - old[key]) >= 15:
                    anomalies.append(
                        {
                            "kind": "published_rate_change_pp"
                            if key == "published_rate"
                            else "diagnostic_ratio_change_pp",
                            "municipality_id": mid,
                            "name": new["name"],
                            "county": new["county"],
                            "from_year": old["year"],
                            "to_year": new["year"],
                            "from_value": old[key],
                            "to_value": new[key],
                            "difference_pp": new[key] - old[key],
                            "interpretation": "Opisna razlika u postotnim bodovima; obuhvat i metodološka usporedivost nisu potvrđeni. Kontrolni omjer nije zamjena za službenu stopu.",
                        }
                    )
            for key in ("total_t", "mixed_t", "covered_population", "calculated_kg"):
                if old[key] is not None and old[key] > 0 and new[key] is not None:
                    with localcontext() as ctx:
                        ctx.prec = 40
                        relative = 100 * (new[key] - old[key]) / old[key]
                    threshold = 25 if key == "covered_population" else 100
                    if abs(relative) > threshold:
                        anomalies.append(
                            {
                                "kind": "adjacent_year_review",
                                "municipality_id": mid,
                                "name": new["name"],
                                "county": new["county"],
                                "metric": key,
                                "from_year": old["year"],
                                "to_year": new["year"],
                                "from_value": old[key],
                                "to_value": new[key],
                                "relative_pct": relative,
                                "interpretation": "Nerazjašnjena promjena ili metodološki prekid; nema uzročnog zaključka i nije potvrđen trend poboljšanja/pogoršanja.",
                            }
                        )
    return {
        "period": "2017–2024",
        "examples": {
            mid: observations
            for mid, observations in history.items()
            if observations[0]["name"].casefold()
            in (
                "bjelovar",
                "samobor",
                "novigrad",
                "novigrad - cittanova",
                "novigrad podravski",
                "otok",
                "privlaka",
                "sveta nedelja",
            )
        },
        "years": years,
        "anomalies": anomalies,
        "anomaly_counts": dict(Counter(a["kind"] for a in anomalies)),
        "comparability": "Povijesni obuhvati razlikuju se po izvješćima; sve godine ostaju provisional. Omjeri T−M iz 2017.–2020. nisu službene stope. Sedam materijalnih kategorija dostupno je samo 2021.–2024. Simulator ostaje 2023./2024.",
        "identity_note": "556 istih internih identiteta svake godine; službeni povijesni registar/granice i vrsta JLS nisu neovisno pribavljeni.",
    }


if __name__ == "__main__":
    print(json.dumps(report(), ensure_ascii=False, indent=2, default=str))
