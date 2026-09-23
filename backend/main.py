from __future__ import annotations

import json
import logging
import os
from contextlib import asynccontextmanager
from datetime import date

from dotenv import load_dotenv
from fastapi import FastAPI, File, Request, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, field_validator
from starlette.exceptions import HTTPException as StarletteHTTPException

from forecast_model import build_predictions, build_predictions_from_upload, detect_recurring_obligations
from simulation import run_monte_carlo_simulation

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
    _predictions, _model_info = build_predictions()
    logger.info("Startup complete — %d predictions cached", len(_predictions))
    yield


app = FastAPI(lifespan=lifespan)

# Allow localhost, Vercel deployments (*.vercel.app), and custom origins via ALLOWED_ORIGINS
allowed_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:5001",
    "http://localhost:8000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
]
if os.environ.get("ALLOWED_ORIGINS"):
    allowed_origins.extend([o.strip() for o in os.environ["ALLOWED_ORIGINS"].split(",") if o.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$|^https://.*\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── routes ─────────────────────────────────────────────────────────


@app.get("/api/health")
async def health():
    return {"status": "ok", "model": _model_info}


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
        detected_obligations = await run_in_threadpool(detect_recurring_obligations, raw)
    except ValueError as exc:
        return JSONResponse(status_code=422, content={"error": str(exc)})
    except Exception:  # noqa: BLE001
        logger.exception("uploaded forecast failed")
        return JSONResponse(status_code=500, content={"error": "Could not build a forecast from this file"})

    return {
        "predictions": predictions,
        "model": model_info,
        "detectedObligations": detected_obligations,
    }


class SimulateRequest(BaseModel):
    orderAmount: float = 0.0
    dueDate: str = ""
    cashOutOf10: int = 4
    bankBalance: float = 0.0
    drawerCash: float = 0.0
    dailyFixedExpense: float = 0.0
    promisedPayments: float = 0.0
    dailyUpiForecast: list[dict] | None = None


@app.post("/api/simulate")
async def simulate_endpoint(req: SimulateRequest) -> dict:
    forecast_data = req.dailyUpiForecast if req.dailyUpiForecast else _predictions
    return await run_in_threadpool(
        run_monte_carlo_simulation,
        daily_upi_forecast=forecast_data,
        cash_out_of_10=req.cashOutOf10,
        bank_balance=req.bankBalance,
        drawer_cash=req.drawerCash,
        daily_fixed_expense=req.dailyFixedExpense,
        promised_payments=req.promisedPayments,
        order_amount=req.orderAmount,
        due_date=req.dueDate,
        draws=2000,
    )


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
    load_dotenv(override=True)
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    model_name = os.environ.get("GEMINI_MODEL", "gemini-3-flash-preview").strip()

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
        logger.warning("advisor: fallback (%s: %s)", reason, exc)
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
