import type { ForecastDay, ShopInputs } from "../types";
import {
  BANK_LABEL,
  BANK_SUM_CAPTION,
  SAMPLE_DATA_NOTE,
  TOTAL_INFLOW_LABEL,
  TOTAL_INFLOW_CAPTION,
  DAILY_AVG_LABEL,
  DAILY_AVG_CAPTION,
  PEAK_DAY_LABEL,
  PEAK_DAY_CAPTION,
  SAFE_BUDGET_LABEL,
  GALLA_LABEL,
} from "../copy";
import { formatINR, formatCompactINR, formatShortDate } from "../lib/format";

interface RetailSummaryProps {
  forecast: ForecastDay[];
  totalBank: number;
  cashOutOf10: number;
  shopInputs: ShopInputs;
  onEditShop: () => void;
}

export default function RetailSummary({
  forecast,
  totalBank,
  shopInputs,
  onEditShop,
}: RetailSummaryProps) {
  const totalGalla = forecast.reduce((sum, d) => sum + d.gallaCash, 0);
  const totalInflow = totalBank + totalGalla;
  const daysCount = forecast.length || 30;
  const dailyAvg = Math.round(totalInflow / daysCount);

  const peakDay = forecast.reduce<ForecastDay | null>((max, d) => {
    if (!max) return d;
    const currentTotal = d.bankMoney + d.gallaCash;
    const maxTotal = max.bankMoney + max.gallaCash;
    return currentTotal > maxTotal ? d : max;
  }, null);

  const peakAmount = peakDay ? peakDay.bankMoney + peakDay.gallaCash : 0;
  const availableByEnd =
    shopInputs.bankBalance +
    shopInputs.drawerCash +
    totalInflow -
    shopInputs.moneyGoingOut -
    shopInputs.promisedPayments;
  const safeBudget = Math.round(Math.max(0, availableByEnd) * 0.75);
  const moneyToday = shopInputs.bankBalance + shopInputs.drawerCash;
  const moneyGoingOut = shopInputs.moneyGoingOut + shopInputs.promisedPayments;
  const moneyLeftToday = moneyToday - moneyGoingOut;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-5">
      <div className="shop-input-summary">
        <div>
          <p className="text-[14px] text-gray-500">Your money today</p>
          <p className="mt-1 text-[22px] font-semibold text-gray-900" style={{ fontVariantNumeric: "tabular-nums" }}>
            {formatINR(moneyToday)}
          </p>
          <p className="text-[12px] text-gray-500">
            {formatINR(shopInputs.bankBalance)} in bank + {formatINR(shopInputs.drawerCash)} in drawer
          </p>
        </div>
        <div>
          <p className="text-[14px] text-gray-500">Going out before your order</p>
          <p className="mt-1 text-[22px] font-semibold text-gray-900" style={{ fontVariantNumeric: "tabular-nums" }}>
            {formatINR(moneyGoingOut)}
          </p>
          <p className="text-[12px] text-gray-500">Bills and payments you told us about</p>
        </div>
        <div>
          <p className="text-[14px] text-gray-500">Left before new sales</p>
          <p className={`mt-1 text-[22px] font-semibold ${moneyLeftToday < 0 ? "text-red-700" : "text-copper"}`} style={{ fontVariantNumeric: "tabular-nums" }}>
            {formatINR(moneyLeftToday)}
          </p>
          <button type="button" className="shop-edit-button" onClick={onEditShop}>Change shop details</button>
        </div>
      </div>

      {/* Primary KPI: Total Store Inflow */}
      <div>
        <p className="text-[14px] text-gray-500">{TOTAL_INFLOW_LABEL}</p>
        <p
          className="mt-2 text-[30px] font-semibold text-gray-900"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {formatINR(totalInflow)}
        </p>
        <p className="mt-1 text-[14px] text-gray-600">
          <span className="font-medium text-copper">{formatINR(totalBank)}</span> {BANK_LABEL}
          {" + "}
          <span className="font-medium text-amber-700">{formatINR(totalGalla)}</span> {GALLA_LABEL}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 text-[14px] text-gray-500">
          <span>{TOTAL_INFLOW_CAPTION}</span>
          <span>·</span>
          <span>{SAMPLE_DATA_NOTE}</span>
        </div>
      </div>

      {/* 3-column Retail Metrics Grid */}
      <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Bank UPI */}
        <div>
          <p className="text-[14px] text-gray-500">{BANK_LABEL}</p>
          <p
            className="mt-1 text-[18px] font-semibold text-gray-900"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {formatINR(totalBank)}
          </p>
          <p className="text-[12px] text-gray-500 mt-0.5">{BANK_SUM_CAPTION}</p>
        </div>

        {/* Daily Average */}
        <div>
          <p className="text-[14px] text-gray-500">{DAILY_AVG_LABEL}</p>
          <p
            className="mt-1 text-[18px] font-semibold text-gray-900"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {formatINR(dailyAvg)}/day
          </p>
          <p className="text-[12px] text-gray-500 mt-0.5">{DAILY_AVG_CAPTION}</p>
        </div>

        {/* Peak Rush Day */}
        <div>
          <p className="text-[14px] text-gray-500">{PEAK_DAY_LABEL}</p>
          <p
            className="mt-1 text-[18px] font-semibold text-gray-900"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {peakDay ? `${formatShortDate(peakDay.date)} (${formatCompactINR(peakAmount)})` : "—"}
          </p>
          <p className="text-[12px] text-gray-500 mt-0.5">{PEAK_DAY_CAPTION}</p>
        </div>
      </div>

      {/* Safe Stocking Budget Guide */}
      <div className="mt-4 pt-3 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between text-[14px] text-gray-600 gap-1">
        <span>
          <strong className="font-semibold text-gray-900">{SAFE_BUDGET_LABEL}:</strong>{" "}
          <span style={{ fontVariantNumeric: "tabular-nums" }} className="font-medium text-gray-900">
            {formatINR(safeBudget)}
          </span>
        </span>
        <span className="text-gray-500 text-[12px] sm:text-[14px]">75% kept aside for safety</span>
      </div>
    </div>
  );
}
