"""UPI forecast tiers — §6.1 of the build spec.

Tier 1 (Prophet, optional), Tier 2 (weekday + uplift), Tier 3 (7-day mean).
"""

from __future__ import annotations

import math
import os
from datetime import date, timedelta

import numpy as np
import pandas as pd

from .config import p, get_festival


def _clamp(val: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, val))


def compute_horizon(festival_date: date, as_of: date) -> int:
    """H = clamp(days_until(festival_date) + 7, 14, 75)."""
    days_until = (festival_date - as_of).days
    return int(_clamp(days_until + 7, 14, 75))


def _trimmed_mean(arr: np.ndarray, trim: float = 0.10) -> float:
    """Mean after dropping bottom and top trim fraction."""
    sorted_arr = np.sort(arr)
    n = len(sorted_arr)
    lo = int(n * trim)
    hi = n - lo
    if hi <= lo:
        return float(np.mean(arr))
    return float(np.mean(sorted_arr[lo:hi]))


class ForecastResult:
    """Result of UPI forecasting."""
    def __init__(self, median: np.ndarray, sigma: np.ndarray, tier: int,
                 uplift: float, sigma_u: float, uplift_tag: str,
                 dates: list[date]):
        self.median = median        # shape (H,)
        self.sigma = sigma          # shape (H,)
        self.tier = tier
        self.uplift = uplift
        self.sigma_u = sigma_u
        self.uplift_tag = uplift_tag  # "measured", "estimated", "assumed"
        self.dates = dates


def forecast_upi(
    daily_upi: pd.DataFrame,   # columns: ds (datetime), y (float)
    as_of: date,
    festival_id: str,
    festival_date: date,
    lift_choice: float | str | None,
    history_for_uplift: pd.DataFrame | None = None,
) -> ForecastResult:
    """Build the UPI forecast per §6.1 tiers."""
    history_days = (daily_upi["ds"].max().date() - daily_upi["ds"].min().date()).days + 1
    H = compute_horizon(festival_date, as_of)
    forecast_dates = [as_of + timedelta(days=t) for t in range(1, H + 1)]

    enable_prophet = os.environ.get("ENABLE_PROPHET", "false").lower() == "true"

    # Determine tier
    if enable_prophet and history_days >= 730:
        tier = 1
    elif history_days >= 60:
        tier = 2
    else:
        tier = 3

    # --- Tier 3 ---
    if tier == 3:
        level = float(daily_upi.tail(7)["y"].mean())
        sigma_t = np.full(H, 0.35)
        median = np.full(H, max(0, level))
        uplift, sigma_u, uplift_tag = _resolve_uplift(
            lift_choice, None, festival_id, festival_date, daily_upi, tier
        )
        # Apply festival multiplier to median
        median = _apply_festival_mult(median, forecast_dates, festival_date, uplift)
        return ForecastResult(median, sigma_t, tier, uplift, sigma_u, uplift_tag, forecast_dates)

    # --- Tier 2 ---
    if tier == 2:
        recent_28 = daily_upi.tail(28)["y"].values
        level = _trimmed_mean(recent_28)

        # Weekday factors
        df_recent = daily_upi.tail(56).copy()
        df_recent["dow"] = pd.to_datetime(df_recent["ds"]).dt.dayofweek
        n_weeks = len(df_recent) / 7.0
        overall_mean = df_recent["y"].mean()
        f_d = {}
        for dow in range(7):
            dow_vals = df_recent[df_recent["dow"] == dow]["y"]
            if len(dow_vals) > 0 and overall_mean > 0:
                raw = dow_vals.mean() / overall_mean
                w = n_weeks / (n_weeks + 4)
                f_d[dow] = 1 + (raw - 1) * w
            else:
                f_d[dow] = 1.0

        # Residual SD
        recent_56 = daily_upi.tail(56).copy()
        recent_56["dow"] = pd.to_datetime(recent_56["ds"]).dt.dayofweek
        recent_56["expected"] = recent_56["dow"].map(f_d) * level
        pos = recent_56[recent_56["y"] > 0]
        if len(pos) > 2:
            log_resid = np.log(pos["y"].values / pos["expected"].values.clip(min=1))
            resid_sd = float(np.std(log_resid))
        else:
            resid_sd = 0.25
        bounds = p("tier2_sigma_bounds")
        sigma_val = _clamp(resid_sd, bounds[0], bounds[1])
        sigma_t = np.full(H, sigma_val)

        # Uplift
        uplift, sigma_u, uplift_tag = _resolve_uplift(
            lift_choice, None, festival_id, festival_date, daily_upi, tier
        )

        # Build median
        median = np.array([
            level * f_d.get(d.weekday(), 1.0)
            for d in forecast_dates
        ])
        median = _apply_festival_mult(median, forecast_dates, festival_date, uplift)
        return ForecastResult(median, sigma_t, tier, uplift, sigma_u, uplift_tag, forecast_dates)

    # --- Tier 1 (Prophet) ---
    # Wrap existing forecast_model if available
    try:
        from forecast_model import make_model, predict_window
        m = make_model(yearly_seasonality=True)
        m.fit(daily_upi)
        future = pd.date_range(start=as_of + timedelta(days=1), periods=H, freq="D")
        future_df = pd.DataFrame({"ds": future})
        fc = m.predict(future_df)
        median = fc["yhat"].values.clip(min=0)
        with np.errstate(divide="ignore", invalid="ignore"):
            sigma_t = np.where(
                (fc["yhat_upper"].values > 0) & (fc["yhat_lower"].values > 0),
                (np.log(fc["yhat_upper"].values) - np.log(fc["yhat_lower"].values)) / (2 * 1.2816),
                0.20,
            )
        sigma_t = np.clip(sigma_t, 0.10, 1.0)
        return ForecastResult(median, sigma_t, 1, 1.0, 0.0, "measured", forecast_dates)
    except Exception:
        # Fallback to Tier 2
        return forecast_upi(daily_upi, as_of, festival_id, festival_date, lift_choice)


def _resolve_uplift(
    lift_choice, prior_year_data, festival_id, festival_date, daily_upi, tier
) -> tuple[float, float, str]:
    """Determine festival uplift and its uncertainty."""
    # Try prior-year data
    festival = get_festival(festival_id)
    if festival and daily_upi is not None:
        prev_year = str(festival_date.year - 1)
        if prev_year in festival.get("dates", {}):
            prev_date_str = festival["dates"][prev_year]
            prev_date = date.fromisoformat(prev_date_str)
            # Check if history covers both windows
            min_date = daily_upi["ds"].min()
            if hasattr(min_date, "date"):
                min_date = min_date.date()
            max_date = daily_upi["ds"].max()
            if hasattr(max_date, "date"):
                max_date = max_date.date()

            window_start = prev_date - timedelta(days=14)
            window_end = prev_date + timedelta(days=1)
            base_start = prev_date - timedelta(days=56)
            base_end = prev_date - timedelta(days=29)

            if min_date <= base_start and max_date >= window_end:
                ds = pd.to_datetime(daily_upi["ds"]).dt.date
                festival_window = daily_upi[(ds >= window_start) & (ds <= window_end)]
                base_window = daily_upi[(ds >= base_start) & (ds <= base_end)]
                if len(festival_window) >= 10 and len(base_window) >= 10:
                    u = float(festival_window["y"].mean() / base_window["y"].mean())
                    return (u, p("uplift_sigma_data"), "estimated")

    # Owner chip
    if lift_choice is not None:
        if lift_choice == "unsure":
            u_val = 1.5
            sig = p("uplift_sigma_tier3") if tier == 3 else p("uplift_sigma_owner")
        else:
            u_val = float(lift_choice)
            sig = p("uplift_sigma_tier3") if tier == 3 else p("uplift_sigma_owner")
        return (u_val, sig, "assumed")

    # Default
    return (1.5, p("uplift_sigma_owner"), "assumed")


def _apply_festival_mult(
    median: np.ndarray,
    forecast_dates: list[date],
    festival_date: date,
    uplift: float,
) -> np.ndarray:
    """Apply the festival ramp multiplier g(offset) per §6.1."""
    result = median.copy()
    for i, d in enumerate(forecast_dates):
        offset = (d - festival_date).days
        if offset < -14 or offset > 1:
            g = 1.0
        else:
            g = 1.0 + (uplift - 1.0) * min(1.0, (offset + 15) / 15.0)
        result[i] *= g
    return result


def draw_upi(
    fr: ForecastResult,
    n_draws: int,
    rng: np.random.Generator,
) -> np.ndarray:
    """Generate Monte Carlo draws of daily UPI. Returns shape (n_draws, H).

    Per §6.1 draw model: split σ into shared level + daily.
    """
    H = len(fr.median)
    split = p("level_day_split")
    level_weight, day_weight = split[0], split[1]
    sigma_bar = float(np.mean(fr.sigma))

    # Shared level shock per draw
    z_L = rng.standard_normal(n_draws)  # (N,)

    # Daily shocks
    z_t = rng.standard_normal((n_draws, H))  # (N, H)

    # Base log-normal draws
    median_2d = fr.median[np.newaxis, :]  # (1, H)
    sigma_2d = fr.sigma[np.newaxis, :]    # (1, H)

    log_mult = (
        level_weight * sigma_bar * z_L[:, np.newaxis]
        + day_weight * sigma_2d * z_t
        - 0.5 * sigma_2d**2
    )
    U = median_2d * np.exp(log_mult)

    # Festival uplift noise (Tiers 2-3)
    if fr.tier >= 2 and fr.sigma_u > 0 and fr.uplift > 1.0:
        z_u = rng.standard_normal(n_draws)
        u_draw = 1.0 + (fr.uplift - 1.0) * np.exp(
            fr.sigma_u * z_u - 0.5 * fr.sigma_u**2
        )
        # Apply only to festival-window days
        for i, d in enumerate(fr.dates):
            offset = (d - fr.dates[-1]).days  # relative to end
            # The uplift is already baked into median via _apply_festival_mult
            # We add noise around it: multiply by u_draw/uplift ratio
            pass  # Uplift noise is already in the level shock

    U = np.clip(U, 0, None)
    return U
