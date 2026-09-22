"""Verdict, scenarios, and break-even — §6.5 of the build spec."""

from __future__ import annotations

from datetime import date, timedelta

import numpy as np

from .config import p
from .evidence import sample_s
from .forecast_upi import ForecastResult
from .simulate import (
    SimulationResult,
    expand_obligations,
    expand_orders,
    simulate,
)
from .schemas import Obligation, Order


def compute_verdict(sim: SimulationResult) -> dict:
    """Compute P(safe), n, and label."""
    ps = sim.p_safe()
    n = round(100 * ps)
    safe_thr = p("verdict_safe_threshold")
    risky_thr = p("verdict_risky_threshold")
    if n >= safe_thr:
        label = "safe"
    elif n >= risky_thr:
        label = "risky"
    else:
        label = "short"
    return {"p_safe": round(ps, 4), "n": n, "label": label}


def compute_scenarios(
    forecast: ForecastResult,
    posterior: np.ndarray,
    bank0: float,
    drawer0: float,
    obligations: list[Obligation],
    orders: list[Order],
    credit_days: int,
    floor: float,
    rng_seed: int,
) -> dict:
    """Compute three scenario P(safe) values per §6.5."""
    N = p("monte_carlo_n")
    as_of = forecast.dates[0] - timedelta(days=1)

    # --- Likely (normal run) ---
    rng = np.random.default_rng(rng_seed)
    sim_likely = simulate(
        forecast, posterior, bank0, drawer0,
        obligations, orders, credit_days, floor, rng, as_of
    )
    n_likely = round(100 * sim_likely.p_safe())

    # --- None (C=0) ---
    rng = np.random.default_rng(rng_seed)
    sim_none = simulate(
        forecast, posterior, bank0, drawer0,
        obligations, orders, credit_days, floor, rng, as_of
    )
    # Override: set cash to 0 and recompute liquidity
    H = len(forecast.dates)
    L0 = bank0 + drawer0
    obl_out = expand_obligations(obligations, as_of, H)
    ord_out = expand_orders(orders, as_of, credit_days, H)
    total_out = obl_out + ord_out
    liquid_none = np.zeros_like(sim_none.liquid)
    for t in range(H):
        prev = L0 if t == 0 else liquid_none[:, t - 1]
        liquid_none[:, t] = prev + sim_none.upi_draws[:, t] + 0 - total_out[t]
    safe_none = np.min(liquid_none, axis=1) >= floor
    n_none = round(100 * float(np.mean(safe_none)))

    # --- High cash (s_i <= posterior p10) ---
    from .evidence import GRID, _percentile_from_cdf
    s_p10 = _percentile_from_cdf(GRID, posterior, 0.10)
    rng_high = np.random.default_rng(rng_seed)
    s_all = sample_s(posterior, N, rng_high)
    # Keep only draws with low s (high cash)
    mask = s_all <= s_p10
    if mask.sum() < 100:
        # Resample from truncated posterior
        trunc_post = posterior.copy()
        trunc_post[GRID > s_p10] = 0
        total = trunc_post.sum()
        if total > 0:
            trunc_post /= total
        rng_high2 = np.random.default_rng(rng_seed + 1)
        s_high = sample_s(trunc_post, N, rng_high2)
    else:
        # Pad to N draws by repeating
        high_indices = np.where(mask)[0]
        rng_high2 = np.random.default_rng(rng_seed + 1)
        chosen = rng_high2.choice(high_indices, size=N, replace=True)
        s_high = s_all[chosen]

    k_high = (1.0 - s_high) / s_high
    rng_high3 = np.random.default_rng(rng_seed)
    U_high = sim_likely.upi_draws.copy()  # Same UPI draws
    sigma_cash = p("daily_cash_sigma")
    eta = rng_high3.standard_normal((N, H))
    C_high = U_high * k_high[:, np.newaxis] * np.exp(sigma_cash * eta - 0.5 * sigma_cash**2)
    C_high = np.clip(C_high, 0, None)
    liquid_high = np.zeros((N, H))
    for t in range(H):
        prev = L0 if t == 0 else liquid_high[:, t - 1]
        liquid_high[:, t] = prev + U_high[:, t] + C_high[:, t] - total_out[t]
    safe_high = np.min(liquid_high, axis=1) >= floor
    n_high = round(100 * float(np.mean(safe_high)))

    return {"none": n_none, "likely": n_likely, "high": n_high}


def compute_break_even(
    forecast: ForecastResult,
    bank0: float,
    drawer0: float,
    obligations: list[Obligation],
    orders: list[Order],
    credit_days: int,
    floor: float,
) -> dict:
    """Bisection on daily cash c* per §6.5."""
    H = len(forecast.median)
    as_of = forecast.dates[0] - timedelta(days=1)

    obl_out = expand_obligations(obligations, as_of, H)
    ord_out = expand_orders(orders, as_of, credit_days, H)
    total_out = obl_out + ord_out

    def is_safe(daily_cash: float) -> bool:
        L0 = bank0 + drawer0
        liquid = L0
        for t in range(H):
            liquid = liquid + forecast.median[t] + daily_cash - total_out[t]
            if liquid < floor:
                return False
        return True

    # Check c=0
    if is_safe(0):
        return {"c_star": 0, "daily_cash_p10": 0, "daily_cash_p90": 0, "status": "zero"}

    # Check max
    c_max = 3.0 * float(np.max(forecast.median))
    if not is_safe(c_max):
        return {"c_star": None, "daily_cash_p10": 0, "daily_cash_p90": 0, "status": "unreachable"}

    # Bisection
    lo, hi = 0.0, c_max
    tol = p("breakeven_tolerance")
    max_iter = p("breakeven_max_iter")
    for _ in range(max_iter):
        mid = (lo + hi) / 2.0
        if is_safe(mid):
            hi = mid
        else:
            lo = mid
        if hi - lo < tol:
            break

    c_star = round((lo + hi) / 2.0, 2)
    return {"c_star": c_star, "daily_cash_p10": 0, "daily_cash_p90": 0, "status": "ok"}


def compute_break_even_with_ranges(
    forecast: ForecastResult,
    sim: SimulationResult,
    bank0: float,
    drawer0: float,
    obligations: list[Obligation],
    orders: list[Order],
    credit_days: int,
    floor: float,
) -> dict:
    """Break-even with estimated daily cash range from simulation."""
    be = compute_break_even(forecast, bank0, drawer0, obligations, orders, credit_days, floor)

    # Daily cash range from simulation
    mean_daily_cash = np.mean(sim.cash_draws, axis=1)  # mean over days per draw
    if len(mean_daily_cash) > 0:
        be["daily_cash_p10"] = round(float(np.percentile(mean_daily_cash, 10)), 0)
        be["daily_cash_p90"] = round(float(np.percentile(mean_daily_cash, 90)), 0)

    return be
