import { useMemo, useState } from "react";
import { ArrowDownRight, CalendarDays } from "lucide-react";
import {
  APP_TITLE,
  APP_SUBTITLE,
  BANK_SUM_LABEL,
  LOADING_TEXT,
  ERROR_TEXT,
} from "./copy";
import { buildForecast } from "./lib/forecast";
import { useUpiData } from "./hooks/useUpiData";
import CalibrationSlider from "./components/CalibrationSlider";
import DualRunwayChart from "./components/DualRunwayChart";
import RestockSimulator from "./components/RestockSimulator";
import RetailSummary from "./components/RetailSummary";

export default function App() {
  const { days, status, retry } = useUpiData();
  const [cashOutOf10, setCashOutOf10] = useState(4);

  const total = days.reduce((sum, d) => sum + d.amount, 0);

  const forecast = useMemo(
    () => buildForecast(days, cashOutOf10),
    [days, cashOutOf10],
  );

  return (
    <div className="min-h-screen bg-[#F4F7FB]">
      <header className="border-b border-gray-200 bg-white px-4 py-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="brand-mark" aria-hidden="true">
              <ArrowDownRight size={18} strokeWidth={2.2} />
            </div>
            <div>
              <h1 className="text-[20px] font-semibold leading-tight text-gray-900">
                {APP_TITLE}
              </h1>
              <p className="text-[13px] text-gray-500">{APP_SUBTITLE}</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-[13px] text-gray-500">
            <CalendarDays size={16} strokeWidth={1.75} aria-hidden="true" />
            <span>30-day outlook</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 sm:px-6 lg:py-8">
        {status === "error" && (
          <div className="max-w-2xl mx-auto bg-red-50 border border-red-300 rounded-lg p-4 sm:p-5">
            <p className="text-[16px] text-red-800">{ERROR_TEXT}</p>
            <button
              onClick={retry}
              className="mt-3 h-11 px-4 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              Retry
            </button>
          </div>
        )}

        {status === "loading" && (
          <div className="max-w-2xl mx-auto bg-white border border-gray-200 rounded-lg p-4 sm:p-5">
            <p className="text-[14px] text-gray-500">{BANK_SUM_LABEL}</p>
            <p className="mt-2 text-[16px] text-gray-500">{LOADING_TEXT}</p>
          </div>
        )}

        {status === "success" && (
          <>
            <RetailSummary
              forecast={forecast}
              totalBank={total}
              cashOutOf10={cashOutOf10}
            />

            <div className="mt-6 mb-3 flex items-end justify-between gap-4">
              <div>
                <p className="section-kicker">Plan your cash mix</p>
                <h2 className="mt-1 text-[22px] font-semibold text-gray-900">See what your next month can carry</h2>
              </div>
              <p className="hidden md:block max-w-xs text-right text-[13px] leading-5 text-gray-500">
                Adjust the estimate, then check the daily runway before placing an order.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(250px,0.7fr)_minmax(0,1.3fr)] lg:items-stretch">
              <CalibrationSlider
                value={cashOutOf10}
                onChange={setCashOutOf10}
              />
              <DualRunwayChart forecast={forecast} cashOutOf10={cashOutOf10} />
            </div>

            <div className="mt-6 mb-3">
              <p className="section-kicker">Make the decision</p>
              <h2 className="mt-1 text-[22px] font-semibold text-gray-900">Plan your next wholesaler payment</h2>
            </div>
            <div>
              <RestockSimulator forecast={forecast} cashOutOf10={cashOutOf10} />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
