import { useState, useEffect, useCallback } from "react";
import { useStore, StoreProvider } from "../state/store";
import { t, formatINR, formatDate, getLang, setLang, type Lang } from "../i18n";
import * as api from "../lib/apiClient";
import { SightBar } from "./SightBar";
import { EvidenceStack } from "./EvidenceStack";
import { VerdictCard } from "./VerdictCard";
import { MoneyChart } from "./MoneyChart";
import { PlanTimeline } from "./PlanTimeline";
import "../styles/appflow.css";

const STEPS = ["step.files", "step.shop", "step.see", "step.order", "step.plan"];
const SHOP_TYPES = [
  { id: "kirana", label: "Kirana / grocery" },
  { id: "sweets_dryfruit", label: "Sweets & dry fruits" },
  { id: "garments", label: "Garments" },
  { id: "gifts_puja", label: "Gifts & puja items" },
  { id: "other", label: "Other" },
];
const FESTIVALS = [
  { id: "diwali", label: "Diwali", date: "2026-11-08" },
  { id: "navratri_dussehra", label: "Navratri–Dussehra", date: "2026-10-20" },
];
const SAMPLES = [
  { id: "sharma_kirana", label: "Sharma Kirana", desc: "Mostly cash, 800 days" },
  { id: "patel_general", label: "Patel General", desc: "Mixed payments, 300 days" },
  { id: "new_shop", label: "New Shop", desc: "Only 45 days" },
];

function LanguageToggle() {
  const { state, dispatch } = useStore();
  const handleChange = (lang: Lang) => {
    setLang(lang);
    dispatch({ type: "SET_LANGUAGE", language: lang });
    window.location.reload();
  };
  return (
    <div className="lang-toggle">
      {(["en", "hi", "mr"] as Lang[]).map((l) => (
        <button
          key={l}
          className={`lang-btn ${state.language === l ? "active" : ""}`}
          onClick={() => handleChange(l)}
        >
          {l === "en" ? "EN" : l === "hi" ? "हिं" : "मरा"}
        </button>
      ))}
    </div>
  );
}

function Stepper() {
  const { state, dispatch } = useStore();
  return (
    <div className="stepper">
      {STEPS.map((key, i) => (
        <button
          key={key}
          className={`stepper-step ${i === state.step ? "active" : ""} ${i < state.step ? "done" : ""}`}
          onClick={() => i <= state.step && dispatch({ type: "SET_STEP", step: i })}
          disabled={i > state.step}
        >
          <span className="stepper-num">{i + 1}</span>
          <span className="stepper-label">{t(key)}</span>
        </button>
      ))}
    </div>
  );
}

// ── Screen 1: Files ──────────────────────────────────────────────

function FilesStep() {
  const { state, dispatch } = useStore();
  const [uploading, setUploading] = useState(false);

  const ensureSession = useCallback(async () => {
    if (state.sessionId) return state.sessionId;
    const sid = await api.createSession(state.language);
    dispatch({ type: "SET_SESSION", sessionId: sid });
    return sid;
  }, [state.sessionId, state.language, dispatch]);

  const handleUPIUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const sid = await ensureSession();
      const result = await api.uploadUPI(sid, file);
      dispatch({ type: "SET_UPI_SUMMARY", data: result });
    } catch (err: any) {
      dispatch({ type: "SET_ERROR", error: err.message });
    }
    setUploading(false);
  };

  const handleBankUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const sid = await ensureSession();
      const result = await api.uploadBank(sid, file);
      dispatch({ type: "SET_BANK_SUMMARY", data: result });
    } catch (err: any) {
      dispatch({ type: "SET_ERROR", error: err.message });
    }
    setUploading(false);
  };

  const handleSample = async (name: string) => {
    setUploading(true);
    dispatch({ type: "SET_ERROR", error: null });
    try {
      const sid = await ensureSession();
      const result = await api.loadSample(sid, name, false);
      dispatch({ type: "SET_UPI_SUMMARY", data: result.upi_summary });
      dispatch({ type: "SET_BANK_SUMMARY", data: result.bank_summary });
      dispatch({ type: "SET_SAMPLE", name, truth: null });
      if (result.shop) {
        dispatch({
          type: "SET_SHOP_CONFIG",
          config: {
            category: result.shop.category,
            bank0: result.shop.bank0,
            drawer0: result.shop.drawer0,
            floor: result.shop.floor,
            festival_id: result.shop.festival_id,
            festival_date: result.shop.festival_date,
          },
        });
      }
      // Auto-advance to step 2
      dispatch({ type: "SET_STEP", step: 1 });
    } catch (err: any) {
      dispatch({ type: "SET_ERROR", error: err.message });
    }
    setUploading(false);
  };

  return (
    <div className="files-step">
      <div className="file-cards">
        <div className="file-card">
          <div className="file-card-icon">📊</div>
          <h3>{t("upload.upi.title")}</h3>
          <p className="file-help">{t("upload.upi.help")}</p>
          <label className="file-drop">
            <input type="file" accept=".csv,.tsv,.xlsx" onChange={handleUPIUpload} />
            <span>{uploading ? t("loading") : "Choose file"}</span>
          </label>
          {state.upiSummary && (
            <div className="file-status success">
              ✓ {state.upiSummary.days} days · {formatINR(state.upiSummary.total)}
            </div>
          )}
        </div>

        <div className="file-card">
          <div className="file-card-icon">🏦</div>
          <h3>{t("upload.bank.title")}</h3>
          <p className="file-help">{t("upload.bank.help")}</p>
          <label className="file-drop">
            <input type="file" accept=".csv,.tsv,.xlsx" onChange={handleBankUpload} />
            <span>Choose file</span>
          </label>
          {state.bankSummary && (
            <div className="file-status success">
              ✓ {state.bankSummary.cash_deposit_count} cash deposits
            </div>
          )}
        </div>

        <div className="file-card sample-card">
          <div className="file-card-icon">🏪</div>
          <h3>{t("upload.sample.title")}</h3>
          <div className="sample-buttons">
            {SAMPLES.map((s) => (
              <button
                key={s.id}
                className="sample-btn"
                onClick={() => handleSample(s.id)}
                disabled={uploading}
              >
                <strong>{s.label}</strong>
                <span className="sample-desc">{s.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {state.upiSummary && (
        <button
          className="btn-primary next-btn"
          onClick={() => dispatch({ type: "SET_STEP", step: 1 })}
        >
          Next →
        </button>
      )}

      {state.error && <div className="error-banner">{state.error}</div>}
    </div>
  );
}

// ── Screen 2: Shop Setup ────────────────────────────────────────

function ShopSetup() {
  const { state, dispatch } = useStore();
  const cfg = state.shopConfig;

  const update = (partial: any) => dispatch({ type: "SET_SHOP_CONFIG", config: partial });

  const handleNext = async () => {
    if (!state.sessionId) return;
    dispatch({ type: "SET_LOADING", loading: true });
    try {
      await api.setShop(state.sessionId, cfg);
      // Fetch blindspot
      const bs = await api.getBlindspot(state.sessionId);
      dispatch({ type: "SET_BLINDSPOT", data: bs });
      dispatch({ type: "SET_STEP", step: 2 });
    } catch (err: any) {
      dispatch({ type: "SET_ERROR", error: err.message });
    }
    dispatch({ type: "SET_LOADING", loading: false });
  };

  return (
    <div className="shop-setup">
      <div className="form-section">
        <label className="form-label">{t("shop.type")}</label>
        <select
          value={cfg.category}
          onChange={(e) => update({ category: e.target.value })}
          className="form-select"
        >
          {SHOP_TYPES.map((st) => (
            <option key={st.id} value={st.id}>{st.label}</option>
          ))}
        </select>
      </div>

      <div className="form-section">
        <h3>{t("shop.moneyNow")}</h3>
        <div className="form-row">
          <div className="form-field">
            <label>{t("shop.bank")}</label>
            <div className="input-group">
              <span className="input-prefix">₹</span>
              <input
                type="number"
                value={cfg.bank0}
                onChange={(e) => update({ bank0: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="form-field">
            <label>{t("shop.drawer")}</label>
            <div className="input-group">
              <span className="input-prefix">₹</span>
              <input
                type="number"
                value={cfg.drawer0}
                onChange={(e) => update({ drawer0: Number(e.target.value) })}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3>{t("shop.festival")}</h3>
        <div className="form-row">
          <div className="form-field">
            <select
              value={cfg.festival_id}
              onChange={(e) => {
                const f = FESTIVALS.find((f) => f.id === e.target.value);
                update({ festival_id: e.target.value, festival_date: f?.date });
              }}
              className="form-select"
            >
              {FESTIVALS.map((f) => (
                <option key={f.id} value={f.id}>{f.label}</option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label>{t("shop.festivalDate")}</label>
            <input
              type="date"
              value={cfg.festival_date}
              onChange={(e) => update({ festival_date: e.target.value })}
            />
          </div>
        </div>
        <div className="form-row small-fields">
          <div className="form-field">
            <label>{t("shop.shelfDays")}</label>
            <input type="number" value={cfg.days_on_shelf} onChange={(e) => update({ days_on_shelf: Number(e.target.value) })} />
          </div>
          <div className="form-field">
            <label>{t("shop.deliveryDays")}</label>
            <input type="number" value={cfg.delivery_days} onChange={(e) => update({ delivery_days: Number(e.target.value) })} />
          </div>
          <div className="form-field">
            <label>{t("shop.creditDays")}</label>
            <input type="number" value={cfg.credit_days} onChange={(e) => update({ credit_days: Number(e.target.value) })} />
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3>{t("shop.festivalLift", { festival: FESTIVALS.find(f => f.id === cfg.festival_id)?.label || "" })}</h3>
        <div className="chip-group">
          {[
            { val: 1, label: t("shop.liftSame") },
            { val: 1.5, label: t("shop.lift15") },
            { val: 2, label: t("shop.lift2") },
            { val: 3, label: t("shop.lift3") },
            { val: "unsure", label: t("shop.liftUnsure") },
          ].map(({ val, label }) => (
            <button
              key={String(val)}
              className={`chip ${cfg.lift_choice === val ? "active" : ""}`}
              onClick={() => update({ lift_choice: val })}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="form-section">
        <h3>{t("shop.ownerGuess")}</h3>
        <div className="slider-group">
          <input
            type="range"
            min={0}
            max={10}
            value={cfg.owner_cash_of_10 ?? 5}
            onChange={(e) => update({ owner_cash_of_10: Number(e.target.value) })}
          />
          <span className="slider-val">
            {cfg.owner_cash_of_10 !== null ? `${cfg.owner_cash_of_10} of 10` : t("shop.ownerGuessSkip")}
          </span>
          <button className="chip small" onClick={() => update({ owner_cash_of_10: null })}>
            {t("shop.ownerGuessSkip")}
          </button>
        </div>
      </div>

      <div className="form-section">
        <h3>{t("keepAside")}</h3>
        <div className="input-group">
          <span className="input-prefix">₹</span>
          <input
            type="number"
            value={cfg.floor}
            onChange={(e) => update({ floor: Number(e.target.value) })}
          />
        </div>
      </div>

      <div className="step-nav">
        <button className="btn-secondary" onClick={() => dispatch({ type: "SET_STEP", step: 0 })}>
          ← Back
        </button>
        <button className="btn-primary" onClick={handleNext} disabled={state.loading}>
          {state.loading ? t("loading") : "Next →"}
        </button>
      </div>
    </div>
  );
}

// ── Screen 3: What we can see ───────────────────────────────────

function BlindspotScreen() {
  const { state, dispatch } = useStore();
  const bs = state.blindspot;
  const [cashDate, setCashDate] = useState("");
  const [cashAmount, setCashAmount] = useState("");

  if (!bs) return <div className="loading-screen">{t("loading")}</div>;

  const confText = bs.confidence === "narrow" ? t("conf.narrow")
    : bs.confidence === "medium" ? t("conf.medium")
    : t("conf.wide");

  const handleAddCount = async () => {
    if (!state.sessionId || !cashDate || !cashAmount) return;
    try {
      await api.addCashCount(state.sessionId, cashDate, Number(cashAmount));
      const newBs = await api.getBlindspot(state.sessionId);
      dispatch({ type: "SET_BLINDSPOT", data: newBs });
      setCashDate("");
      setCashAmount("");
    } catch (err: any) {
      dispatch({ type: "SET_ERROR", error: err.message });
    }
  };

  const handleNext = () => dispatch({ type: "SET_STEP", step: 3 });

  return (
    <div className="blindspot-screen">
      <div className="blindspot-header">
        <h2>{t("blind.title")}</h2>
        <div className={`confidence-pill conf-${bs.confidence}`}>
          {bs.confidence === "narrow" ? "✓" : bs.confidence === "medium" ? "◐" : "○"}{" "}
          {confText}
        </div>
      </div>

      <p className="blindspot-headline">
        {t("blind.headline", {
          lo: bs.share_seen.display.lo,
          hi: bs.share_seen.display.hi,
        })}
      </p>

      <SightBar
        sP10={bs.share_seen.p10}
        sP50={bs.share_seen.p50}
        sP90={bs.share_seen.p90}
      />

      <h3 className="section-title">{t("evidence.title")}</h3>
      <EvidenceStack
        sources={bs.evidence}
        skipped={bs.skipped}
      />

      {bs.disagreement && (
        <div className="disagreement-notice">
          ⚠ {t("disagree", { a: bs.disagreement.a, b: bs.disagreement.b })}
        </div>
      )}

      <div className="question-card">
        <h3>{t("question.title")}</h3>
        {bs.next_question?.kind === "cash_count" && (
          <div className="cash-count-form">
            <p>{t("q.cashCount", { date: bs.next_question.date || "" })}</p>
            <div className="form-row">
              <input
                type="date"
                value={cashDate || bs.next_question.date || ""}
                onChange={(e) => setCashDate(e.target.value)}
              />
              <div className="input-group">
                <span className="input-prefix">₹</span>
                <input
                  type="number"
                  placeholder="0"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                />
              </div>
              <button className="btn-primary small" onClick={handleAddCount}>Save</button>
            </div>
          </div>
        )}
      </div>

      <p className="disclaimer">{t("disclaimer")}</p>

      <div className="step-nav">
        <button className="btn-secondary" onClick={() => dispatch({ type: "SET_STEP", step: 1 })}>← Back</button>
        <button className="btn-primary" onClick={handleNext}>Next →</button>
      </div>
    </div>
  );
}

// ── Screen 4: Your order ────────────────────────────────────────

function OrderScreen() {
  const { state, dispatch } = useStore();
  const [loading, setLoading] = useState(false);

  const fetchVerdict = useCallback(async () => {
    if (!state.sessionId) return;
    setLoading(true);
    try {
      const result = await api.postVerdict(state.sessionId, [
        { amount: state.orderAmount, date: state.orderDate },
      ]);
      dispatch({ type: "SET_VERDICT", data: result });
    } catch (err: any) {
      dispatch({ type: "SET_ERROR", error: err.message });
    }
    setLoading(false);
  }, [state.sessionId, state.orderAmount, state.orderDate, dispatch]);

  useEffect(() => {
    fetchVerdict();
  }, []);

  const v = state.verdict;

  const handleToggleTruth = async () => {
    if (!state.sessionId || !state.sampleName) return;
    dispatch({ type: "TOGGLE_TRUTH" });
    // Reload sample with reveal
    const result = await api.loadSample(state.sessionId, state.sampleName, !state.showTruth);
    dispatch({ type: "SET_SAMPLE", name: state.sampleName, truth: result.truth });
  };

  return (
    <div className="order-screen">
      {/* Restock clock */}
      {v?.clock && (
        <div className={`restock-clock ${v.clock.missed ? "missed" : ""}`}>
          {v.clock.missed
            ? t("clock.missed", { n: Math.abs(v.clock.days_left) })
            : t("clock.orderBy", { date: formatDate(v.clock.order_by), n: v.clock.days_left })}
        </div>
      )}

      {/* Order form */}
      <div className="order-form">
        <div className="form-field">
          <label>{t("order.amount")}</label>
          <div className="input-group">
            <span className="input-prefix">₹</span>
            <input
              type="number"
              value={state.orderAmount}
              onChange={(e) => dispatch({ type: "SET_ORDER", amount: Number(e.target.value) })}
            />
          </div>
        </div>
        <div className="form-field">
          <label>{t("order.date")}</label>
          <input
            type="date"
            value={state.orderDate}
            onChange={(e) => dispatch({ type: "SET_ORDER", date: e.target.value })}
          />
        </div>
        <button className="btn-primary" onClick={fetchVerdict} disabled={loading}>
          {loading ? t("loading") : "Check"}
        </button>
      </div>

      {v && <VerdictCard verdict={v} />}

      {v?.chart && (
        <MoneyChart
          chart={v.chart}
          truth={state.showTruth ? state.sampleTruth : null}
        />
      )}

      {state.sampleName && (
        <button className="btn-reveal" onClick={handleToggleTruth}>
          {state.showTruth ? t("reveal.hide") : t("reveal.button")}
        </button>
      )}

      <p className="disclaimer">{t("disclaimer")}</p>

      <div className="step-nav">
        <button className="btn-secondary" onClick={() => dispatch({ type: "SET_STEP", step: 2 })}>← Back</button>
        <button className="btn-primary" onClick={async () => {
          if (!state.sessionId) return;
          setLoading(true);
          try {
            const plan = await api.postPlan(state.sessionId, state.orderAmount);
            dispatch({ type: "SET_PLAN", data: plan });
            dispatch({ type: "SET_STEP", step: 4 });
          } catch (err: any) {
            dispatch({ type: "SET_ERROR", error: err.message });
          }
          setLoading(false);
        }}>
          {loading ? t("loading") : "Next →"}
        </button>
      </div>
    </div>
  );
}

// ── Screen 5: Your plan ─────────────────────────────────────────

function PlanScreen() {
  const { state, dispatch } = useStore();
  const plan = state.plan;

  if (!plan) return <div className="loading-screen">{t("loading")}</div>;

  return (
    <div className="plan-screen">
      <h2>{t("plan.title")}</h2>

      <PlanTimeline plan={plan} />

      <p className="plan-result">
        {plan.fully_affordable
          ? t("plan.result.full", { a: formatINR(plan.target) })
          : t("plan.result.partial", { t: formatINR(plan.affordable_total), a: formatINR(plan.target) })}
      </p>

      {plan.levers.length > 0 && (
        <div className="levers-section">
          <h3>What if…</h3>
          <table className="levers-table">
            <tbody>
              {plan.levers.map((l) => (
                <tr key={l.id}>
                  <td>{t(`lever.${l.id.replace(/_/g, "")}`) || l.id}</td>
                  <td className="lever-n">{l.n} in 100</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button
        className="btn-whatsapp"
        onClick={() => {
          const text = encodeURIComponent(
            plan.whatsapp_text ||
            `Festival order plan: ${plan.tranches.map(tr => `₹${tr.amount} on ${tr.date}`).join(", ")}`
          );
          window.open(`https://wa.me/?text=${text}`, "_blank");
        }}
      >
        {t("plan.share")} 💬
      </button>

      <p className="disclaimer">{t("disclaimer")}</p>

      <div className="step-nav">
        <button className="btn-secondary" onClick={() => dispatch({ type: "SET_STEP", step: 3 })}>← Back</button>
      </div>
    </div>
  );
}

// ── Main AppFlow ────────────────────────────────────────────────

function AppFlowInner() {
  const { state } = useStore();

  return (
    <div className="appflow">
      <header className="appflow-header">
        <h1 className="appflow-title">{t("tagline")}</h1>
        <LanguageToggle />
      </header>
      <Stepper />
      <main className="appflow-main">
        {state.step === 0 && <FilesStep />}
        {state.step === 1 && <ShopSetup />}
        {state.step === 2 && <BlindspotScreen />}
        {state.step === 3 && <OrderScreen />}
        {state.step === 4 && <PlanScreen />}
      </main>
    </div>
  );
}

export default function AppFlow() {
  return (
    <StoreProvider>
      <AppFlowInner />
    </StoreProvider>
  );
}
