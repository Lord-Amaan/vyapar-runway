import { useState, useEffect } from "react";
import { t } from "../i18n";
import * as api from "../lib/apiClient";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import "../styles/proof.css";

export default function Proof() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getBenchmark()
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return (
      <div className="proof-page">
        <h1>{t("proof.title")}</h1>
        <div className="proof-error">
          Benchmark results not generated yet. Run <code>python benchmark/run_benchmark.py</code> to generate.
        </div>
      </div>
    );
  }

  if (!data) {
    return <div className="proof-page"><div className="proof-loading">{t("loading")}</div></div>;
  }

  return (
    <div className="proof-page">
      <h1>{t("proof.title")}</h1>

      <div className="caveat-block">
        <div className="caveat-icon">⚠️</div>
        <div>
          <p><strong>{t("proof.synthetic")}</strong></p>
          <p>{t("proof.caveat")}</p>
        </div>
      </div>

      <div className="proof-meta">
        <span>Generated: {data.generated_at || "N/A"}</span>
        <span>Shops: {data.n_shops || "N/A"}</span>
        <span>Seed: {data.seed || "N/A"}</span>
      </div>

      {data.error_by_bucket && (
        <div className="proof-chart-section">
          <h2>Total sales error by UPI share bucket</h2>
          <p className="chart-desc">
            sMAPE comparing each method's 30-day total sales estimate against the hidden truth.
            Lower is better.
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.error_by_bucket}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="bucket" tick={{ fill: "rgba(245,230,211,0.6)", fontSize: 12 }} />
              <YAxis tick={{ fill: "rgba(245,230,211,0.6)", fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="m0_upi_only" name="UPI-only" fill="#E53E3E" opacity={0.7} />
              <Bar dataKey="m1_fixed_ratio" name="Fixed ratio" fill="#E8A951" opacity={0.7} />
              <Bar dataKey="m2_ours" name="Ours" fill="#48BB78" opacity={0.8} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {data.verdict_confusion && (
        <div className="proof-chart-section">
          <h2>Verdict accuracy</h2>
          <p className="chart-desc">
            False-safe rate (tool says safe but truth is short) and false-short rate. Lower is better.
          </p>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.verdict_confusion}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="method" tick={{ fill: "rgba(245,230,211,0.6)", fontSize: 12 }} />
              <YAxis tick={{ fill: "rgba(245,230,211,0.6)", fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="false_safe" name="False safe %" fill="#E53E3E" opacity={0.7} />
              <Bar dataKey="false_short" name="False short %" fill="#E8A951" opacity={0.7} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {data.coverage && (
        <div className="proof-chart-section">
          <h2>Interval coverage (calibration)</h2>
          <p className="chart-desc">
            How often the predicted interval actually contains the true value.
            Points near the diagonal line are well-calibrated.
          </p>
          <div className="coverage-table">
            <table>
              <thead>
                <tr>
                  <th>Nominal</th>
                  <th>Observed</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.coverage.map((c: any) => (
                  <tr key={c.nominal}>
                    <td>{c.nominal}%</td>
                    <td>{c.observed}%</td>
                    <td>{Math.abs(c.observed - c.nominal) <= 8 ? "✓" : "⚠"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="proof-footer">
        <p>
          <strong>Synthetic: true</strong> — This benchmark uses generated data with known ground truth.
          The generator's assumptions (margin ranges, cash deposit patterns, UPI share noise) drive these results.
          Real-world performance may differ. If a metric is bad, we show it.
        </p>
      </div>
    </div>
  );
}
