"""Deterministic mass-balance scenarios; no policy-effect or recovery forecasts."""

from decimal import Decimal, localcontext

D = Decimal
MODEL_VERSION = "public-service-mass-balance-v1"


def simulate(total, mixed, model, kind, value, population=None):
    with localcontext() as ctx:
        ctx.prec = 40
        if not all(x.is_finite() for x in (total, mixed, value)):
            raise ValueError("Vrijednosti moraju biti konačne.")
        if total <= 0 or not 0 <= mixed <= total:
            raise ValueError("Potrebno je T > 0 i 0 ≤ M ≤ T.")
        if model not in ("diversion", "prevention") or kind not in ("fraction", "tonnes", "target"):
            raise ValueError("Nepoznat model ili način unosa.")
        separate = total - mixed
        rate = 100 * separate / total
        reached = False
        if kind == "fraction":
            if not 0 <= value <= 1:
                raise ValueError("Udio mora biti između 0 i 1.")
            change = value * mixed
        elif kind == "tonnes":
            change = value
        else:
            if not 0 <= value <= 100:
                raise ValueError("Cilj mora biti između 0 i 100 %.")
            reached = value <= rate
            if reached:
                change = D(0)
            elif model == "diversion":
                change = total * value / 100 - separate
            elif separate == 0:
                raise ValueError(
                    "Prevencija ne može povećati stopu bez početnog odvojeno sakupljenog toka."
                )
            else:
                change = total - 100 * separate / value
        if not 0 <= change <= mixed:
            raise ValueError("Promjena mora biti između 0 i početne mase miješanog otpada.")
        new_t = total if model == "diversion" else total - change
        new_m = mixed - change
        new_s = separate + change if model == "diversion" else separate

        def state(t, m, s):
            result = {
                "total_t": t,
                "mixed_t": m,
                "separate_t": s,
                "rate_pct": 100 * s / t if t > 0 else None,
            }
            for key, mass in (("total", t), ("mixed", m), ("separate", s)):
                result[key + "_kg_per_person"] = 1000 * mass / population if population else None
            return result

        initial, result = state(total, mixed, separate), state(new_t, new_m, new_s)
        return {
            "initial": initial,
            "result": result,
            "difference": {
                k: result[k] - v if v is not None and result[k] is not None else None
                for k, v in initial.items()
            },
            "change_t": change,
            "already_reached": reached,
            "mixed_reduction_pct": 100 * change / mixed if mixed else D(0),
        }
