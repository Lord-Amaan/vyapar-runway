"""Blind-spot posterior — §6.3 of the build spec.

Grid-based Bayesian inference for the UPI share of true sales.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

import numpy as np
from scipy.stats import beta as beta_dist

from .config import p, get_category


# ── Grid ────────────────────────────────────────────────────────────

def _build_grid() -> np.ndarray:
    return np.linspace(p("grid_lo"), p("grid_hi"), p("grid_size"))


GRID = _build_grid()


# ── Prior ───────────────────────────────────────────────────────────

def prior_density(grid: np.ndarray | None = None) -> np.ndarray:
    """Beta(2,2) prior: density ∝ s(1-s)."""
    g = grid if grid is not None else GRID
    alpha, beta_val = p("prior_alpha"), p("prior_beta")
    density = beta_dist.pdf(g, alpha, beta_val)
    density /= density.sum()
    return density


# ── Likelihoods ─────────────────────────────────────────────────────

def likelihood_e1(grid: np.ndarray, u_w: float, d_w: float) -> np.ndarray:
    """E1: Cash deposits. Sigmoid likelihood."""
    tau = p("e1_tau")
    s_max = u_w / (u_w + d_w)
    return 1.0 / (1.0 + np.exp((grid - s_max) / tau))


def likelihood_e2(
    grid: np.ndarray,
    u_w: float,
    p_w: float,
    q: float,
    sigma_q: float,
    category: str,
) -> np.ndarray:
    """E2: Stock bought digitally. Log-normal likelihood."""
    cat = get_category(category)
    m_lo, m_hi = cat["m_lo"], cat["m_hi"]
    m_mid = (m_lo + m_hi) / 2.0
    sigma_m = (math.log(1 - m_lo) - math.log(1 - m_hi)) / (2 * 1.2816)
    s_imp = p_w / (q * (1 - m_mid))
    sigma_inv = p("e2_sigma_inv")
    sigma_sq = sigma_m**2 + sigma_q**2 + sigma_inv**2
    ln_s_imp = math.log(s_imp)
    # L2(s) = exp(-(ln(U_W/s) - ln S_imp)^2 / (2σ²))
    with np.errstate(divide="ignore", invalid="ignore"):
        ln_ratio = np.log(u_w / grid) - ln_s_imp
    return np.exp(-ln_ratio**2 / (2 * sigma_sq))


def likelihood_e3(grid: np.ndarray, cash_counts: list[tuple[float, float]]) -> np.ndarray:
    """E3: Cash counts. Product of Gaussians on s_d."""
    sigma = p("e3_sigma")
    result = np.ones_like(grid)
    for u_d, c_d in cash_counts:
        s_d = u_d / (u_d + c_d)
        result *= np.exp(-((grid - s_d) ** 2) / (2 * sigma**2))
    return result


def likelihood_e4(grid: np.ndarray, n_cash_of_10: int) -> np.ndarray:
    """E4: Owner guess. Gaussian on s_o."""
    sigma = p("e4_sigma")
    s_o = 1.0 - n_cash_of_10 / 10.0
    return np.exp(-((grid - s_o) ** 2) / (2 * sigma**2))


# ── Posterior computation ───────────────────────────────────────────

@dataclass
class EvidenceInput:
    """Collected evidence for the blind-spot estimator."""
    u_w: float = 0.0                         # Total UPI in window
    d_w: float = 0.0                         # Cash deposits in window (E1)
    d_w_source: str = ""                     # "bank" or "manual" or ""
    bank_uploaded: bool = False              # Whether bank file was uploaded
    p_w: float = 0.0                         # Digital purchases in window (E2)
    p_w_supplier_count: int = 0              # Number of tagged suppliers
    digital_share: str | None = None         # "almost_all"|"most"|"half"|"less"|None
    window_days: int = 0                     # Length of evidence window
    category: str = "kirana"                 # Shop category
    cash_counts: list[tuple[float, float]] = None  # [(u_d, c_d), ...]
    owner_cash_of_10: int | None = None      # 0-10 or None

    def __post_init__(self):
        if self.cash_counts is None:
            self.cash_counts = []


@dataclass
class EvidenceResult:
    s_p10: float
    s_p50: float
    s_p90: float
    display_lo: int   # floor to 5%
    display_hi: int   # ceil to 5%
    confidence: str   # "narrow", "medium", "wide"
    sources: list[dict]
    skipped: list[dict]
    disagreement: dict | None
    posterior: np.ndarray         # full posterior on GRID
    non_owner_posterior: np.ndarray | None


def _percentile_from_cdf(grid: np.ndarray, pdf: np.ndarray, pct: float) -> float:
    cdf = np.cumsum(pdf)
    cdf /= cdf[-1]
    idx = np.searchsorted(cdf, pct)
    idx = min(idx, len(grid) - 1)
    return float(grid[idx])


def _bar_range(pdf: np.ndarray, grid: np.ndarray) -> tuple[float, float]:
    """10th–90th percentile of a normalised pdf on grid."""
    total = pdf.sum()
    if total <= 0:
        return (float(grid[0]), float(grid[-1]))
    normed = pdf / total
    lo = _percentile_from_cdf(grid, normed, 0.10)
    hi = _percentile_from_cdf(grid, normed, 0.90)
    return (lo, hi)


def floor5(x: float) -> int:
    return int(math.floor(x / 5.0) * 5)


def ceil5(x: float) -> int:
    return int(math.ceil(x / 5.0) * 5)


def compute_posterior(ev: EvidenceInput) -> EvidenceResult:
    """Run the full blind-spot estimation per §6.3."""
    grid = GRID
    prior = prior_density(grid)

    sources = []
    skipped = []
    likelihoods = []
    non_owner_likelihoods = []

    # Prior bar
    prior_lo, prior_hi = _bar_range(prior, grid)
    sources.append({
        "id": "prior", "label": "Before any evidence",
        "lo": round(prior_lo, 2), "hi": round(prior_hi, 2),
        "used": True, "weak": True,
    })

    # E1: Cash deposits
    dso = {"almost_all", "most", "half"}
    if ev.d_w > 0 and ev.u_w > 0:
        l1 = likelihood_e1(grid, ev.u_w, ev.d_w)
        likelihoods.append(l1)
        non_owner_likelihoods.append(l1)
        bar = _bar_range(prior * l1, grid)
        sources.append({
            "id": "cash_deposits", "label": "Cash you deposited",
            "lo": round(bar[0], 2), "hi": round(bar[1], 2),
            "used": True, "weak": False,
        })
    elif ev.bank_uploaded and ev.d_w == 0:
        skipped.append({"id": "cash_deposits", "reason": "Bank file uploaded but no cash deposits found"})
    elif not ev.bank_uploaded and not ev.d_w_source:
        skipped.append({"id": "cash_deposits", "reason": "No bank file or manual deposit amount provided"})

    # E2: Stock bought digitally
    ds_options = p("digital_share_options")
    e2_usable = (
        ev.p_w > 0
        and (ev.p_w_supplier_count >= 3 or ev.d_w_source == "manual")
        and ev.window_days >= 28
        and ev.digital_share in ds_options
        and ev.u_w > 0
    )
    if e2_usable:
        opt = ds_options[ev.digital_share]
        l2 = likelihood_e2(grid, ev.u_w, ev.p_w, opt["q"], opt["sigma"], ev.category)
        likelihoods.append(l2)
        non_owner_likelihoods.append(l2)
        bar = _bar_range(prior * l2, grid)
        sources.append({
            "id": "stock_bought", "label": "Stock you bought",
            "lo": round(bar[0], 2), "hi": round(bar[1], 2),
            "used": True, "weak": False,
        })
    else:
        reasons = []
        if ev.p_w <= 0:
            reasons.append("No supplier payment data")
        elif ev.p_w_supplier_count < 3 and ev.d_w_source != "manual":
            reasons.append("Needs 3 or more supplier payments")
        if ev.window_days < 28:
            reasons.append(f"Only {ev.window_days} days of data (need 28)")
        if ev.digital_share not in ds_options:
            reasons.append("Digital share answer not provided or 'Less than half'")
        skipped.append({"id": "stock_bought", "reason": ". ".join(reasons) if reasons else "Not enough data"})

    # E3: Cash counts
    valid_counts = [(u, c) for u, c in ev.cash_counts if u >= 500]
    if valid_counts:
        l3 = likelihood_e3(grid, valid_counts)
        likelihoods.append(l3)
        non_owner_likelihoods.append(l3)
        bar = _bar_range(prior * l3, grid)
        sources.append({
            "id": "cash_counts", "label": f"Your cash counts ({len(valid_counts)})",
            "lo": round(bar[0], 2), "hi": round(bar[1], 2),
            "used": True, "weak": False,
        })

    # E4: Owner guess
    owner_likelihood = None
    if ev.owner_cash_of_10 is not None:
        l4 = likelihood_e4(grid, ev.owner_cash_of_10)
        owner_likelihood = l4
        likelihoods.append(l4)
        s_o = 1.0 - ev.owner_cash_of_10 / 10.0
        bar = _bar_range(prior * l4, grid)
        sources.append({
            "id": "owner_guess",
            "label": f"Your guess ({ev.owner_cash_of_10} of 10)",
            "lo": round(bar[0], 2), "hi": round(bar[1], 2),
            "used": True, "weak": True,
        })

    # Posterior = prior × ∏ likelihoods
    posterior = prior.copy()
    for lk in likelihoods:
        posterior = posterior * lk
        total = posterior.sum()
        if total > 0:
            posterior /= total

    # Non-owner posterior (without E4)
    non_owner_post = None
    if owner_likelihood is not None and non_owner_likelihoods:
        non_owner_post = prior.copy()
        for lk in non_owner_likelihoods:
            non_owner_post = non_owner_post * lk
            total = non_owner_post.sum()
            if total > 0:
                non_owner_post /= total

    # Percentiles
    s_p10 = _percentile_from_cdf(grid, posterior, 0.10)
    s_p50 = _percentile_from_cdf(grid, posterior, 0.50)
    s_p90 = _percentile_from_cdf(grid, posterior, 0.90)

    # Display range (5% steps)
    display_lo = floor5(int(100 * s_p10))
    display_hi = ceil5(int(100 * s_p90 + 0.999))

    # Confidence
    w = s_p90 - s_p10
    thresholds = p("confidence_thresholds")
    if w < thresholds["narrow"]:
        confidence = "narrow"
    elif w <= thresholds["wide"]:
        confidence = "medium"
    else:
        confidence = "wide"

    # Disagreement (F14)
    disagreement = None
    if owner_likelihood is not None and non_owner_post is not None and non_owner_likelihoods:
        s_o = 1.0 - ev.owner_cash_of_10 / 10.0
        nop10 = _percentile_from_cdf(grid, non_owner_post, 0.10)
        nop90 = _percentile_from_cdf(grid, non_owner_post, 0.90)
        nop50 = _percentile_from_cdf(grid, non_owner_post, 0.50)
        if s_o < nop10 - 0.10 or s_o > nop90 + 0.10:
            disagreement = {
                "a": round(100 * (1 - s_o)),
                "b": round(100 * (1 - nop50)),
            }

    return EvidenceResult(
        s_p10=round(s_p10, 4),
        s_p50=round(s_p50, 4),
        s_p90=round(s_p90, 4),
        display_lo=display_lo,
        display_hi=display_hi,
        confidence=confidence,
        sources=sources,
        skipped=skipped,
        disagreement=disagreement,
        posterior=posterior,
        non_owner_posterior=non_owner_post,
    )


def sample_s(posterior: np.ndarray, n: int, rng: np.random.Generator) -> np.ndarray:
    """Inverse-CDF stratified sampling of s from the posterior."""
    grid = GRID
    cdf = np.cumsum(posterior)
    cdf /= cdf[-1]
    # Stratified uniform draws
    u = (np.arange(n) + rng.uniform(size=n)) / n
    indices = np.searchsorted(cdf, u)
    indices = np.clip(indices, 0, len(grid) - 1)
    samples = grid[indices]
    rng.shuffle(samples)
    return samples
