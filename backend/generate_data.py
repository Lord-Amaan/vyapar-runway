"""Generate deterministic synthetic UPI transaction history.

Runnable as a script (``python generate_data.py``) and importable
(``from generate_data import generate_csv``).
"""

from __future__ import annotations

import math
from datetime import timedelta

import numpy as np
import pandas as pd

from settings import CSV_PATH, DIWALI_DATES, HISTORY_END, HISTORY_START, SEED


def _days_between(a, b) -> int:  # noqa: ANN001
    """Signed number of days from *a* to *b*."""
    return (b - a).days


def _nearest_diwali_offset(d) -> int:  # noqa: ANN001
    """Days from *d* to the nearest Diwali date (negative = before Diwali)."""
    return min((_days_between(dw, d) for dw in DIWALI_DATES), key=abs)


def _festival_multiplier(offset: int) -> float:
    """Festival sales multiplier by offset from nearest Diwali."""
    if -10 <= offset <= -4:
        # ramp linearly from x1.0 at d=-10 to x2.8 at d=-3
        # at d=-10 → 1.0, at d=-3 → 2.8  ⇒  slope = (2.8-1.0)/(10-3) = 1.8/7
        return 1.0 + (offset + 10) * (1.8 / 7)
    if offset == -3:
        return 2.8
    if -2 <= offset <= 0:
        return 3.2
    if offset == 1:
        return 1.8
    if offset == 2:
        return 1.3
    return 1.0


def generate_csv() -> pd.DataFrame:
    """Create the history CSV and return the DataFrame.

    Running this function twice produces byte-identical files because
    every random draw is seeded via ``numpy.random.default_rng(SEED)``.
    """
    rng = np.random.default_rng(SEED)

    dates = pd.date_range(start=HISTORY_START, end=HISTORY_END, freq="D")
    total_days = len(dates)

    rows: list[dict[str, object]] = []
    for i, ts in enumerate(dates):
        d = ts.date()

        # ── base + trend (8 % / year compounding daily) ────────────
        daily_rate = (1.08 ** (1 / 365.25)) - 1
        base = 5_000 * (1 + daily_rate) ** i

        # ── weekly seasonality ─────────────────────────────────────
        dow = d.weekday()  # 0=Mon … 6=Sun
        weekly = {0: 0.92, 1: 0.92, 2: 0.92, 3: 0.92, 4: 1.0, 5: 1.15, 6: 1.20}[dow]

        # ── payday: first 7 days of month ──────────────────────────
        payday = 1.08 if d.day <= 7 else 1.0

        # ── yearly seasonality ─────────────────────────────────────
        day_of_year = d.timetuple().tm_yday
        yearly = 1 + 0.06 * math.sin(2 * math.pi * day_of_year / 365.25)

        # ── festival multiplier ────────────────────────────────────
        offset = _nearest_diwali_offset(d)
        festival = _festival_multiplier(offset)

        # ── noise ──────────────────────────────────────────────────
        noise = rng.lognormal(0, 0.10)
        if rng.random() < 0.02:
            noise *= 0.7  # slow-day shock

        # (the ``trend`` is already baked into ``base``)
        value = base * weekly * payday * yearly * festival * noise

        # round to nearest 50, minimum 500
        value = max(500, round(value / 50) * 50)

        rows.append({"ds": d.isoformat(), "y": int(value)})

    df = pd.DataFrame(rows)

    # ensure parent dir exists
    CSV_PATH.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(CSV_PATH, index=False)
    return df


if __name__ == "__main__":
    df = generate_csv()
    print(f"Wrote {len(df)} rows to {CSV_PATH}")
    print(f"Date range: {df['ds'].iloc[0]} -> {df['ds'].iloc[-1]}")
    print(f"Mean y: {df['y'].mean():.0f},  Min: {df['y'].min()},  Max: {df['y'].max()}")
