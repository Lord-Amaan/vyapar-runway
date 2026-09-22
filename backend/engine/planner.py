"""Order plan and levers — §6.6 of the build spec."""

from __future__ import annotations

from datetime import date, timedelta

import numpy as np

from .config import p
from .forecast_upi import ForecastResult
from .simulate import simulate
from .schemas import Obligation, Order


def _p_safe_for_orders(
    forecast: ForecastResult,
    posterior: np.ndarray,
    bank0: float,
    drawer0: float,
    obligations: list[Obligation],
    orders: list[Order],
    credit_days: int,
    floor: float,
    rng_seed: int,
) -> float:
    """Compute P(safe) for a given set of orders."""
    rng = np.random.default_rng(rng_seed)
    as_of = forecast.dates[0] - timedelta(days=1)
    sim = simulate(
        forecast, posterior, bank0, drawer0,
        obligations, orders, credit_days, floor, rng, as_of
    )
    return sim.p_safe()


def compute_plan(
    forecast: ForecastResult,
    posterior: np.ndarray,
    bank0: float,
    drawer0: float,
    obligations: list[Obligation],
    target_amount: float,
    credit_days: int,
    floor: float,
    order_by: date,
    today: date,
    missed: bool,
    rng_seed: int,
) -> dict:
    """Compute a staged order plan per §6.6."""
    thr = p("plan_p_threshold")
    tolerance = p("plan_tolerance")

    # Date grid
    if missed:
        date_grid = [today + timedelta(days=i) for i in range(3)]
    else:
        start = max(today, order_by - timedelta(days=14))
        days_range = (order_by - start).days + 1
        date_grid = [start + timedelta(days=i) for i in range(days_range)]

    if not date_grid:
        date_grid = [today]

    # Try single-tranche: full amount on each date
    for d in date_grid:
        orders = [Order(amount=target_amount, date=d)]
        ps = _p_safe_for_orders(
            forecast, posterior, bank0, drawer0,
            obligations, orders, credit_days, floor, rng_seed,
        )
        if ps >= thr:
            return {
                "target": target_amount,
                "affordable_total": target_amount,
                "fully_affordable": True,
                "shortfall": 0,
                "tranches": [{"date": d.isoformat(), "amount": target_amount}],
                "levers": _compute_levers(
                    forecast, posterior, bank0, drawer0,
                    obligations, target_amount, credit_days, floor,
                    order_by, rng_seed
                ),
                "whatsapp_text": "",
            }

    # Multi-tranche: up to 3
    n_tranches = min(3, len(date_grid))
    if n_tranches == 1:
        tranche_dates = [date_grid[0]]
    elif n_tranches == 2:
        tranche_dates = [date_grid[0], date_grid[-1]]
    else:
        mid_idx = len(date_grid) // 2
        tranche_dates = [date_grid[0], date_grid[mid_idx], date_grid[-1]]

    tranches = []
    remaining = target_amount
    for i, d in enumerate(tranche_dates):
        # Bisect for max safe amount
        lo, hi = 0.0, remaining
        for _ in range(30):
            mid = (lo + hi) / 2.0
            test_orders = [
                Order(amount=t["amount"], date=date.fromisoformat(t["date"]))
                for t in tranches
            ] + [Order(amount=mid, date=d)]
            ps = _p_safe_for_orders(
                forecast, posterior, bank0, drawer0,
                obligations, test_orders, credit_days, floor, rng_seed,
            )
            if ps >= thr:
                lo = mid
            else:
                hi = mid
            if hi - lo < tolerance:
                break
        safe_amount = round(lo / 100) * 100  # Round to nearest 100
        if safe_amount > 0:
            tranches.append({"date": d.isoformat(), "amount": safe_amount})
            remaining -= safe_amount
        if remaining <= 0:
            break

    affordable = sum(t["amount"] for t in tranches)
    return {
        "target": target_amount,
        "affordable_total": affordable,
        "fully_affordable": affordable >= target_amount,
        "shortfall": max(0, target_amount - affordable),
        "tranches": tranches,
        "levers": _compute_levers(
            forecast, posterior, bank0, drawer0,
            obligations, target_amount, credit_days, floor,
            order_by, rng_seed
        ),
        "whatsapp_text": "",
    }


def _compute_levers(
    forecast: ForecastResult,
    posterior: np.ndarray,
    bank0: float,
    drawer0: float,
    obligations: list[Obligation],
    target_amount: float,
    credit_days: int,
    floor: float,
    order_by: date,
    rng_seed: int,
) -> list[dict]:
    """Evaluate levers per §6.6: credit+7, -10%, -20%, floor-25%."""
    levers = []
    base_order = [Order(amount=target_amount, date=order_by)]

    # (a) Wholesaler credit +7 days
    ps = _p_safe_for_orders(
        forecast, posterior, bank0, drawer0,
        obligations, base_order, credit_days + 7, floor, rng_seed,
    )
    levers.append({"id": "credit_plus_7", "n": round(100 * ps)})

    # (b) Order 10% less
    ps = _p_safe_for_orders(
        forecast, posterior, bank0, drawer0,
        obligations, [Order(amount=target_amount * 0.9, date=order_by)],
        credit_days, floor, rng_seed,
    )
    levers.append({"id": "order_minus_10", "n": round(100 * ps)})

    # (c) Order 20% less
    ps = _p_safe_for_orders(
        forecast, posterior, bank0, drawer0,
        obligations, [Order(amount=target_amount * 0.8, date=order_by)],
        credit_days, floor, rng_seed,
    )
    levers.append({"id": "order_minus_20", "n": round(100 * ps)})

    # (d) Floor -25%
    ps = _p_safe_for_orders(
        forecast, posterior, bank0, drawer0,
        obligations, base_order, credit_days, floor * 0.75, rng_seed,
    )
    levers.append({"id": "floor_minus_25", "n": round(100 * ps)})

    return levers
