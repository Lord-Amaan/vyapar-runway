"""
simulation.py — Bayesian Cash Posterior & Vectorized Monte Carlo Engine.

Designed for sub-30ms performance on NumPy vectorization.
Computes:
1. Conjugate Beta-Binomial / Gaussian Bayesian update for unrecorded cash share.
2. 2,000-path Monte Carlo trajectory simulation over credit runway horizon.
3. Value-at-Risk (VaR), Probability of Cash Ruin, and quantile fan chart series.
"""
from __future__ import annotations

from typing import Any
import numpy as np


def compute_bayesian_cash_posterior(
    cash_out_of_10: int,
    prior_alpha: float = 4.0,
    prior_beta: float = 6.0,
    observation_weight: float = 8.0,
) -> dict[str, float]:
    """
    Computes conjugate Beta posterior distribution for cash-to-total velocity s.

    Prior: Beta(4, 6) reflects empirical Indian Kirana baseline (~40% cash, std ~0.15).
    Observation: shopkeeper slider value c = cash_out_of_10 / 10.
    Posterior: Beta(alpha_post, beta_post) with analytical quantiles (p10, p50, p90).
    """
    c = max(0.0, min(1.0, cash_out_of_10 / 10.0))
    # Effective sample updates
    alpha_post = prior_alpha + c * observation_weight
    beta_post = prior_beta + (1.0 - c) * observation_weight

    # Analytical mean and variance
    post_mean = alpha_post / (alpha_post + beta_post)
    post_var = (alpha_post * beta_post) / (((alpha_post + beta_post) ** 2) * (alpha_post + beta_post + 1))
    post_std = np.sqrt(post_var)

    # Fast approximate normal-quantile inverse for Beta (well-behaved around alpha, beta >= 4)
    # Using scipy-free Beta quantile approximation via Cornish-Fisher or sample draws
    # A 5,000-draw vector is instant (< 1ms) and exact
    sample = np.random.default_rng(42).beta(alpha_post, beta_post, size=5000)
    p10 = float(np.percentile(sample, 10))
    p50 = float(np.percentile(sample, 50))
    p90 = float(np.percentile(sample, 90))

    return {
        "alphaPost": round(alpha_post, 2),
        "betaPost": round(beta_post, 2),
        "priorMean": round(prior_alpha / (prior_alpha + prior_beta), 3),
        "ownerEstimate": round(c, 2),
        "posteriorMean": float(round(post_mean, 3)),
        "posteriorStd": float(round(post_std, 3)),
        "p10": round(p10, 3),
        "p50": round(p50, 3),
        "p90": round(p90, 3),
    }


def run_monte_carlo_simulation(
    *,
    daily_upi_forecast: list[dict[str, Any]],
    cash_out_of_10: int,
    bank_balance: float = 0.0,
    drawer_cash: float = 0.0,
    daily_fixed_expense: float = 0.0,
    promised_payments: float = 0.0,
    order_amount: float = 0.0,
    due_date: str = "",
    draws: int = 2000,
    seed: int = 42,
) -> dict[str, Any]:
    """
    Simulates 2,000 parallel paths of cumulative cash balance over the horizon.

    Returns:
        - safetyConfidencePct: 100 * (1 - RuinProbability)
        - ruinProbability: fraction of paths hitting balance < 0 before/at due_date
        - p10Buffer: 90% VaR worst-case liquidity buffer on due date
        - p50Buffer: expected median liquidity buffer on due date
        - p90Buffer: optimistic upside liquidity buffer on due date
        - bayesian: posterior distribution parameters
        - dailySeries: [{date, p10, p50, p90}] for fan chart rendering
    """
    rng = np.random.default_rng(seed)
    horizon = len(daily_upi_forecast)
    if horizon == 0:
        return {
            "safetyConfidencePct": 0.0,
            "ruinProbability": 1.0,
            "draws": draws,
            "p10Buffer": 0,
            "p50Buffer": 0,
            "p90Buffer": 0,
            "bayesian": {},
            "dailySeries": [],
        }

    # 1. Compute Bayesian Cash Posterior
    bayes = compute_bayesian_cash_posterior(cash_out_of_10)
    alpha = bayes["alphaPost"]
    beta = bayes["betaPost"]

    # 2. Draw cash share parameter per path: shape (draws,)
    # s is cash share of total sales => total = upi / (1 - s)
    s_draws = rng.beta(alpha, beta, size=draws)
    # Clip to avoid division by zero
    digital_share = np.clip(1.0 - s_draws, 0.05, 0.98)

    # 3. Daily UPI amounts and stochastic volatility
    # Daily forecast values from Prophet
    base_upi = np.array([
        float(d.get("amount") or d.get("bankMoney") or d.get("bank") or 0.0)
        for d in daily_upi_forecast
    ])
    # Assume 15% log-normal daily stochastic noise
    daily_sigma = 0.15
    log_noise = rng.normal(0.0, daily_sigma, size=(draws, horizon))
    # Simulated daily UPI matrix: (draws, horizon)
    sim_upi = base_upi[None, :] * np.exp(log_noise - 0.5 * (daily_sigma ** 2))

    # 4. Total simulated daily revenue = UPI + Cash = UPI / digital_share
    # Shape: (draws, horizon)
    sim_total_daily = sim_upi / digital_share[:, None]

    # 5. Track daily cumulative balance
    # Deduct initial commitments and fixed daily operating expense
    starting_balance = float(bank_balance + drawer_cash - promised_payments)
    balance_matrix = np.zeros((draws, horizon), dtype=np.float64)

    # Find due_date index
    due_idx = horizon - 1
    if due_date:
        for i, d in enumerate(daily_upi_forecast):
            if d.get("date") == due_date:
                due_idx = i
                break

    for t in range(horizon):
        inflow = sim_total_daily[:, t]
        outflow = daily_fixed_expense
        # On due date, deduct restock order amount
        if t == due_idx:
            outflow += float(order_amount)

        if t == 0:
            balance_matrix[:, t] = starting_balance + inflow - outflow
        else:
            balance_matrix[:, t] = balance_matrix[:, t - 1] + inflow - outflow

    # 6. Evaluate Ruin Probability up to due_idx
    # Path is ruined if minimum balance between 0 and due_idx is < 0
    min_balance_before_due = np.min(balance_matrix[:, : due_idx + 1], axis=1)
    ruined_paths = np.sum(min_balance_before_due < 0)
    ruin_prob = float(ruined_paths / draws)
    safety_confidence = float(np.clip(1.0 - ruin_prob, 0.0, 1.0) * 100.0)

    # 7. Buffers at due date
    due_balances = balance_matrix[:, due_idx]
    p10_buffer = float(np.percentile(due_balances, 10))
    p50_buffer = float(np.percentile(due_balances, 50))
    p90_buffer = float(np.percentile(due_balances, 90))

    # 8. Fan chart daily series
    daily_series = []
    for t in range(horizon):
        col = balance_matrix[:, t]
        daily_series.append({
            "date": daily_upi_forecast[t].get("date", f"Day {t+1}"),
            "p10": int(np.round(np.percentile(col, 10))),
            "p50": int(np.round(np.percentile(col, 50))),
            "p90": int(np.round(np.percentile(col, 90))),
        })

    return {
        "safetyConfidencePct": round(safety_confidence, 1),
        "ruinProbability": round(ruin_prob, 4),
        "draws": draws,
        "dueIndex": due_idx,
        "p10Buffer": int(np.round(p10_buffer)),
        "p50Buffer": int(np.round(p50_buffer)),
        "p90Buffer": int(np.round(p90_buffer)),
        "bayesian": bayes,
        "dailySeries": daily_series,
    }
