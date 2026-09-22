import { formatINR, formatDate, t } from "../i18n";
import type { PlanData } from "../state/store";
import "../styles/plan.css";

interface Props {
  plan: PlanData;
}

export function PlanTimeline({ plan }: Props) {
  return (
    <div className="plan-timeline">
      <div className="timeline-track">
        {plan.tranches.map((tr, i) => (
          <div key={i} className="tranche-card">
            <div className="tranche-num">#{i + 1}</div>
            <div className="tranche-amount">{formatINR(tr.amount)}</div>
            <div className="tranche-date">{t("plan.payOn", { date: formatDate(tr.date) })}</div>
          </div>
        ))}
      </div>

      {!plan.fully_affordable && plan.shortfall > 0 && (
        <div className="shortfall-banner">
          Shortfall: {formatINR(plan.shortfall)} — see options below
        </div>
      )}
    </div>
  );
}
