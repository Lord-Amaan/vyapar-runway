"""Bank statement parsing — §6.0 of the build spec."""

from __future__ import annotations

import io
import re
from collections import defaultdict

import pandas as pd

from .parsing_upi import _detect_columns, _parse_dates, _clean_amount

# Bank description aliases
BANK_DATE_ALIASES = {"date", "txn date", "transaction date", "value date", "posting date"}
BANK_DESC_ALIASES = {"description", "narration", "particulars", "details", "remarks"}
BANK_DEBIT_ALIASES = {"debit", "withdrawal", "debit amount", "dr"}
BANK_CREDIT_ALIASES = {"credit", "deposit", "credit amount", "cr"}

# Classification patterns (case-insensitive)
CASH_DEPOSIT_RE = re.compile(r"(CASH\s*DEP|CDM|CASH\s*DEPOSIT|BY\s*CASH)", re.I)
CASH_WITHDRAWAL_RE = re.compile(r"(ATM|CASH\s*WDL|CASH\s*WITHDRAWAL|SELF)", re.I)
UPI_RE = re.compile(r"UPI", re.I)

# Counterparty extraction noise tokens
NOISE_TOKENS = {"UPI", "NEFT", "IMPS", "RTGS", "CHQ", "DR", "TO", "BY", "PAYMENT"}
BANK_CODE_RE = re.compile(r"^[A-Z]{4}0")


def _find_col(columns: list[str], aliases: set[str]) -> str | None:
    lower_map = {str(c).strip().lower(): c for c in columns}
    for a in aliases:
        if a in lower_map:
            return lower_map[a]
    return None


def _extract_counterparty(desc: str) -> str:
    """Extract counterparty name from bank description."""
    tokens = re.split(r"[/\-]", desc)
    candidates = []
    for t in tokens:
        t = t.strip()
        if not t or len(t) <= 3:
            continue
        if t.upper() in NOISE_TOKENS:
            continue
        if t.isdigit():
            continue
        if BANK_CODE_RE.match(t):
            continue
        if re.match(r"^\d+$", t):
            continue
        candidates.append(t)
    if candidates:
        return max(candidates, key=len)
    return desc[:50]


def parse_bank_file(
    raw_bytes: bytes,
    mapping: dict | None = None,
) -> dict:
    """Parse a bank statement CSV per §6.0.

    Returns:
        {
            "df": pd.DataFrame with columns [date, description, debit, credit, category],
            "cash_deposit_total": float,
            "cash_deposit_count": int,
            "top_debits": list[dict],
            "warnings": list[str],
        }
    """
    try:
        df = pd.read_csv(io.BytesIO(raw_bytes))
    except Exception:
        try:
            df = pd.read_csv(io.BytesIO(raw_bytes), sep="\t")
        except Exception as exc:
            raise ValueError("Could not read bank file") from exc

    warnings = []
    cols = list(df.columns)

    # Detect columns
    if mapping:
        date_col = mapping.get("date")
        desc_col = mapping.get("description")
        debit_col = mapping.get("debit")
        credit_col = mapping.get("credit")
    else:
        date_col = _find_col(cols, BANK_DATE_ALIASES)
        desc_col = _find_col(cols, BANK_DESC_ALIASES)
        debit_col = _find_col(cols, BANK_DEBIT_ALIASES)
        credit_col = _find_col(cols, BANK_CREDIT_ALIASES)

    if not all([date_col, desc_col]):
        raise ValueError("Bank file needs date and description columns")

    # If only a single amount column exists, use it for both
    if debit_col is None and credit_col is None:
        amt_col = _find_col(cols, {"amount"})
        if amt_col:
            debit_col = amt_col
            credit_col = amt_col

    result = pd.DataFrame()
    result["date"] = _parse_dates(df[date_col])
    result["description"] = df[desc_col].fillna("").astype(str)
    result["debit"] = _clean_amount(df[debit_col]) if debit_col else 0.0
    result["credit"] = _clean_amount(df[credit_col]) if credit_col else 0.0
    result["debit"] = result["debit"].fillna(0).clip(lower=0)
    result["credit"] = result["credit"].fillna(0).clip(lower=0)

    result = result.dropna(subset=["date"])

    # Classify each row
    categories = []
    for _, row in result.iterrows():
        desc = str(row["description"])
        cr = float(row["credit"])
        dr = float(row["debit"])

        if cr > 0 and CASH_DEPOSIT_RE.search(desc):
            categories.append("cash_deposit")
        elif dr > 0 and CASH_WITHDRAWAL_RE.search(desc):
            categories.append("cash_withdrawal")
        elif cr > 0 and UPI_RE.search(desc):
            categories.append("upi_credit")
        elif dr > 0:
            categories.append("digital_debit")
        elif cr > 0:
            categories.append("other_credit")
        else:
            categories.append("other")

    result["category"] = categories

    # Cash deposits
    cash_deps = result[result["category"] == "cash_deposit"]
    cash_deposit_total = float(cash_deps["credit"].sum())
    cash_deposit_count = len(cash_deps)

    # Top debit counterparties
    debits = result[result["category"] == "digital_debit"].copy()
    debits["counterparty"] = debits["description"].apply(_extract_counterparty)

    counterparty_stats = defaultdict(lambda: {"total": 0.0, "count": 0, "raw": ""})
    for _, row in debits.iterrows():
        cp = row["counterparty"]
        counterparty_stats[cp]["total"] += float(row["debit"])
        counterparty_stats[cp]["count"] += 1
        if not counterparty_stats[cp]["raw"]:
            counterparty_stats[cp]["raw"] = str(row["description"])[:100]

    top_debits = sorted(
        [
            {"name": name, "raw": info["raw"], "total": round(info["total"], 2), "count": info["count"]}
            for name, info in counterparty_stats.items()
        ],
        key=lambda x: x["total"],
        reverse=True,
    )[:15]

    return {
        "df": result,
        "cash_deposit_total": round(cash_deposit_total, 2),
        "cash_deposit_count": cash_deposit_count,
        "top_debits": top_debits,
        "warnings": warnings,
    }
