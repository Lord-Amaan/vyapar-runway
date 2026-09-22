"""UPI/POS file parsing — §6.0 of the build spec."""

from __future__ import annotations

import io
import re
from datetime import date, timedelta

import numpy as np
import pandas as pd


# Header aliases (case-insensitive, trimmed)
DATE_ALIASES = {
    "date", "txn date", "transaction date", "settlement date",
    "credit date", "value date", "ds",
}
AMOUNT_ALIASES = {
    "amount", "credit", "amount (inr)", "amount in inr",
    "settled amount", "txn amount", "net amount", "y",
}

# Date formats tried in order
DATE_FORMATS = [
    "%Y-%m-%d",
    "%d-%m-%Y",
    "%d/%m/%Y",
    "%d-%b-%Y",
    "%d %b %Y",
]


def _detect_columns(columns: list[str]) -> tuple[str | None, str | None]:
    """Auto-detect date and amount columns from header aliases."""
    lower_map = {str(c).strip().lower(): c for c in columns}
    date_col = None
    amount_col = None
    for alias in DATE_ALIASES:
        if alias in lower_map:
            date_col = lower_map[alias]
            break
    for alias in AMOUNT_ALIASES:
        if alias in lower_map:
            amount_col = lower_map[alias]
            break
    return date_col, amount_col


def _clean_amount(series: pd.Series) -> pd.Series:
    """Strip ₹, Rs., INR, commas, spaces; parentheses = negative."""
    s = series.astype(str)
    # Detect parenthesized negatives
    is_neg = s.str.match(r"^\s*\(.*\)\s*$")
    s = s.str.replace(r"[₹,\s]", "", regex=True)
    s = s.str.replace("Rs.", "", regex=False)
    s = s.str.replace("INR", "", regex=False)
    s = s.str.replace("(", "", regex=False)
    s = s.str.replace(")", "", regex=False)
    result = pd.to_numeric(s, errors="coerce")
    result[is_neg] = -result[is_neg].abs()
    return result


def _parse_dates(series: pd.Series) -> pd.Series:
    """Try multiple date formats."""
    raw = series.astype(str).str.strip()
    result = pd.Series(pd.NaT, index=series.index, dtype="datetime64[ns]")

    for fmt in DATE_FORMATS:
        mask = result.isna()
        if not mask.any():
            break
        parsed = pd.to_datetime(raw[mask], format=fmt, errors="coerce")
        result[mask] = parsed

    # Last resort: pandas inference
    still_na = result.isna()
    if still_na.any():
        result[still_na] = pd.to_datetime(raw[still_na], dayfirst=True, errors="coerce")

    return result


def parse_upi_file(
    raw_bytes: bytes,
    mapping: dict | None = None,
) -> dict:
    """Parse a UPI/POS CSV file per §6.0.

    Returns:
        {
            "df": pd.DataFrame with columns [ds, y],
            "days": int,
            "first_date": str,
            "last_date": str,
            "total": float,
            "warnings": list[str],
            "zero_filled_days": int,
            "tier": int,
        }
    Or raises ValueError with needs_mapping info.
    """
    # Read CSV
    try:
        df = pd.read_csv(io.BytesIO(raw_bytes))
    except Exception:
        try:
            df = pd.read_csv(io.BytesIO(raw_bytes), sep="\t")
        except Exception as exc:
            raise ValueError("Could not read this file as CSV or TSV") from exc

    warnings = []

    # Detect or apply mapping
    if mapping:
        date_col = mapping.get("date")
        amount_col = mapping.get("amount")
    else:
        date_col, amount_col = _detect_columns(list(df.columns))

    if date_col is None or amount_col is None:
        raise ValueError(
            f"needs_mapping|{list(df.columns)}|{df.head(5).to_json()}"
        )

    # Extract and clean
    result = pd.DataFrame()
    result["ds"] = _parse_dates(df[date_col])
    result["y"] = _clean_amount(df[amount_col])

    # Check date parse rate
    na_dates = result["ds"].isna().sum()
    if na_dates > len(result) * 0.05:
        raise ValueError(f"More than 5% of dates could not be parsed in column '{date_col}'")

    # Drop rows with bad dates or amounts
    result = result.dropna(subset=["ds", "y"])

    # Drop negative/zero rows
    neg_count = (result["y"] <= 0).sum()
    if neg_count > 0:
        warnings.append(f"Dropped {neg_count} rows with zero or negative amounts")
        result = result[result["y"] > 0]

    if len(result) < 7:
        raise ValueError("Need at least 7 days of payment data")

    # Aggregate to daily
    result["ds"] = result["ds"].dt.normalize()
    daily = result.groupby("ds", as_index=False)["y"].sum().sort_values("ds").reset_index(drop=True)

    # Fill missing days with 0 if span >= 30 days
    first = daily["ds"].min()
    last = daily["ds"].max()
    span = (last - first).days + 1
    zero_filled = 0
    if span >= 30:
        full_range = pd.date_range(start=first, end=last, freq="D")
        daily = daily.set_index("ds").reindex(full_range, fill_value=0).reset_index()
        daily.columns = ["ds", "y"]
        zero_filled = span - len(result.groupby("ds"))

        # Warn about gaps > 3 days
        orig_dates = set(result["ds"].dt.normalize().unique())
        gap_start = None
        for d in full_range:
            if d not in orig_dates:
                if gap_start is None:
                    gap_start = d
            else:
                if gap_start is not None:
                    gap_len = (d - gap_start).days
                    if gap_len > 3:
                        warnings.append(f"Gap of {gap_len} days starting {gap_start.strftime('%Y-%m-%d')}")
                    gap_start = None

    history_days = (daily["ds"].max() - daily["ds"].min()).days + 1
    if history_days >= 730:
        tier = 1
    elif history_days >= 60:
        tier = 2
    else:
        tier = 3

    return {
        "df": daily,
        "days": history_days,
        "first_date": daily["ds"].min().strftime("%Y-%m-%d"),
        "last_date": daily["ds"].max().strftime("%Y-%m-%d"),
        "total": round(float(daily["y"].sum()), 2),
        "warnings": warnings,
        "zero_filled_days": zero_filled,
        "tier": tier,
    }
