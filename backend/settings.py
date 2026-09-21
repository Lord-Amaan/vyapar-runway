"""Application constants — no imports beyond stdlib."""

from datetime import date
from pathlib import Path

# ── History & forecast window ──────────────────────────────────────
HISTORY_START = date(2023, 10, 15)
HISTORY_END = date(2026, 10, 14)  # 1,096 daily rows
FORECAST_START = date(2026, 10, 15)
HORIZON_DAYS = 30

# ── Diwali dates (used for festival multiplier and Prophet holidays) ─
DIWALI_DATES = [
    date(2023, 11, 12),
    date(2024, 10, 31),
    date(2025, 10, 20),
    date(2026, 11, 8),
]

# ── Backtest: 30-day holdout around Diwali 2025 ───────────────────
BACKTEST_CUTOFF = date(2025, 9, 26)

# ── Paths & reproducibility ───────────────────────────────────────
CSV_PATH = Path(__file__).resolve().parent / "data" / "upi_history.csv"
SEED = 42
