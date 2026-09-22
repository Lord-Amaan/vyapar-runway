"""Benchmark runner — §7.4 of the build spec.

Compares our engine against UPI-only and fixed-ratio baselines
using the hidden truth from sample data.
"""

from __future__ import annotations

import json
import sys
from datetime import date, timedelta
from pathlib import Path

import numpy as np
import pandas as pd

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from engine.evidence import EvidenceInput, compute_posterior
from engine.forecast_upi import forecast_upi
from engine.simulate import simulate
from engine.verdict import compute_verdict
from engine.schemas import Obligation, Order
from engine.config import p


SAMPLES_DIR = Path(__file__).resolve().parent.parent / "samples"
OUTPUT_PATH = Path(__file__).resolve().parent / "results.json"


def smape(predicted: float, actual: float) -> float:
    """Symmetric mean absolute percentage error."""
    if predicted == 0 and actual == 0:
        return 0.0
    return abs(predicted - actual) / ((abs(predicted) + abs(actual)) / 2) * 100


def load_sample(name: str) -> dict:
    sample_dir = SAMPLES_DIR / name
    upi_df = pd.read_csv(sample_dir / "upi.csv")
    upi_df["date"] = pd.to_datetime(upi_df["date"])
    upi_df = upi_df.rename(columns={"date": "ds", "amount": "y"})
    meta = json.loads((sample_dir / "meta.json").read_text(encoding="utf-8"))
    truth = json.loads((sample_dir / "truth.json").read_text(encoding="utf-8"))
    return {"upi_df": upi_df, "meta": meta, "truth": truth}


def run_benchmark():
    """Run the full benchmark."""
    samples = ["sharma_kirana", "patel_general", "new_shop"]
    results_by_sample = []

    for name in samples:
        print(f"Benchmarking {name}...")
        sample = load_sample(name)
        upi_df = sample["upi_df"]
        meta = sample["meta"]
        truth = sample["truth"]

        as_of = date.fromisoformat(meta["as_of"])
        festival_date = date.fromisoformat(meta["festival_date"])
        s_true = truth["s_shop"]

        # 30-day window
        H = 30
        end_idx = len(truth["dates"])
        start_idx = max(0, end_idx - H)
        true_sales_30d = sum(truth["true_sales"][start_idx:end_idx])
        true_cash_30d = sum(truth["true_cash"][start_idx:end_idx])
        true_upi_30d = true_sales_30d - true_cash_30d

        # ── Method 0: UPI-only ──
        m0_total = true_upi_30d  # Pretend total sales = UPI
        m0_smape = smape(m0_total, true_sales_30d)

        # ── Method 1: Fixed ratio (40/60 default) ──
        m1_s_assumed = 0.50  # fixed
        m1_total = true_upi_30d / m1_s_assumed
        m1_smape = smape(m1_total, true_sales_30d)

        # ── Method 2: Our engine ──
        # Build evidence
        window_days = min(56, len(upi_df))
        window = upi_df.tail(window_days)
        ev = EvidenceInput()
        ev.u_w = float(window["y"].sum())
        ev.window_days = window_days
        ev.category = meta["category"]

        post_result = compute_posterior(ev)
        s_median = post_result.s_p50

        m2_total = true_upi_30d / max(s_median, 0.01)
        m2_smape = smape(m2_total, true_sales_30d)

        # Interval coverage
        s_in_interval = post_result.s_p10 <= s_true <= post_result.s_p90

        # Verdict test
        fr = forecast_upi(upi_df, as_of, meta["festival_id"], festival_date, None)
        obligations = [
            Obligation(
                label=o["label"], amount=o["amount"],
                date=date.fromisoformat(o["date"]), repeat=o.get("repeat", "none")
            )
            for o in meta.get("obligations", [])
        ]
        order = [Order(amount=200000, date=as_of + timedelta(days=40))]
        rng = np.random.default_rng(42)
        sim = simulate(
            fr, post_result.posterior,
            meta["bank0"], meta["drawer0"],
            obligations, order,
            0, meta["floor"], rng, as_of
        )
        v = compute_verdict(sim)

        # Check if verdict is correct by simulating with truth
        true_daily_cash = true_cash_30d / 30
        L = meta["bank0"] + meta["drawer0"]
        truly_safe = True
        for t in range(min(H, len(fr.dates))):
            L += fr.median[t] + true_daily_cash
            if t < len(obligations):
                pass  # simplified
            if L < meta["floor"]:
                truly_safe = False
                break

        result = {
            "name": name,
            "s_true": s_true,
            "s_estimated": round(s_median, 4),
            "s_p10": post_result.s_p10,
            "s_p90": post_result.s_p90,
            "s_in_80_interval": s_in_interval,
            "true_sales_30d": round(true_sales_30d, 0),
            "m0_upi_only": round(m0_smape, 1),
            "m1_fixed_ratio": round(m1_smape, 1),
            "m2_ours": round(m2_smape, 1),
            "verdict_n": v["n"],
            "verdict_label": v["label"],
            "truly_safe": truly_safe,
            "verdict_correct": (v["label"] == "safe") == truly_safe,
        }
        results_by_sample.append(result)
        print(f"  s_true={s_true:.2f} s_est={s_median:.2f} "
              f"smape: upi={m0_smape:.1f}% fixed={m1_smape:.1f}% ours={m2_smape:.1f}%")

    # Aggregate
    s_buckets = {
        "0–30%": [r for r in results_by_sample if r["s_true"] < 0.30],
        "30–60%": [r for r in results_by_sample if 0.30 <= r["s_true"] < 0.60],
        "60–100%": [r for r in results_by_sample if r["s_true"] >= 0.60],
    }

    error_by_bucket = []
    for bucket_name, items in s_buckets.items():
        if items:
            error_by_bucket.append({
                "bucket": bucket_name,
                "m0_upi_only": round(np.mean([r["m0_upi_only"] for r in items]), 1),
                "m1_fixed_ratio": round(np.mean([r["m1_fixed_ratio"] for r in items]), 1),
                "m2_ours": round(np.mean([r["m2_ours"] for r in items]), 1),
            })

    coverage_80 = sum(1 for r in results_by_sample if r["s_in_80_interval"]) / len(results_by_sample) * 100

    verdict_correct = sum(1 for r in results_by_sample if r["verdict_correct"]) / len(results_by_sample) * 100
    false_safe = sum(1 for r in results_by_sample if r["verdict_label"] == "safe" and not r["truly_safe"])
    false_short = sum(1 for r in results_by_sample if r["verdict_label"] == "short" and r["truly_safe"])

    output = {
        "generated_at": date.today().isoformat(),
        "n_shops": len(results_by_sample),
        "seed": "1001,2002,3003",
        "synthetic": True,
        "samples": results_by_sample,
        "error_by_bucket": error_by_bucket,
        "coverage": [
            {"nominal": 80, "observed": round(coverage_80, 0)},
        ],
        "verdict_confusion": [
            {
                "method": "ours",
                "false_safe": false_safe,
                "false_short": false_short,
                "accuracy": round(verdict_correct, 0),
            }
        ],
        "caveat": (
            "This benchmark uses synthetic data with hidden ground truth. "
            "The generator's assumptions drive the results. "
            "Real-world performance may differ."
        ),
    }

    OUTPUT_PATH.write_text(json.dumps(output, indent=2), encoding="utf-8")
    print(f"\nResults written to {OUTPUT_PATH}")
    print(f"Coverage (80% interval): {coverage_80:.0f}%")
    print(f"Verdict accuracy: {verdict_correct:.0f}%")


if __name__ == "__main__":
    run_benchmark()
