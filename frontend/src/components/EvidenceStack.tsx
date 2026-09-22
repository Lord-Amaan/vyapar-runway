import { t } from "../i18n";
import "../styles/evidence.css";

interface EvidenceSource {
  id: string;
  label: string;
  lo: number;
  hi: number;
  used: boolean;
  weak: boolean;
}

interface Props {
  sources: EvidenceSource[];
  skipped: Array<{ id: string; reason: string }>;
}

export function EvidenceStack({ sources, skipped }: Props) {
  return (
    <div className="evidence-stack">
      <div className="evidence-axis">
        <span>0%</span>
        <span>UPI share of sales →</span>
        <span>100%</span>
      </div>
      {sources.filter(s => s.used).map((src) => (
        <div key={src.id} className="evidence-row">
          <div className="evidence-label">{src.label}</div>
          <div className="evidence-bar-track">
            <div
              className={`evidence-bar ${src.weak ? "weak" : "strong"} ${src.id === "prior" ? "prior" : ""}`}
              style={{
                left: `${src.lo * 100}%`,
                width: `${(src.hi - src.lo) * 100}%`,
              }}
            />
          </div>
        </div>
      ))}
      {skipped.length > 0 && (
        <div className="evidence-skipped">
          <strong>{t("evidence.skipped")}:</strong>{" "}
          {skipped.map((s, i) => (
            <span key={s.id}>
              {i > 0 && " · "}
              {s.reason}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
