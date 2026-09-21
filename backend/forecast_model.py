"""Prophet forecast model — pure functions, no FastAPI dependency."""

from __future__ import annotations

import logging
import time
from datetime import timedelta

import numpy as np
import pandas as pd
from prophet import Prophet

from generate_data import generate_csv
from settings import (
    BACKTEST_CUTOFF,
    CSV_PATH,
    DIWALI_DATES,
    FORECAST_START,
    HISTORY_END,
    HORIZON_DAYS,
)

logger = logging.getLogger(__name__)


# ── helpers ────────────────────────────────────────────────────────


def load_history() -> pd.DataFrame:
    """Read the history CSV, generating it first if missing."""
    if not CSV_PATH.exists():
        logger.info("CSV not found — generating %s", CSV_PATH)
        generate_csv()
    df = pd.read_csv(CSV_PATH, parse_dates=["ds"])
    return df


def build_holidays() -> pd.DataFrame:
    """Diwali holiday table for Prophet (all four years incl. 2026)."""
    rows = [
        {
            "holiday": "diwali",
            "ds": pd.Timestamp(d),
            "lower_window": -10,
            "upper_window": 2,
        }
        for d in DIWALI_DATES
    ]
    return pd.DataFrame(rows)


def make_model() -> Prophet:
    """Construct (but do not fit) the Prophet model."""
    # Silence chatty loggers
    logging.getLogger("cmdstanpy").setLevel(logging.WARNING)
    logging.getLogger("prophet").setLevel(logging.WARNING)

    m = Prophet(
        growth="linear",
        seasonality_mode="multiplicative",
        weekly_seasonality=True,
        yearly_seasonality=True,
        daily_seasonality=False,
        holidays=build_holidays(),
        changepoint_prior_scale=0.05,
        uncertainty_samples=0,
    )
    m.add_seasonality("monthly", period=30.5, fourier_order=3)
    return m


def predict_window(
    model: Prophet, start, days: int  # noqa: ANN001
) -> list[dict[str, object]]:
    """Produce *days* predictions starting at *start*.

    Returns a list of ``{"date": "YYYY-MM-DD", "amount": int}`` dicts.
    Amounts are rounded to the nearest 50 and floored at 0.
    """
    future_dates = pd.date_range(start=start, periods=days, freq="D")
    future = pd.DataFrame({"ds": future_dates})
    forecast = model.predict(future)

    results: list[dict[str, object]] = []
    for _, row in forecast.iterrows():
        yhat = row["yhat"]
        if np.isnan(yhat):
            raise ValueError(f"NaN prediction on {row['ds']}")
        amount = max(0, round(yhat / 50) * 50)
        results.append({"date": row["ds"].strftime("%Y-%m-%d"), "amount": int(amount)})
    return results


# ── backtest ───────────────────────────────────────────────────────


def backtest(df: pd.DataFrame) -> dict:
    """Train on data before cutoff, predict 30 days, compare with actuals."""
    cutoff = pd.Timestamp(BACKTEST_CUTOFF)
    train = df[df["ds"] < cutoff].copy()
    holdout_end = cutoff + timedelta(days=HORIZON_DAYS - 1)
    actuals = df[(df["ds"] >= cutoff) & (df["ds"] <= holdout_end)].copy()

    if len(actuals) < HORIZON_DAYS:
        raise ValueError(
            f"Not enough holdout rows: {len(actuals)} (need {HORIZON_DAYS})"
        )

    m = make_model()
    m.fit(train)
    preds = predict_window(m, BACKTEST_CUTOFF, HORIZON_DAYS)

    pred_amounts = np.array([p["amount"] for p in preds])
    actual_amounts = actuals["y"].values[:HORIZON_DAYS]

    # per-day MAPE
    mape = float(np.mean(np.abs(pred_amounts - actual_amounts) / actual_amounts) * 100)

    # naive baseline: mean of 28 days before cutoff, repeated flat
    baseline_window = train.tail(28)["y"].values
    baseline_val = float(np.mean(baseline_window))
    baseline_preds = np.full(HORIZON_DAYS, baseline_val)
    baseline_mape = float(
        np.mean(np.abs(baseline_preds - actual_amounts) / actual_amounts) * 100
    )

    # total error %
    total_pred = float(np.sum(pred_amounts))
    total_actual = float(np.sum(actual_amounts))
    total_error_pct = abs(total_pred - total_actual) / total_actual * 100

    return {
        "mape": round(mape, 1),
        "baselineMape": round(baseline_mape, 1),
        "totalErrorPct": round(total_error_pct, 1),
    }


# ── main entry point ──────────────────────────────────────────────


def build_predictions() -> tuple[list[dict[str, object]], dict]:
    """Load history, backtest, train final model, return predictions + info."""
    df = load_history()

    logger.info("Running backtest (cutoff=%s) …", BACKTEST_CUTOFF)
    bt = backtest(df)
    logger.info(
        "Backtest — model MAPE: %.1f%%, baseline MAPE: %.1f%%, total error: %.1f%%",
        bt["mape"],
        bt["baselineMape"],
        bt["totalErrorPct"],
    )

    logger.info("Training final model on %d rows …", len(df))
    t0 = time.perf_counter()
    model = make_model()
    model.fit(df)
    fit_secs = time.perf_counter() - t0
    logger.info("Model fit in %.1fs", fit_secs)

    preds = predict_window(model, FORECAST_START, HORIZON_DAYS)

    model_info = {
        "name": "prophet",
        "trainRows": len(df),
        "backtestMape": bt["mape"],
        "baselineMape": bt["baselineMape"],
        "totalErrorPct": bt["totalErrorPct"],
    }
    return preds, model_info
