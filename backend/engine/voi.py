"""Most-useful-question selector — §6.7 of the build spec."""

from __future__ import annotations

import numpy as np

from .config import p
from .evidence import (
    GRID,
    EvidenceInput,
    compute_posterior,
    _percentile_from_cdf,
    prior_density,
)


def select_next_question(ev: EvidenceInput, posterior: np.ndarray) -> dict | None:
    """Pick the question whose answer would most narrow the posterior."""
    current_p10 = _percentile_from_cdf(GRID, posterior, 0.10)
    current_p90 = _percentile_from_cdf(GRID, posterior, 0.90)
    current_width = current_p90 - current_p10

    candidates = []

    # Cash count is always a candidate
    candidates.append("cash_count")

    # Digital share only if purchase data exists and answer missing
    if ev.p_w > 0 and ev.digital_share is None:
        candidates.append("digital_share")

    if not candidates:
        return None

    best_candidate = None
    best_reduction = -1.0
    n_sim = 40
    rng = np.random.default_rng(42)

    for cand in candidates:
        reductions = []
        for _ in range(n_sim):
            # Draw s* from current posterior
            cdf = np.cumsum(posterior)
            cdf /= cdf[-1]
            u = rng.uniform()
            idx = np.searchsorted(cdf, u)
            idx = min(idx, len(GRID) - 1)
            s_star = GRID[idx]

            # Simulate a reported value
            ev_copy = EvidenceInput(
                u_w=ev.u_w,
                d_w=ev.d_w,
                d_w_source=ev.d_w_source,
                bank_uploaded=ev.bank_uploaded,
                p_w=ev.p_w,
                p_w_supplier_count=ev.p_w_supplier_count,
                digital_share=ev.digital_share,
                window_days=ev.window_days,
                category=ev.category,
                cash_counts=list(ev.cash_counts),
                owner_cash_of_10=ev.owner_cash_of_10,
            )

            if cand == "cash_count":
                s_report = np.clip(s_star + rng.normal(0, 0.10), 0.05, 0.99)
                # Simulate a cash count day
                u_d = max(500, ev.u_w / max(ev.window_days, 1))
                c_d = u_d * (1 - s_report) / s_report
                ev_copy.cash_counts = list(ev.cash_counts) + [(u_d, c_d)]
            elif cand == "digital_share":
                options = ["almost_all", "most", "half"]
                ev_copy.digital_share = rng.choice(options)

            result = compute_posterior(ev_copy)
            new_width = result.s_p90 - result.s_p10
            reductions.append(current_width - new_width)

        mean_reduction = float(np.mean(reductions))
        if mean_reduction > best_reduction:
            best_reduction = mean_reduction
            best_candidate = cand

    if best_candidate == "cash_count":
        # Pick a recent date
        from datetime import date, timedelta
        recent_date = date.today() - timedelta(days=1)
        return {"kind": "cash_count", "date": recent_date.isoformat()}
    elif best_candidate == "digital_share":
        return {"kind": "digital_share"}

    return None
