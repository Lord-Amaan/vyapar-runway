import { t, formatINR } from "../i18n";
import type { VerdictData } from "../state/store";
import "../styles/verdict.css";

interface Props {
  verdict: VerdictData;
}

export function VerdictCard({ verdict }: Props) {
  const { n, label, scenarios, break_even } = verdict;

  const iconMap: Record<string, string> = {
    safe: "✅",
    risky: "⚠️",
    short: "❌",
  };

  return (
    <div className="verdict-section">
      {/* Main verdict */}
      <div className={`verdict-card verdict-${label}`} aria-live="polite">
        <div className="verdict-icon">{iconMap[label] || "?"}</div>
        <div className="verdict-content">
          <div className="verdict-headline">{t("verdict.headline", { n })}</div>
          <div className="verdict-label">{t(`verdict.${label}`)}</div>
        </div>
        <div className="verdict-n">{n}<span className="verdict-n-label">in 100</span></div>
      </div>

      {/* Scenarios */}
      <div className="scenarios">
        <div className="scenario-chip">
          <span className="scenario-n">{scenarios.none}</span>
          <span>{t("scenario.none", { n: scenarios.none })}</span>
        </div>
        <div className="scenario-chip active">
          <span className="scenario-n">{scenarios.likely}</span>
          <span>{t("scenario.likely", { n: scenarios.likely })}</span>
        </div>
        <div className="scenario-chip">
          <span className="scenario-n">{scenarios.high}</span>
          <span>{t("scenario.high", { n: scenarios.high })}</span>
        </div>
      </div>

      {/* Break-even */}
      <div className="break-even-card">
        {break_even.status === "zero" ? (
          <p>{t("breakeven.zero")}</p>
        ) : break_even.status === "unreachable" ? (
          <p className="text-danger">{t("breakeven.unreachable")}</p>
        ) : (
          <>
            <p>{t("breakeven", { x: formatINR(break_even.c_star || 0).replace("₹", "") })}</p>
            <div className="break-even-gauge">
              <div className="gauge-track">
                <div
                  className="gauge-range"
                  style={{
                    left: `${Math.min(100, (break_even.daily_cash_p10 / Math.max(1, (break_even.c_star || 1) * 2)) * 100)}%`,
                    width: `${Math.min(100, ((break_even.daily_cash_p90 - break_even.daily_cash_p10) / Math.max(1, (break_even.c_star || 1) * 2)) * 100)}%`,
                  }}
                />
                <div
                  className="gauge-marker"
                  style={{
                    left: `${Math.min(100, ((break_even.c_star || 0) / Math.max(1, (break_even.c_star || 1) * 2)) * 100)}%`,
                  }}
                />
              </div>
              <div className="gauge-labels">
                <span>{formatINR(break_even.daily_cash_p10)}</span>
                <span className="gauge-cstar">need: {formatINR(break_even.c_star || 0)}</span>
                <span>{formatINR(break_even.daily_cash_p90)}</span>
              </div>
            </div>
            <p className="breakeven-ask">{t("breakeven.ask")}</p>
          </>
        )}
      </div>
    </div>
  );
}
