import {
  ComposedChart, Area, Line, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { formatINR } from "../i18n";
import "../styles/moneychart.css";

interface ChartData {
  dates: string[];
  liquid: { p10: number[]; p50: number[]; p90: number[] };
  upi: { p50: number[] };
  cash: { p10: number[]; p50: number[]; p90: number[] };
  floor: number;
  markers: Array<{ type: string; date: string }>;
}

interface Props {
  chart: ChartData;
  truth?: any;
}

export function MoneyChart({ chart, truth }: Props) {
  const data = chart.dates.map((date, i) => ({
    date: new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
    rawDate: date,
    liqP10: Math.round(chart.liquid.p10[i]),
    liqP50: Math.round(chart.liquid.p50[i]),
    liqP90: Math.round(chart.liquid.p90[i]),
    liqBand: [Math.round(chart.liquid.p10[i]), Math.round(chart.liquid.p90[i])],
    upi: Math.round(chart.upi.p50[i]),
    cashP50: Math.round(chart.cash.p50[i]),
    truthCash: truth?.true_cash?.[
      truth.dates?.indexOf(date) ?? -1
    ] ?? null,
  }));

  const festivalMarker = chart.markers.find(m => m.type === "festival");

  return (
    <div className="money-chart">
      <h3>Your money over time</h3>
      <p className="chart-summary">
        Shaded area shows where your total money is likely to fall (10th–90th percentile).
      </p>
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            formatter={(value: any) => formatINR(Number(value))}
            labelStyle={{ color: "#2C1810" }}
          />
          <Area
            type="monotone"
            dataKey="liqBand"
            fill="rgba(196, 133, 72, 0.2)"
            stroke="none"
          />
          <Line
            type="monotone"
            dataKey="liqP50"
            stroke="#C48548"
            strokeWidth={2}
            dot={false}
            name="Total money (median)"
          />
          <Bar dataKey="upi" fill="#C48548" opacity={0.6} name="UPI sales" />
          <Bar dataKey="cashP50" fill="#E8A951" opacity={0.4} name="Est. cash sales" />
          {truth && (
            <Line
              type="monotone"
              dataKey="truthCash"
              stroke="#2C1810"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              name="True cash (hidden)"
            />
          )}
          <ReferenceLine
            y={chart.floor}
            stroke="#E53E3E"
            strokeDasharray="8 4"
            label={{ value: "Safe amount", position: "right", fontSize: 11 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
