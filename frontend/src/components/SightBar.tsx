import { t } from "../i18n";
import "../styles/sightbar.css";

interface SightBarProps {
  sP10: number;
  sP50: number;
  sP90: number;
}

export function SightBar({ sP10, sP50, sP90 }: SightBarProps) {
  const seenPct = Math.round(sP10 * 100);
  const midPct = Math.round((sP90 - sP10) * 100);
  const cashPct = Math.round((1 - sP90) * 100);

  return (
    <div className="sight-bar-container">
      <div className="sight-bar-label-row">
        <span className="sight-bar-title">100% = all your real sales</span>
      </div>
      <div className="sight-bar" role="img" aria-label={`UPI share ${seenPct}% to ${seenPct + midPct}%`}>
        <div
          className="sight-zone seen"
          style={{ width: `${seenPct}%` }}
        >
          <span className="zone-inner-label">{seenPct}%</span>
        </div>
        <div
          className="sight-zone maybe"
          style={{ width: `${midPct}%` }}
        />
        <div
          className="sight-zone cash"
          style={{ width: `${cashPct}%` }}
        />
      </div>
      <div className="sight-bar-legend">
        <span className="legend-item seen-legend">
          <span className="legend-swatch seen-swatch" />
          {t("sight.seenUpi", { x: seenPct })}
        </span>
        <span className="legend-item maybe-legend">
          <span className="legend-swatch maybe-swatch" />
          {t("sight.couldBe")}
        </span>
        <span className="legend-item cash-legend">
          <span className="legend-swatch cash-swatch" />
          {t("sight.estimatedCash")}
        </span>
      </div>
    </div>
  );
}
