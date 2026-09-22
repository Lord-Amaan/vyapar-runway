"""Synthetic data generator v2 — §7.3 of the build spec.

Generates UPI history, bank statements, and hidden ground truth.
Does NOT import from engine/ (avoids circular benchmark).
"""

from __future__ import annotations

import json
import os
from datetime import date, timedelta
from pathlib import Path

import numpy as np
import pandas as pd

# Weekly pattern (Mon=0..Sun=6)
DOW_FACTORS = [0.85, 0.90, 1.00, 1.05, 1.15, 1.30, 0.75]

SUPPLIER_NAMES = [
    "SHARMA TRADERS", "PATEL WHOLESALE", "GUPTA DISTRIBUTORS",
    "SINGH SUPPLIERS", "VERMA AGENCIES", "MEHTA ENTERPRISES",
    "JAIN BROTHERS", "AGARWAL TRADING", "SHAH COMMERCIAL",
    "KUMAR INDUSTRIES",
]

PAYMENT_MODES = ["UPI", "NEFT", "IMPS", "RTGS"]


def generate_shop(
    seed: int,
    s_shop: float,
    q_shop: float,
    category: str,
    base_daily: float,
    history_days: int,
    annual_growth: float,
    festival_id: str,
    festival_dates: dict[str, str],
    as_of: date,
    bank0: float = 50000,
    drawer0: float = 20000,
    obligations: list[dict] | None = None,
    floor: float = 15000,
    name: str = "Shop",
) -> dict:
    """Generate a complete shop bundle: upi.csv, bank.csv, meta.json, truth.json."""
    rng = np.random.default_rng(seed)

    start_date = as_of - timedelta(days=history_days - 1)
    dates = [start_date + timedelta(days=i) for i in range(history_days)]

    # Festival multiplier
    def festival_mult(d: date) -> float:
        for year_str, fd_str in festival_dates.items():
            fd = date.fromisoformat(fd_str)
            offset = (d - fd).days
            if -14 <= offset <= 1:
                u_true = 1.4 + rng.uniform() * 1.2  # U(1.4, 2.6)
                ramp = min(1.0, (offset + 15) / 15.0)
                return 1.0 + (u_true - 1.0) * ramp
        return 1.0

    # Pre-compute uplift per festival date (fixed per shop)
    uplift_cache = {}
    for year_str, fd_str in festival_dates.items():
        fd = date.fromisoformat(fd_str)
        uplift_cache[fd] = 1.4 + rng.uniform() * 1.2

    def get_festival_g(d: date) -> float:
        for fd, u_true in uplift_cache.items():
            offset = (d - fd).days
            if -14 <= offset <= 1:
                ramp = min(1.0, (offset + 15) / 15.0)
                return 1.0 + (u_true - 1.0) * ramp
        return 1.0

    # Generate daily true sales
    true_sales = []
    true_cash = []
    upi_amounts = []
    festival_flags = []

    for d in dates:
        years_elapsed = (d - start_date).days / 365.25
        trend = 1.0 + annual_growth * years_elapsed
        dow = DOW_FACTORS[d.weekday()]
        fest_g = get_festival_g(d)
        noise = np.exp(0.15 * rng.standard_normal() - 0.011)
        S_t = base_daily * dow * trend * fest_g * noise
        S_t = max(0, S_t)

        # UPI share with slight festival boost and daily noise
        is_fest = fest_g > 1.0
        s_t = np.clip(s_shop + (0.05 if is_fest else 0) + 0.03 * rng.standard_normal(), 0.1, 0.95)

        U_t = S_t * s_t
        C_t = S_t * (1 - s_t)

        true_sales.append(round(S_t, 2))
        true_cash.append(round(C_t, 2))
        upi_amounts.append(round(U_t, 2))
        festival_flags.append(is_fest)

    # UPI CSV
    upi_df = pd.DataFrame({
        "date": [d.isoformat() for d in dates],
        "amount": upi_amounts,
    })

    # Bank file synthesis
    bank_rows = []

    # (i) UPI credits aggregated per day
    for i, d in enumerate(dates):
        if upi_amounts[i] > 0:
            bank_rows.append({
                "date": d.isoformat(),
                "description": f"UPI/CR/{rng.integers(100000, 999999)}/PHONEPE",
                "debit": 0,
                "credit": upi_amounts[i],
            })

    # (ii) Cash deposits every 3-5 days
    undeposited_cash = 0.0
    deposit_interval = 0
    for i, d in enumerate(dates):
        undeposited_cash += true_cash[i]
        deposit_interval += 1
        next_deposit = rng.integers(3, 6)
        if deposit_interval >= next_deposit and undeposited_cash > 0:
            frac = rng.uniform(0.4, 0.8)
            deposit_amt = round(undeposited_cash * frac, 2)
            if deposit_amt > 100:
                bank_rows.append({
                    "date": d.isoformat(),
                    "description": f"CASH DEPOSIT/CDM/{rng.integers(1000, 9999)}",
                    "debit": 0,
                    "credit": deposit_amt,
                })
            undeposited_cash -= deposit_amt
            deposit_interval = 0

    # (iii) Supplier payments weekly
    week_sales = 0.0
    n_suppliers = min(3, max(1, rng.integers(1, 4)))
    chosen_suppliers = rng.choice(SUPPLIER_NAMES, size=n_suppliers, replace=False).tolist()
    for i, d in enumerate(dates):
        week_sales += true_sales[i]
        if d.weekday() == 0 and i > 0:  # Monday
            total_purchase = 0.85 * week_sales * q_shop
            if total_purchase > 500:
                per_supplier = total_purchase / n_suppliers
                for sup in chosen_suppliers:
                    mode = rng.choice(PAYMENT_MODES)
                    bank_rows.append({
                        "date": d.isoformat(),
                        "description": f"{mode}/DR/{rng.integers(100000, 999999)}/{sup}",
                        "debit": round(per_supplier, 2),
                        "credit": 0,
                    })
            week_sales = 0.0

    # (iv) Monthly obligations
    if obligations is None:
        obligations = [
            {"label": "Rent", "amount": 12000, "date": start_date.replace(day=1).isoformat(), "repeat": "monthly"},
            {"label": "Salary", "amount": 8000, "date": start_date.replace(day=5).isoformat(), "repeat": "monthly"},
            {"label": "Electricity", "amount": 2500, "date": start_date.replace(day=10).isoformat(), "repeat": "monthly"},
        ]

    for obl in obligations:
        obl_date = date.fromisoformat(obl["date"])
        d = obl_date
        while d <= dates[-1]:
            if d >= start_date:
                bank_rows.append({
                    "date": d.isoformat(),
                    "description": f"NEFT/DR/{rng.integers(100000, 999999)}/{obl['label'].upper()}",
                    "debit": obl["amount"],
                    "credit": 0,
                })
            if obl["repeat"] == "monthly":
                month = d.month + 1
                year = d.year
                if month > 12:
                    month = 1
                    year += 1
                import calendar
                max_day = calendar.monthrange(year, month)[1]
                d = date(year, month, min(d.day, max_day))
            elif obl["repeat"] == "weekly":
                d += timedelta(days=7)
            else:
                break

    # (v) ATM withdrawals randomly
    for d in dates:
        if rng.uniform() < 0.05:  # ~5% of days
            amt = rng.integers(2, 10) * 1000
            bank_rows.append({
                "date": d.isoformat(),
                "description": f"ATM/CASH WDL/{rng.integers(10000, 99999)}",
                "debit": int(amt),
                "credit": 0,
            })

    bank_df = pd.DataFrame(bank_rows).sort_values("date").reset_index(drop=True)

    # Meta
    meta = {
        "name": name,
        "as_of": as_of.isoformat(),
        "category": category,
        "bank0": bank0,
        "drawer0": drawer0,
        "obligations": obligations,
        "floor": floor,
        "festival_id": festival_id,
        "festival_date": festival_dates.get(str(as_of.year), festival_dates.get(max(festival_dates.keys()))),
    }

    # Truth (for reveal and benchmark)
    truth = {
        "dates": [d.isoformat() for d in dates],
        "true_sales": true_sales,
        "true_cash": true_cash,
        "s_shop": s_shop,
        "q_shop": q_shop,
    }

    return {
        "upi_df": upi_df,
        "bank_df": bank_df,
        "meta": meta,
        "truth": truth,
    }


def save_shop(bundle: dict, output_dir: Path):
    """Write a shop bundle to disk."""
    output_dir.mkdir(parents=True, exist_ok=True)
    bundle["upi_df"].to_csv(output_dir / "upi.csv", index=False)
    bundle["bank_df"].to_csv(output_dir / "bank.csv", index=False)
    with open(output_dir / "meta.json", "w", encoding="utf-8") as f:
        json.dump(bundle["meta"], f, indent=2, ensure_ascii=False)
    with open(output_dir / "truth.json", "w", encoding="utf-8") as f:
        json.dump(bundle["truth"], f, indent=2)


DIWALI_DATES = {
    "2023": "2023-11-12",
    "2024": "2024-11-01",
    "2025": "2025-10-20",
    "2026": "2026-11-08",
}


def generate_all_samples():
    """Generate the three sample shops per §7.2."""
    samples_dir = Path(__file__).resolve().parent.parent / "samples"

    # Sharma Kirana — cash-heavy, long history
    sharma = generate_shop(
        seed=1001,
        s_shop=0.40,
        q_shop=0.70,
        category="kirana",
        base_daily=12000,
        history_days=800,
        annual_growth=0.08,
        festival_id="diwali",
        festival_dates=DIWALI_DATES,
        as_of=date(2026, 9, 22),
        bank0=85000,
        drawer0=35000,
        floor=20000,
        name="Sharma Kirana",
    )
    save_shop(sharma, samples_dir / "sharma_kirana")

    # Patel General — mixed, medium history
    patel = generate_shop(
        seed=2002,
        s_shop=0.65,
        q_shop=0.90,
        category="gifts_puja",
        base_daily=18000,
        history_days=300,
        annual_growth=0.12,
        festival_id="diwali",
        festival_dates=DIWALI_DATES,
        as_of=date(2026, 9, 22),
        bank0=120000,
        drawer0=25000,
        floor=25000,
        name="Patel General Store",
    )
    save_shop(patel, samples_dir / "patel_general")

    # New Shop — short history
    new_shop = generate_shop(
        seed=3003,
        s_shop=0.55,
        q_shop=0.50,
        category="kirana",
        base_daily=8000,
        history_days=45,
        annual_growth=0.05,
        festival_id="diwali",
        festival_dates=DIWALI_DATES,
        as_of=date(2026, 9, 22),
        bank0=40000,
        drawer0=15000,
        floor=10000,
        name="New Shop",
    )
    save_shop(new_shop, samples_dir / "new_shop")

    print(f"Generated 3 sample shops in {samples_dir}")


if __name__ == "__main__":
    generate_all_samples()
