"""Cash-flow Monte Carlo simulation — §6.4 of the build spec."""

from __future__ import annotations

from datetime import date, timedelta

import numpy as np

from .config import p
from .evidence import sample_s
from .forecast_upi import ForecastResult, draw_upi
from .schemas import Obligation, Order


def expand_obligations(
    obligations: list[Obligation],
    as_of: date,
    H: int,
) -> np.ndarray:
    """Expand obligations into a (H,) array of daily outflows."""
    outflows = np.zeros(H)
    for obl in obligations:
        obl_date = obl.date
        if obl.repeat == "none":
            day_idx = (obl_date - as_of).days - 1  # t=1 is index 0
            if 0 <= day_idx < H:
                outflows[day_idx] += obl.amount
        elif obl.repeat == "weekly":
            d = obl_date
            while True:
                day_idx = (d - as_of).days - 1
                if day_idx >= H:
                    break
                if 0 <= day_idx < H:
                    outflows[day_idx] += obl.amount
                d += timedelta(days=7)
        elif obl.repeat == "monthly":
            d = obl_date
            while True:
                day_idx = (d - as_of).days - 1
                if day_idx >= H:
                    break
                if 0 <= day_idx < H:
                    outflows[day_idx] += obl.amount
                # Next month, same day (clip to month length)
                month = d.month + 1
                year = d.year
                if month > 12:
                    month = 1
                    year += 1
                import calendar
                max_day = calendar.monthrange(year, month)[1]
                day = min(d.day, max_day)
                d = date(year, month, day)
    return outflows


def expand_orders(
    orders: list[Order],
    as_of: date,
    credit_days: int,
    H: int,
) -> np.ndarray:
    """Expand orders into a (H,) array of daily payments."""
    payments = np.zeros(H)
    for order in orders:
        pay_date = order.date + timedelta(days=credit_days)
        day_idx = (pay_date - as_of).days - 1
        if 0 <= day_idx < H:
            payments[day_idx] += order.amount
    return payments


class SimulationResult:
    """Result of Monte Carlo cash-flow simulation."""
    def __init__(
        self,
        liquid: np.ndarray,     # (N, H) daily liquidity per draw
        upi_draws: np.ndarray,  # (N, H) daily UPI per draw
        cash_draws: np.ndarray, # (N, H) daily cash per draw
        safe: np.ndarray,       # (N,) bool — whether min liquidity >= floor
        dates: list[date],
        floor: float,
    ):
        self.liquid = liquid
        self.upi_draws = upi_draws
        self.cash_draws = cash_draws
        self.safe = safe
        self.dates = dates
        self.floor = floor

    def p_safe(self) -> float:
        return float(np.mean(self.safe))

    def liquid_percentiles(self) -> dict:
        return {
            "p10": np.percentile(self.liquid, 10, axis=0).tolist(),
            "p50": np.percentile(self.liquid, 50, axis=0).tolist(),
            "p90": np.percentile(self.liquid, 90, axis=0).tolist(),
        }

    def upi_percentiles(self) -> dict:
        return {
            "p50": np.percentile(self.upi_draws, 50, axis=0).tolist(),
        }

    def cash_percentiles(self) -> dict:
        return {
            "p10": np.percentile(self.cash_draws, 10, axis=0).tolist(),
            "p50": np.percentile(self.cash_draws, 50, axis=0).tolist(),
            "p90": np.percentile(self.cash_draws, 90, axis=0).tolist(),
        }


def simulate(
    forecast: ForecastResult,
    posterior: np.ndarray,
    bank0: float,
    drawer0: float,
    obligations: list[Obligation],
    orders: list[Order],
    credit_days: int,
    floor: float,
    rng: np.random.Generator,
    as_of: date | None = None,
) -> SimulationResult:
    """Run N Monte Carlo draws of the cash-flow path per §6.4."""
    N = p("monte_carlo_n")
    H = len(forecast.median)
    as_of_date = as_of or (forecast.dates[0] - timedelta(days=1))

    # Sample s values from posterior
    s_samples = sample_s(posterior, N, rng)  # (N,)
    k_samples = (1.0 - s_samples) / s_samples  # (N,)

    # Draw UPI paths
    U = draw_upi(forecast, N, rng)  # (N, H)

    # Cash draws: C_t = U_t · k · exp(σ_cash · η − 0.5σ²)
    sigma_cash = p("daily_cash_sigma")
    eta = rng.standard_normal((N, H))
    C = U * k_samples[:, np.newaxis] * np.exp(sigma_cash * eta - 0.5 * sigma_cash**2)
    C = np.clip(C, 0, None)

    # Obligation and order outflows
    obl_outflows = expand_obligations(obligations, as_of_date, H)  # (H,)
    ord_outflows = expand_orders(orders, as_of_date, credit_days, H)  # (H,)
    total_outflows = obl_outflows + ord_outflows  # (H,)

    # Liquidity path: L_t = L_{t-1} + U_t + C_t - outflows_t
    L0 = bank0 + drawer0
    liquid = np.zeros((N, H))
    for t in range(H):
        prev = L0 if t == 0 else liquid[:, t - 1]
        liquid[:, t] = prev + U[:, t] + C[:, t] - total_outflows[t]

    # Safe if min liquidity >= floor
    min_liquid = np.min(liquid, axis=1)
    safe = min_liquid >= floor

    return SimulationResult(
        liquid=liquid,
        upi_draws=U,
        cash_draws=C,
        safe=safe,
        dates=forecast.dates,
        floor=floor,
    )
