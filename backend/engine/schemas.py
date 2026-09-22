"""Pydantic v2 schemas — §8.1 of the build spec."""

from __future__ import annotations

from datetime import date
from typing import Literal, Optional

from pydantic import BaseModel, Field


class Obligation(BaseModel):
    label: str
    amount: float = Field(gt=0)
    date: date
    repeat: Literal["none", "weekly", "monthly"] = "none"


class ShopConfig(BaseModel):
    category: str = "kirana"
    bank0: float = Field(ge=0, default=0)
    drawer0: float = Field(ge=0, default=0)
    obligations: list[Obligation] = Field(default_factory=list)
    floor: float = Field(ge=0, default=0)
    festival_id: str = "diwali"
    festival_date: date = date(2026, 11, 8)
    days_on_shelf: int = Field(default=7, ge=0)
    delivery_days: int = Field(default=3, ge=0)
    credit_days: int = Field(default=0, ge=0)
    lift_choice: Optional[float | str] = None  # 1, 1.5, 2, 3, "unsure", null
    owner_cash_of_10: Optional[int] = Field(default=None, ge=0, le=10)
    price_rise_pct: Optional[float] = None


class CashCount(BaseModel):
    date: date
    amount: float = Field(ge=0)


class Order(BaseModel):
    amount: float = Field(gt=0)
    date: date


# --- API request/response models ---


class SessionCreate(BaseModel):
    language: str = "en"


class ManualEvidence(BaseModel):
    weekly_cash_deposit: Optional[float] = None
    purchases_last_4w: Optional[float] = None
    digital_share: Optional[Literal["almost_all", "most", "half", "less"]] = None


class PurchaseTag(BaseModel):
    suppliers: list[str]


class VerdictRequest(BaseModel):
    orders: list[Order]


class PlanRequest(BaseModel):
    target_amount: float = Field(gt=0)


# --- Response helpers ---


class EvidenceSource(BaseModel):
    id: str
    label: str
    lo: float
    hi: float
    used: bool
    weak: bool
    skip_reason: Optional[str] = None


class BlindspotResponse(BaseModel):
    share_seen: dict
    confidence: str
    evidence: list[EvidenceSource]
    skipped: list[dict]
    disagreement: Optional[dict] = None
    next_question: Optional[dict] = None


class ScenarioSet(BaseModel):
    none: float
    likely: float
    high: float


class BreakEvenResult(BaseModel):
    c_star: Optional[float]
    daily_cash_p10: float
    daily_cash_p90: float
    status: str  # "ok", "zero", "unreachable"


class ClockResult(BaseModel):
    order_by: str
    days_left: int
    missed: bool


class ChartData(BaseModel):
    dates: list[str]
    liquid: dict  # p10, p50, p90 arrays
    upi: dict  # p50 array
    cash: dict  # p10, p50, p90 arrays
    floor: float
    markers: list[dict]


class VerdictResponse(BaseModel):
    p_safe: float
    n: int
    label: str
    scenarios: ScenarioSet
    break_even: BreakEvenResult
    clock: ClockResult
    chart: ChartData
    truth: Optional[dict] = None


class Tranche(BaseModel):
    date: str
    amount: float


class Lever(BaseModel):
    id: str
    n: int


class PlanResponse(BaseModel):
    target: float
    affordable_total: float
    fully_affordable: bool
    shortfall: float
    tranches: list[Tranche]
    levers: list[Lever]
    whatsapp_text: str = ""
