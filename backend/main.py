from __future__ import annotations

import json
import logging
import os
import sys
from contextlib import asynccontextmanager
from datetime import date, timedelta
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, Request, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, field_validator
from starlette.exceptions import HTTPException as StarletteHTTPException

from forecast_model import build_predictions, build_predictions_from_upload

# ── new engine imports ────────────────────────────────────────────
from engine.schemas import (
    SessionCreate, ShopConfig, CashCount, ManualEvidence,
    PurchaseTag, VerdictRequest, PlanRequest, Order,
)
from engine.sessions import store
from engine.parsing_upi import parse_upi_file
from engine.parsing_bank import parse_bank_file
from engine.evidence import EvidenceInput, compute_posterior, sample_s
from engine.forecast_upi import forecast_upi, compute_horizon, draw_upi
from engine.simulate import simulate
from engine.verdict import compute_verdict, compute_scenarios, compute_break_even_with_ranges
from engine.planner import compute_plan
from engine.clock import compute_clock
from engine.voi import select_next_question
from engine.config import p, ENGINE_PARAMS

import numpy as np
import pandas as pd

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(name)s %(levelname)s  %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)

# ── in-memory cache filled once at startup ─────────────────────────
_predictions: list[dict] = []
_model_info: dict = {}


@asynccontextmanager
async def lifespan(app: FastAPI):  # noqa: ANN001, ARG001
    global _predictions, _model_info  # noqa: PLW0603
    logger.info("Building predictions (this runs once at startup) …")
    try:
        _predictions, _model_info = build_predictions()
        logger.info("Startup complete — %d predictions cached", len(_predictions))
    except Exception as exc:
        logger.warning("Legacy predictions failed (non-blocking): %s", exc)
        _model_info = {"status": "legacy_skipped"}
    yield


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type"],
)


# ── helper ─────────────────────────────────────────────────────────

SAMPLES_DIR = Path(__file__).resolve().parent / "samples"


def _get_session(session_id: str):
    s = store.get(session_id)
    if s is None:
        raise ValueError("Session expired or not found")
    return s


def _build_evidence_input(session) -> EvidenceInput:
    """Build an EvidenceInput from session state."""
    ev = EvidenceInput()
    ev.category = session.shop.category if session.shop else "kirana"

    if session.upi_daily is not None:
        df = session.upi_daily
        window_days = min(56, len(df))
        window = df.tail(window_days)
        ev.u_w = float(window["y"].sum())
        ev.window_days = window_days

    if session.bank_summary:
        ev.bank_uploaded = True
        ev.d_w = session.bank_summary.get("cash_deposit_total", 0)
        ev.d_w_source = "bank"

        # Purchase total from tagged suppliers
        if session.tagged_suppliers and session.bank_data is not None:
            bank_df = session.bank_data["df"]
            supplier_debits = bank_df[
                bank_df["description"].str.upper().apply(
                    lambda d: any(s.upper() in d for s in session.tagged_suppliers)
                )
            ]
            ev.p_w = float(supplier_debits["debit"].sum()) if len(supplier_debits) > 0 else 0
            ev.p_w_supplier_count = len(session.tagged_suppliers)

    if session.manual:
        m = session.manual
        if m.weekly_cash_deposit is not None and m.weekly_cash_deposit > 0:
            ev.d_w = m.weekly_cash_deposit * ev.window_days / 7.0
            ev.d_w_source = "manual"
        if m.purchases_last_4w is not None and m.purchases_last_4w > 0:
            ev.p_w = m.purchases_last_4w * ev.window_days / 28.0
            ev.p_w_supplier_count = 3  # manual counts as sufficient
        if m.digital_share:
            ev.digital_share = m.digital_share

    if session.shop and session.shop.owner_cash_of_10 is not None:
        ev.owner_cash_of_10 = session.shop.owner_cash_of_10

    # Cash counts
    if session.cash_counts and session.upi_daily is not None:
        df = session.upi_daily
        counts = []
        for cc in session.cash_counts:
            # Find UPI amount for that date
            day_data = df[df["ds"].dt.date == cc.date]
            u_d = float(day_data["y"].sum()) if len(day_data) > 0 else 0
            counts.append((u_d, cc.amount))
        ev.cash_counts = counts

    return ev


# ── routes ─────────────────────────────────────────────────────────


@app.get("/api/health")
async def health():
    prophet_enabled = os.environ.get("ENABLE_PROPHET", "false").lower() == "true"
    return {
        "status": "ok",
        "prophet_enabled": prophet_enabled,
        "python": f"{sys.version_info.major}.{sys.version_info.minor}",
        "model": _model_info,
    }


# ── New session-based API (§8.2) ──────────────────────────────────


@app.post("/api/session")
async def create_session(req: SessionCreate):
    s = store.create(req.language)
    return {"session_id": s.session_id}


@app.post("/api/session/{session_id}/upi")
async def upload_upi(session_id: str, file: UploadFile = File(...), mapping: str = Form(None)):
    try:
        s = _get_session(session_id)
    except ValueError:
        return JSONResponse(status_code=410, content={"error": {"code": "expired", "message": "Session expired or not found"}})

    raw = await file.read()
    if len(raw) > p("max_file_bytes"):
        return JSONResponse(status_code=413, content={"error": {"code": "too_large", "message": "File must be smaller than 5 MB"}})

    mapping_dict = json.loads(mapping) if mapping else None
    try:
        result = await run_in_threadpool(parse_upi_file, raw, mapping_dict)
    except ValueError as exc:
        msg = str(exc)
        if msg.startswith("needs_mapping"):
            parts = msg.split("|", 2)
            return JSONResponse(status_code=422, content={
                "needs_mapping": True,
                "headers": json.loads(parts[1]) if len(parts) > 1 else [],
                "sample_rows": json.loads(parts[2]) if len(parts) > 2 else [],
            })
        return JSONResponse(status_code=422, content={"error": {"code": "parse_error", "message": msg}})

    s.upi_daily = result["df"]
    s.upi_summary = {k: v for k, v in result.items() if k != "df"}
    return s.upi_summary


@app.post("/api/session/{session_id}/bank")
async def upload_bank(session_id: str, file: UploadFile = File(...), mapping: str = Form(None)):
    try:
        s = _get_session(session_id)
    except ValueError:
        return JSONResponse(status_code=410, content={"error": {"code": "expired", "message": "Session expired or not found"}})

    raw = await file.read()
    if len(raw) > p("max_file_bytes"):
        return JSONResponse(status_code=413, content={"error": {"code": "too_large", "message": "File must be smaller than 5 MB"}})

    mapping_dict = json.loads(mapping) if mapping else None
    try:
        result = await run_in_threadpool(parse_bank_file, raw, mapping_dict)
    except ValueError as exc:
        return JSONResponse(status_code=422, content={"error": {"code": "parse_error", "message": str(exc)}})

    s.bank_data = result
    s.bank_summary = {k: v for k, v in result.items() if k != "df"}

    # Scale to evidence window
    window_days = min(56, len(s.upi_daily)) if s.upi_daily is not None else 56
    return {
        "cash_deposit_total_in_window": s.bank_summary["cash_deposit_total"],
        "cash_deposit_count": s.bank_summary["cash_deposit_count"],
        "top_debits": s.bank_summary["top_debits"],
        "warnings": s.bank_summary.get("warnings", []),
    }


@app.put("/api/session/{session_id}/purchases")
async def tag_purchases(session_id: str, req: PurchaseTag):
    try:
        s = _get_session(session_id)
    except ValueError:
        return JSONResponse(status_code=410, content={"error": {"code": "expired", "message": "Session expired or not found"}})

    s.tagged_suppliers = req.suppliers

    # Compute purchase total
    purchase_total = 0.0
    txn_count = 0
    if s.bank_data and "df" in s.bank_data:
        bank_df = s.bank_data["df"]
        for _, row in bank_df.iterrows():
            desc = str(row.get("description", "")).upper()
            if any(sup.upper() in desc for sup in req.suppliers):
                purchase_total += float(row.get("debit", 0))
                txn_count += 1

    return {"purchase_total_in_window": round(purchase_total, 2), "txn_count": txn_count}


@app.put("/api/session/{session_id}/manual")
async def set_manual(session_id: str, req: ManualEvidence):
    try:
        s = _get_session(session_id)
    except ValueError:
        return JSONResponse(status_code=410, content={"error": {"code": "expired", "message": "Session expired or not found"}})

    s.manual = req
    return {"ok": True}


@app.put("/api/session/{session_id}/shop")
async def set_shop(session_id: str, req: ShopConfig):
    try:
        s = _get_session(session_id)
    except ValueError:
        return JSONResponse(status_code=410, content={"error": {"code": "expired", "message": "Session expired or not found"}})

    if len(req.obligations) > p("max_obligations"):
        return JSONResponse(status_code=422, content={"error": {"code": "too_many", "message": f"Maximum {p('max_obligations')} obligations"}})

    s.shop = req

    # Compute derived values
    today = date.today()
    clock = compute_clock(req.festival_date, req.days_on_shelf, req.delivery_days, today)

    # Default floor = sum of obligations due in next 7 days
    default_floor = sum(
        o.amount for o in req.obligations
        if (o.date - today).days <= 7 and (o.date - today).days >= 0
    )

    return {
        "derived": {
            **clock,
            "default_floor": round(default_floor, 2),
        }
    }


@app.post("/api/session/{session_id}/cashcount")
async def add_cashcount(session_id: str, req: CashCount):
    try:
        s = _get_session(session_id)
    except ValueError:
        return JSONResponse(status_code=410, content={"error": {"code": "expired", "message": "Session expired or not found"}})

    if len(s.cash_counts) >= p("max_cash_counts"):
        return JSONResponse(status_code=422, content={
            "error": {"code": "too_many", "message": f"Maximum {p('max_cash_counts')} cash counts"}
        })

    count_id = len(s.cash_counts)
    s.cash_counts.append(req)
    return {"count_id": count_id}


@app.delete("/api/session/{session_id}/cashcount/{count_id}")
async def delete_cashcount(session_id: str, count_id: int):
    try:
        s = _get_session(session_id)
    except ValueError:
        return JSONResponse(status_code=410, content={"error": {"code": "expired", "message": "Session expired or not found"}})

    if 0 <= count_id < len(s.cash_counts):
        s.cash_counts.pop(count_id)
    return {"ok": True}


@app.get("/api/session/{session_id}/blindspot")
async def get_blindspot(session_id: str):
    try:
        s = _get_session(session_id)
    except ValueError:
        return JSONResponse(status_code=410, content={"error": {"code": "expired", "message": "Session expired or not found"}})

    if s.upi_daily is None:
        return JSONResponse(status_code=422, content={"error": {"code": "no_data", "message": "Upload a UPI file first"}})

    ev = _build_evidence_input(s)
    result = await run_in_threadpool(compute_posterior, ev)

    # Next question
    nq = select_next_question(ev, result.posterior)

    return {
        "share_seen": {
            "p10": result.s_p10,
            "p50": result.s_p50,
            "p90": result.s_p90,
            "display": {"lo": result.display_lo, "hi": result.display_hi},
        },
        "confidence": result.confidence,
        "evidence": result.sources,
        "skipped": result.skipped,
        "disagreement": result.disagreement,
        "next_question": nq,
    }


@app.post("/api/session/{session_id}/verdict")
async def post_verdict(session_id: str, req: VerdictRequest):
    try:
        s = _get_session(session_id)
    except ValueError:
        return JSONResponse(status_code=410, content={"error": {"code": "expired", "message": "Session expired or not found"}})

    if s.upi_daily is None or s.shop is None:
        return JSONResponse(status_code=422, content={"error": {"code": "incomplete", "message": "Upload data and set up your shop first"}})

    shop = s.shop
    today = date.today()
    if s.is_sample and s.truth:
        # Use sample's as_of date
        today = date.fromisoformat(json.loads(open(SAMPLES_DIR / s.sample_name / "meta.json").read())["as_of"])

    # Build forecast
    fr = forecast_upi(
        s.upi_daily, today, shop.festival_id, shop.festival_date,
        shop.lift_choice
    )

    # Build evidence and posterior
    ev = _build_evidence_input(s)
    post_result = compute_posterior(ev)

    # Simulate
    rng = s.rng()
    sim = simulate(
        fr, post_result.posterior, shop.bank0, shop.drawer0,
        shop.obligations, req.orders, shop.credit_days,
        shop.floor, rng, today
    )

    # Verdict
    v = compute_verdict(sim)

    # Scenarios
    scenarios = await run_in_threadpool(
        compute_scenarios,
        fr, post_result.posterior, shop.bank0, shop.drawer0,
        shop.obligations, req.orders, shop.credit_days,
        shop.floor, s.seed
    )

    # Break-even
    be = compute_break_even_with_ranges(
        fr, sim, shop.bank0, shop.drawer0,
        shop.obligations, req.orders, shop.credit_days, shop.floor
    )

    # Clock
    clock = compute_clock(shop.festival_date, shop.days_on_shelf, shop.delivery_days, today)

    # Chart data
    chart = {
        "dates": [d.isoformat() for d in fr.dates],
        "liquid": sim.liquid_percentiles(),
        "upi": sim.upi_percentiles(),
        "cash": sim.cash_percentiles(),
        "floor": shop.floor,
        "markers": [
            {"type": "festival", "date": shop.festival_date.isoformat()},
        ],
    }

    # Truth overlay (samples only)
    truth = None
    if s.is_sample and s.truth:
        truth = s.truth

    return {
        "p_safe": v["p_safe"],
        "n": v["n"],
        "label": v["label"],
        "scenarios": scenarios,
        "break_even": be,
        "clock": clock,
        "chart": chart,
        "truth": truth,
    }


@app.post("/api/session/{session_id}/plan")
async def post_plan(session_id: str, req: PlanRequest):
    try:
        s = _get_session(session_id)
    except ValueError:
        return JSONResponse(status_code=410, content={"error": {"code": "expired", "message": "Session expired or not found"}})

    if s.upi_daily is None or s.shop is None:
        return JSONResponse(status_code=422, content={"error": {"code": "incomplete", "message": "Upload data and set up your shop first"}})

    shop = s.shop
    today = date.today()

    fr = forecast_upi(
        s.upi_daily, today, shop.festival_id, shop.festival_date,
        shop.lift_choice
    )
    ev = _build_evidence_input(s)
    post_result = compute_posterior(ev)

    clock = compute_clock(shop.festival_date, shop.days_on_shelf, shop.delivery_days, today)
    order_by = date.fromisoformat(clock["order_by"])

    plan = await run_in_threadpool(
        compute_plan,
        fr, post_result.posterior, shop.bank0, shop.drawer0,
        shop.obligations, req.target_amount, shop.credit_days,
        shop.floor, order_by, today, clock["missed"], s.seed
    )

    return plan


@app.post("/api/session/{session_id}/sample/{name}")
async def load_sample(session_id: str, name: str, reveal: bool = False):
    try:
        s = _get_session(session_id)
    except ValueError:
        return JSONResponse(status_code=410, content={"error": {"code": "expired", "message": "Session expired or not found"}})

    sample_dir = SAMPLES_DIR / name
    if not sample_dir.exists():
        return JSONResponse(status_code=404, content={"error": {"code": "not_found", "message": f"Sample '{name}' not found"}})

    # Load sample data
    upi_df = pd.read_csv(sample_dir / "upi.csv")
    upi_df["date"] = pd.to_datetime(upi_df["date"])
    upi_df = upi_df.rename(columns={"date": "ds", "amount": "y"})

    bank_raw = (sample_dir / "bank.csv").read_bytes()
    meta = json.loads((sample_dir / "meta.json").read_text(encoding="utf-8"))
    truth = json.loads((sample_dir / "truth.json").read_text(encoding="utf-8"))

    s.upi_daily = upi_df
    s.upi_summary = {
        "days": len(upi_df),
        "first_date": upi_df["ds"].min().strftime("%Y-%m-%d"),
        "last_date": upi_df["ds"].max().strftime("%Y-%m-%d"),
        "total": round(float(upi_df["y"].sum()), 2),
        "warnings": [],
        "zero_filled_days": 0,
        "tier": 2 if len(upi_df) >= 60 else 3,
    }

    # Parse bank
    try:
        bank_result = parse_bank_file(bank_raw)
        s.bank_data = bank_result
        s.bank_summary = {k: v for k, v in bank_result.items() if k != "df"}
    except Exception:
        pass

    # Auto-tag suppliers from truth
    if s.bank_summary and s.bank_summary.get("top_debits"):
        s.tagged_suppliers = [d["name"] for d in s.bank_summary["top_debits"][:3]]

    # Set shop config from meta
    festival_date = date.fromisoformat(meta["festival_date"])
    obligations = [
        from_dict_to_obligation(o) for o in meta.get("obligations", [])
    ]
    s.shop = ShopConfig(
        category=meta["category"],
        bank0=meta["bank0"],
        drawer0=meta["drawer0"],
        obligations=obligations,
        floor=meta["floor"],
        festival_id=meta["festival_id"],
        festival_date=festival_date,
    )

    s.is_sample = True
    s.sample_name = name
    if reveal:
        s.truth = truth
    else:
        s.truth = None

    return {
        "session_id": s.session_id,
        "name": meta["name"],
        "upi_summary": s.upi_summary,
        "bank_summary": s.bank_summary,
        "shop": meta,
        "truth": truth if reveal else None,
    }


def from_dict_to_obligation(d: dict):
    from engine.schemas import Obligation
    return Obligation(
        label=d["label"],
        amount=d["amount"],
        date=date.fromisoformat(d["date"]),
        repeat=d.get("repeat", "none"),
    )


@app.get("/api/benchmark")
async def get_benchmark():
    results_path = Path(__file__).resolve().parent / "benchmark" / "results.json"
    if not results_path.exists():
        return JSONResponse(status_code=404, content={"error": {"code": "not_found", "message": "Benchmark results not generated yet"}})
    return json.loads(results_path.read_text(encoding="utf-8"))


# ── legacy routes (deprecated, kept for backward compat) ──────────


@app.get("/api/predict")
async def predict():
    return _predictions


@app.post("/api/forecast")
async def forecast(file: UploadFile = File(...)):
    """Forecast uploaded UPI/POS history without replacing the sample cache."""
    if not file.filename or not file.filename.lower().endswith(".csv"):
        return JSONResponse(status_code=400, content={"error": "Please upload a CSV file"})

    raw = await file.read()
    if len(raw) > 5 * 1024 * 1024:
        return JSONResponse(status_code=413, content={"error": "CSV file must be smaller than 5 MB"})

    try:
        predictions, model_info = await run_in_threadpool(build_predictions_from_upload, raw)
    except ValueError as exc:
        return JSONResponse(status_code=422, content={"error": str(exc)})
    except Exception:  # noqa: BLE001
        logger.exception("uploaded forecast failed")
        return JSONResponse(status_code=500, content={"error": "Could not build a forecast from this file"})

    return {"predictions": predictions, "model": model_info}


# ── advisor ────────────────────────────────────────────────────────

_FALLBACK_IDEAS: list[str] = [
    "Run a pre-booking offer. Message regular customers on WhatsApp and take advance payment for festival stock.",
    "Clear old stock. Put slow items on a short discount sale to turn them into cash this week.",
    "Ask your wholesaler for 7 extra days, or offer a post-dated cheque for part of the payment.",
]

_ADVISOR_PROMPT_TEMPLATE = (
    "You are a helpful retail advisor for an Indian shopkeeper. "
    "The shopkeeper is short by ₹{amount} to pay a wholesaler on {due_date}. "
    "Their shop picture is: ₹{bank_today} in the bank today, ₹{drawer_cash} in the drawer today, "
    "₹{expected_upi} expected from UPI, ₹{expected_cash} expected from cash sales, "
    "₹{money_going_out} going out, and ₹{promised_payments} already owed. "
    "The planned order is ₹{order_amount}. "
    "Give exactly 3 short, practical ideas to raise this cash within a week. "
    "Use local options such as a clearance sale on slow stock, WhatsApp pre-booking with regular customers, "
    "or asking the wholesaler for a few extra days or a post-dated cheque. "
    "Use simple words a shopkeeper would use. "
    "One or two short sentences per idea, each under 15 words. "
    "No finance jargon. Do not suggest loans. "
    "Return only a JSON array of 3 strings."
)


class AdvisorRequest(BaseModel):
    shortfall: int
    dueDate: str
    bankToday: int = 0
    drawerCash: int = 0
    expectedUpi: int = 0
    expectedCash: int = 0
    moneyGoingOut: int = 0
    promisedPayments: int = 0
    orderAmount: int = 0

    @field_validator("shortfall")
    @classmethod
    def shortfall_range(cls, v: int) -> int:
        if v <= 0 or v > 100_000_000:
            raise ValueError("shortfall must be between 1 and 100000000")
        return v

    @field_validator(
        "bankToday",
        "drawerCash",
        "expectedUpi",
        "expectedCash",
        "moneyGoingOut",
        "promisedPayments",
        "orderAmount",
    )
    @classmethod
    def amounts_nonnegative(cls, v: int) -> int:
        if v < 0 or v > 100_000_000:
            raise ValueError("amounts must be between 0 and 100000000")
        return v

    @field_validator("dueDate")
    @classmethod
    def due_date_valid(cls, v: str) -> str:
        try:
            date.fromisoformat(v)
        except ValueError as exc:
            raise ValueError("dueDate must be a valid ISO date (YYYY-MM-DD)") from exc
        return v


def _format_indian(n: int) -> str:
    """Format integer with Indian grouping: 250000 → '2,50,000'."""
    s = str(n)
    if len(s) <= 3:
        return s
    # last 3 digits, then groups of 2
    result = s[-3:]
    s = s[:-3]
    while s:
        result = s[-2:] + "," + result
        s = s[:-2]
    return result


def _format_due_date(iso: str) -> str:
    """Format ISO date as '8 Nov 2026' (Windows-safe, no %-d)."""
    d = date.fromisoformat(iso)
    return f"{d.day} {d.strftime('%b %Y')}"


@app.post("/api/advisor")
async def advisor(req: AdvisorRequest) -> list[str]:
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    model_name = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")

    if not api_key:
        logger.info("advisor: fallback (no GEMINI_API_KEY)")
        return _FALLBACK_IDEAS

    try:
        from google import genai
        from google.genai import types as genai_types

        client = genai.Client(
            api_key=api_key,
            http_options=genai_types.HttpOptions(timeout=10),
        )

        amount_str = _format_indian(req.shortfall)
        due_date_str = _format_due_date(req.dueDate)
        prompt = _ADVISOR_PROMPT_TEMPLATE.format(
            amount=amount_str,
            due_date=due_date_str,
            bank_today=_format_indian(req.bankToday),
            drawer_cash=_format_indian(req.drawerCash),
            expected_upi=_format_indian(req.expectedUpi),
            expected_cash=_format_indian(req.expectedCash),
            money_going_out=_format_indian(req.moneyGoingOut),
            promised_payments=_format_indian(req.promisedPayments),
            order_amount=_format_indian(req.orderAmount),
        )

        response = client.models.generate_content(
            model=model_name,
            contents=prompt,
            config=genai_types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=list[str],
                temperature=0.7,
            ),
        )

        raw = response.text
        parsed = json.loads(raw)

        if (
            not isinstance(parsed, list)
            or len(parsed) < 3
            or not all(isinstance(s, str) and s.strip() for s in parsed[:3])
        ):
            raise ValueError("unexpected response shape")

        ideas = [s.strip()[:300] for s in parsed[:3]]
        logger.info("advisor: gemini")
        return ideas

    except Exception as exc:  # noqa: BLE001
        reason = type(exc).__name__
        logger.info("advisor: fallback (%s)", reason)
        return _FALLBACK_IDEAS


# ── error handlers (kept from Prompt 1) ────────────────────────────


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    if exc.status_code == 404:
        return JSONResponse(status_code=404, content={"error": "Not found"})
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail if isinstance(exc.detail, str) else "Something went wrong"
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(status_code=422, content={"error": "Invalid request"})


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    return JSONResponse(status_code=500, content={"error": "Something went wrong"})
