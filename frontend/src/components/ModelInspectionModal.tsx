import { useState } from "react";
import { X, Copy, Check, ChevronDown, ChevronUp, Sparkles, ShieldCheck, TrendingUp, Sliders, Info } from "lucide-react";
import type { SimulationResult } from "../lib/api";
import { formatINR } from "../lib/format";

interface ModelInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: SimulationResult | null;
  orderAmount: number;
  dueDate: string;
}

export default function ModelInspectionModal({
  isOpen,
  onClose,
  result,
  orderAmount,
  dueDate,
}: ModelInspectionModalProps) {
  const [copiedPitch, setCopiedPitch] = useState(false);
  const [showFormulas, setShowFormulas] = useState(false);

  if (!isOpen || !result) return null;

  const {
    safetyConfidencePct,
    ruinProbability,
    draws,
    p10Buffer,
    p50Buffer,
    p90Buffer,
    bayesian,
    dailySeries,
  } = result;

  const handleCopyPitch = () => {
    const pitchText =
      "Instead of naive flat averages, VyaparRunway models the shopkeeper's unobservable cash ratio using a Bayesian Beta prior, then runs a 2,000-draw Monte Carlo simulation over Prophet's log-normal forecast variance to calculate exact Value-at-Risk and probability of cash ruin.";
    navigator.clipboard.writeText(pitchText).then(() => {
      setCopiedPitch(true);
      setTimeout(() => setCopiedPitch(false), 2500);
    });
  };

  // SVG Fan Chart dimensions
  const chartWidth = 520;
  const chartHeight = 190;
  const padding = { top: 22, right: 20, bottom: 32, left: 60 };
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = chartHeight - padding.top - padding.bottom;

  let minVal = 0;
  let maxVal = 100000;
  if (dailySeries.length > 0) {
    const allP10 = dailySeries.map((d) => d.p10);
    const allP90 = dailySeries.map((d) => d.p90);
    minVal = Math.min(0, ...allP10);
    maxVal = Math.max(50000, ...allP90);
  }
  const valRange = maxVal - minVal || 1;

  const getX = (index: number) =>
    padding.left + (index / Math.max(1, dailySeries.length - 1)) * plotWidth;
  const getY = (val: number) =>
    padding.top + plotHeight - ((val - minVal) / valRange) * plotHeight;

  // Paths
  const p90Points = dailySeries.map((d, i) => `${getX(i)},${getY(d.p90)}`);
  const p10PointsReverse = [...dailySeries]
    .reverse()
    .map((d, i) => `${getX(dailySeries.length - 1 - i)},${getY(d.p10)}`);
  const ribbonPath =
    dailySeries.length > 0
      ? `M ${p90Points.join(" L ")} L ${p10PointsReverse.join(" L ")} Z`
      : "";

  const p50Path =
    dailySeries.length > 0
      ? `M ${dailySeries.map((d, i) => `${getX(i)},${getY(d.p50)}`).join(" L ")}`
      : "";

  const zeroLineY = getY(0);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-stone-900/40 backdrop-blur-[2px] transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Slide-over Drawer */}
      <div className="relative w-full max-w-xl bg-[#FAF9F6] text-[#1B0D08] h-full shadow-2xl border-l border-[#DEDBD4] flex flex-col font-sans overflow-hidden animate-slideInRight">
        {/* Drawer Header */}
        <div className="px-6 py-5 border-b border-[#DEDBD4] bg-[#FFFEFA] flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-[#B65F3E] font-semibold">
              Under the Hood • Risk Simulation
            </p>
            <h2 id="drawer-title" className="text-xl font-serif font-medium text-[#1B0D08] mt-0.5">
              How we tested your runway
            </h2>
            <p className="text-xs text-[#716D67] mt-1 leading-relaxed">
              Real business isn't flat. Instead of guessing one single future, we simulated{" "}
              <strong className="text-[#1B0D08]">{draws.toLocaleString()} different months</strong> to see how
              your shop holds up.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 -mr-1 rounded-md text-[#716D67] hover:text-[#1B0D08] hover:bg-[#F6E8E0] transition-colors focus:outline-none"
            aria-label="Close drawer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {/* Human Storytelling Box */}
          <div className="p-4 rounded-lg bg-[#FFFEFA] border border-[#DEDBD4] shadow-xs flex items-start gap-3">
            <div className="p-2 rounded-md bg-[#F6E8E0] text-[#B65F3E] shrink-0 mt-0.5">
              <Info size={18} />
            </div>
            <div className="text-xs text-[#716D67] leading-relaxed space-y-1">
              <p className="font-semibold text-[#1B0D08]">
                Why simple averages don't work in retail:
              </p>
              <p>
                A simple calculator multiplies average sales by 30 days and says you're fine. But in real life, a
                3-day dry spell right before your supplier's payment clears can bounce your cheque—even if the
                month as a whole was profitable.
              </p>
            </div>
          </div>

          {/* 4 Clean Human Metric Cards */}
          <div>
            <p className="text-xs font-semibold text-[#716D67] uppercase tracking-wider mb-2.5 font-mono">
              Key Simulation Takeaways
            </p>
            <div className="grid grid-cols-2 gap-3">
              {/* Card 1 */}
              <div className="p-3.5 rounded-lg bg-[#FFFEFA] border border-[#DEDBD4] shadow-xs">
                <div className="flex items-center gap-1.5 text-xs text-[#716D67]">
                  <ShieldCheck size={14} className="text-emerald-600" />
                  <span>Survival Rate</span>
                </div>
                <p
                  className={`text-2xl font-bold mt-1 tabular-nums ${
                    safetyConfidencePct >= 85
                      ? "text-emerald-700"
                      : safetyConfidencePct >= 60
                      ? "text-amber-700"
                      : "text-red-700"
                  }`}
                >
                  {safetyConfidencePct}%
                </p>
                <p className="text-[11px] text-[#716D67] mt-1 leading-tight">
                  In {Math.round((safetyConfidencePct / 100) * draws).toLocaleString()} of {draws} simulated months,
                  your bank never dipped below zero (risk of cash ruin: {(ruinProbability * 100).toFixed(1)}%).
                </p>
              </div>

              {/* Card 2 */}
              <div className="p-3.5 rounded-lg bg-[#FFFEFA] border border-[#DEDBD4] shadow-xs">
                <div className="flex items-center gap-1.5 text-xs text-[#716D67]">
                  <TrendingUp size={14} className="text-[#B65F3E]" />
                  <span>Worst-Case Cushion</span>
                </div>
                <p
                  className={`text-2xl font-bold mt-1 tabular-nums ${
                    p10Buffer >= 0 ? "text-[#1B0D08]" : "text-red-700"
                  }`}
                >
                  {formatINR(p10Buffer)}
                </p>
                <p className="text-[11px] text-[#716D67] mt-1 leading-tight">
                  Even in the bottom 10% worst market stretch, this is what remains on {dueDate}.
                </p>
              </div>

              {/* Card 3 */}
              <div className="p-3.5 rounded-lg bg-[#FFFEFA] border border-[#DEDBD4] shadow-xs">
                <div className="flex items-center gap-1.5 text-xs text-[#716D67]">
                  <Sliders size={14} className="text-[#B65F3E]" />
                  <span>Realistic Cash Velocity</span>
                </div>
                <p className="text-2xl font-bold mt-1 tabular-nums text-[#1B0D08]">
                  {(bayesian.p10 * 100).toFixed(0)}%–{(bayesian.p90 * 100).toFixed(0)}%
                </p>
                <p className="text-[11px] text-[#716D67] mt-1 leading-tight">
                  Credibility range for cash sales, blending your slider with Indian retail baselines.
                </p>
              </div>

              {/* Card 4 */}
              <div className="p-3.5 rounded-lg bg-[#FFFEFA] border border-[#DEDBD4] shadow-xs">
                <div className="flex items-center gap-1.5 text-xs text-[#716D67]">
                  <Sparkles size={14} className="text-[#B65F3E]" />
                  <span>Expected Surplus</span>
                </div>
                <p className="text-2xl font-bold mt-1 tabular-nums text-[#B65F3E]">
                  {formatINR(p50Buffer)}
                </p>
                <p className="text-[11px] text-[#716D67] mt-1 leading-tight">
                  Median balance left over (optimistic upside reaches {formatINR(p90Buffer)}).
                </p>
              </div>
            </div>
          </div>

          {/* Visual Fan Chart Section */}
          <div className="p-4 rounded-lg bg-[#FFFEFA] border border-[#DEDBD4] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-xs text-[#1B0D08]">The 2,000-Path Cashflow Fan</p>
                <p className="text-[11px] text-[#716D67]">Cumulative bank balance leading up to your bill</p>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-mono">
                <span className="flex items-center gap-1 text-[#716D67]">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#F6E8E0] border border-[#B65F3E]" />
                  Likely Band (80%)
                </span>
                <span className="flex items-center gap-1 text-[#1B0D08] font-semibold">
                  <span className="w-2.5 h-0.5 bg-[#1B0D08]" />
                  Expected Path
                </span>
              </div>
            </div>

            {/* SVG Chart */}
            <div className="w-full overflow-x-auto bg-[#FAF9F6] p-2 rounded-md border border-[#DEDBD4]/60">
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="w-full h-auto select-none"
                style={{ minWidth: "440px" }}
              >
                {/* Horizontal Gridlines */}
                {[minVal, (minVal + maxVal) / 2, maxVal].map((val, idx) => (
                  <g key={idx}>
                    <line
                      x1={padding.left}
                      y1={getY(val)}
                      x2={chartWidth - padding.right}
                      y2={getY(val)}
                      stroke="#DEDBD4"
                      strokeDasharray="3 3"
                    />
                    <text
                      x={padding.left - 8}
                      y={getY(val) + 3}
                      textAnchor="end"
                      fill="#716D67"
                      fontSize="9"
                      fontFamily="monospace"
                    >
                      {val >= 0 ? `₹${(val / 1000).toFixed(0)}k` : `-₹${(Math.abs(val) / 1000).toFixed(0)}k`}
                    </text>
                  </g>
                ))}

                {/* ₹0 Insolvency Line */}
                {zeroLineY >= padding.top && zeroLineY <= padding.top + plotHeight && (
                  <g>
                    <line
                      x1={padding.left}
                      y1={zeroLineY}
                      x2={chartWidth - padding.right}
                      y2={zeroLineY}
                      stroke="#EF4444"
                      strokeWidth="1.2"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={chartWidth - padding.right - 2}
                      y={zeroLineY - 3}
                      textAnchor="end"
                      fill="#EF4444"
                      fontSize="8"
                      fontWeight="600"
                      fontFamily="monospace"
                    >
                      ₹0 Danger Line
                    </text>
                  </g>
                )}

                {/* 80% Ribbon */}
                {ribbonPath && (
                  <path
                    d={ribbonPath}
                    fill="#F6E8E0"
                    stroke="#B65F3E"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                )}

                {/* Median Line */}
                {p50Path && (
                  <path
                    d={p50Path}
                    fill="none"
                    stroke="#1B0D08"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                )}

                {/* Due Date Marker */}
                {dailySeries.length > 0 && result.dueIndex >= 0 && (
                  <g>
                    <line
                      x1={getX(result.dueIndex)}
                      y1={padding.top}
                      x2={getX(result.dueIndex)}
                      y2={padding.top + plotHeight}
                      stroke="#B65F3E"
                      strokeWidth="1.5"
                    />
                    <text
                      x={getX(result.dueIndex)}
                      y={padding.top - 5}
                      textAnchor="middle"
                      fill="#B65F3E"
                      fontSize="9"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      Bill Due: ₹{orderAmount.toLocaleString("en-IN")}
                    </text>
                  </g>
                )}
              </svg>
            </div>
            <p className="text-[11px] text-[#716D67] text-center italic">
              The shaded ribbon shows where your cash balance lands 80% of the time.
            </p>
          </div>

          {/* Hackathon Pitch Soundbite Box */}
          <div className="p-4 rounded-lg bg-[#F6E8E0]/70 border border-[#B65F3E]/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#1B0D08] flex items-center gap-1.5">
                <Sparkles size={14} className="text-[#B65F3E]" />
                How to explain this to a hackathon judge:
              </span>
              <button
                onClick={handleCopyPitch}
                className="text-[11px] font-mono text-[#B65F3E] hover:underline flex items-center gap-1 focus:outline-none"
              >
                {copiedPitch ? <Check size={12} /> : <Copy size={12} />}
                {copiedPitch ? "Copied" : "Copy pitch snippet"}
              </button>
            </div>
            <p className="text-xs text-[#1B0D08]/90 italic leading-relaxed bg-[#FFFEFA] p-2.5 rounded border border-[#DEDBD4]/70">
              &ldquo;Instead of naive flat averages, we treat unrecorded cash as a latent parameter modeled via
              Bayesian Beta inference, and convolve it with Prophet's forecast variance across a 2,000-draw Monte
              Carlo simulation to calculate exact Value-at-Risk.&rdquo;
            </p>
          </div>

          {/* Technical / Mathematical Formulation Dropdown */}
          <div className="rounded-lg border border-[#DEDBD4] bg-[#FFFEFA] overflow-hidden">
            <button
              onClick={() => setShowFormulas(!showFormulas)}
              className="w-full px-4 py-3 text-xs font-semibold text-[#1B0D08] flex items-center justify-between hover:bg-[#FAF9F6] transition-colors focus:outline-none"
            >
              <span>🔬 View exact mathematical equations (Quant breakdown)</span>
              {showFormulas ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showFormulas && (
              <div className="p-4 border-t border-[#DEDBD4] bg-[#FAF9F6] text-xs font-mono space-y-2 text-[#716D67]">
                <div>
                  <span className="font-semibold text-[#1B0D08]">1. Bayesian Cash Velocity Prior:</span>
                  <p className="mt-0.5 text-[11px]">
                    s &sim; Beta(&alpha;&#8320; + c &middot; w, &nbsp;&beta;&#8320; + (1 - c) &middot; w)
                  </p>
                  <p className="text-[10px] text-[#716D67]">
                    &alpha;&#8320;=4, &beta;&#8320;=6 (Indian Kirana empirical baseline), updated with owner slider c.
                  </p>
                </div>
                <div className="pt-2 border-t border-[#DEDBD4]/50">
                  <span className="font-semibold text-[#1B0D08]">2. Stochastic Convolution:</span>
                  <p className="mt-0.5 text-[11px]">
                    UPI&#8348; &sim; LogNormal(&mu;&#8348;, &sigma;&#178;) &nbsp;&otimes;&nbsp; Total&#8348; = UPI&#8348; / (1 - s)
                  </p>
                </div>
                <div className="pt-2 border-t border-[#DEDBD4]/50">
                  <span className="font-semibold text-[#1B0D08]">3. Ruin Probability & VaR:</span>
                  <p className="mt-0.5 text-[11px]">
                    P(Ruin) = &Sigma; &#x1D7D9;( min&#123;B&#8348; : t &le; T&#125; &lt; 0 ) / 2000
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="px-6 py-4 border-t border-[#DEDBD4] bg-[#FFFEFA] flex items-center justify-between">
          <span className="text-xs text-[#716D67]">
            Confidence evaluated over 2,000 paths
          </span>
          <button
            onClick={onClose}
            className="h-9 px-4 rounded-md bg-[#1B0D08] text-[#FAF9F6] text-xs font-medium hover:bg-[#B65F3E] transition-colors focus:outline-none"
          >
            Got it, back to planner
          </button>
        </div>
      </div>
    </div>
  );
}
