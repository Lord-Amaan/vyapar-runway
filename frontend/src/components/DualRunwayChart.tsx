import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TriangleAlert } from "lucide-react";
import type { ForecastDay } from "../types";
import { formatINR, formatShortDate, formatCompactINR } from "../lib/format";
import { BANK_LABEL, GALLA_LABEL, SAMPLE_DATA_NOTE, HIGH_CASH_WARNING } from "../copy";

const STRIPE_PATTERN_ID = "galla-stripes";

interface DualRunwayChartProps {
  forecast: ForecastDay[];
  cashOutOf10: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null;

  const bank = (payload.find((p: any) => p.dataKey === "bankMoney")?.value as number) ?? 0;
  const galla = (payload.find((p: any) => p.dataKey === "gallaCash")?.value as number) ?? 0;

  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #E5E7EB",
        borderRadius: "6px",
        padding: "10px 14px",
        fontSize: "14px",
        color: "#111827",
        minWidth: "180px",
      }}
    >
      <p style={{ fontWeight: 600, marginBottom: "6px" }}>{formatShortDate(label)}</p>
      <p style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
        <span style={{ color: "#4B5563" }}>{BANK_LABEL}</span>
        <span style={{ fontVariantNumeric: "tabular-nums" }}>{formatINR(bank)}</span>
      </p>
      <p style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
        <span style={{ color: "#4B5563" }}>{GALLA_LABEL}</span>
        <span style={{ fontVariantNumeric: "tabular-nums" }}>{formatINR(galla)}</span>
      </p>
      <p
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "12px",
          marginTop: "6px",
          paddingTop: "6px",
          borderTop: "1px solid #E5E7EB",
          fontWeight: 600,
        }}
      >
        <span style={{ color: "#4B5563" }}>Total for the day</span>
        <span style={{ fontVariantNumeric: "tabular-nums" }}>{formatINR(bank + galla)}</span>
      </p>
    </div>
  );
}

export default function DualRunwayChart({ forecast, cashOutOf10 }: DualRunwayChartProps) {
  const showWarning = cashOutOf10 >= 4;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-5">
      {/* Warning banner — shown above chart when cashOutOf10 >= 4 */}
      {showWarning && (
        <div
          role="status"
          className="flex items-start gap-2 mb-4 rounded-md px-3 py-2"
          style={{
            background: "#FEFCE8",
            border: "1px solid #FDE047",
            color: "#854D0E",
          }}
        >
          <TriangleAlert size={16} strokeWidth={1.75} style={{ flexShrink: 0, marginTop: "2px" }} />
          <span className="text-[14px]">{HIGH_CASH_WARNING}</span>
        </div>
      )}

      {/* Chart — explicit height prevents ResponsiveContainer collapse */}
      <div className="h-72 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={forecast} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              {/* Diagonal amber stripe pattern for Galla Cash area */}
              <pattern
                id={STRIPE_PATTERN_ID}
                patternUnits="userSpaceOnUse"
                width={8}
                height={8}
                patternTransform="rotate(45)"
              >
                <rect width={8} height={8} fill="#FEF3C7" />
                <line x1={0} y1={0} x2={0} y2={8} stroke="#F59E0B" strokeWidth={2} />
              </pattern>
            </defs>

            <CartesianGrid
              vertical={false}
              stroke="#E5E7EB"
              strokeDasharray="4 4"
            />

            <XAxis
              dataKey="date"
              tickFormatter={formatShortDate}
              minTickGap={40}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#6B7280" }}
            />

            <YAxis
              tickFormatter={formatCompactINR}
              width={48}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#6B7280" }}
            />

            <Tooltip content={<CustomTooltip />} />

            {/* Bank Money — solid copper, stacked first (bottom) */}
            <Area
              type="monotone"
              dataKey="bankMoney"
              name={BANK_LABEL}
              stackId="runway"
              stroke="#B65F3E"
              fill="#B65F3E"
              fillOpacity={1}
              isAnimationActive={false}
              dot={false}
              activeDot={false}
            />

            {/* Galla Cash — amber stripes, stacked on top */}
            <Area
              type="monotone"
              dataKey="gallaCash"
              name={GALLA_LABEL}
              stackId="runway"
              stroke="#F59E0B"
              fill={`url(#${STRIPE_PATTERN_ID})`}
              fillOpacity={1}
              isAnimationActive={false}
              dot={false}
              activeDot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Custom legend below chart */}
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1">
        {/* Bank Money legend swatch */}
        <span className="flex items-center gap-1.5">
          <svg width="14" height="14" aria-hidden="true">
            <rect width="14" height="14" fill="#B65F3E" rx="2" />
          </svg>
          <span className="text-[13px] text-gray-600">{BANK_LABEL}</span>
        </span>

        {/* Galla Cash legend swatch — striped square */}
        <span className="flex items-center gap-1.5">
          <svg width="14" height="14" aria-hidden="true">
            <defs>
              <pattern
                id="legend-stripes"
                patternUnits="userSpaceOnUse"
                width={6}
                height={6}
                patternTransform="rotate(45)"
              >
                <rect width={6} height={6} fill="#FEF3C7" />
                <line x1={0} y1={0} x2={0} y2={6} stroke="#F59E0B" strokeWidth={2} />
              </pattern>
            </defs>
            <rect width="14" height="14" fill="url(#legend-stripes)" stroke="#F59E0B" strokeWidth="1" rx="2" />
          </svg>
          <span className="text-[13px] text-gray-600">{GALLA_LABEL}</span>
        </span>

        {/* Sample data note */}
        <span className="text-[12px] text-gray-500 ml-auto">{SAMPLE_DATA_NOTE}</span>
      </div>
    </div>
  );
}
