import {
  APP_TITLE,
  APP_SUBTITLE,
  BANK_SUM_LABEL,
  BANK_SUM_CAPTION,
  SAMPLE_DATA_NOTE,
  LOADING_TEXT,
  ERROR_TEXT,
} from "./copy";
import { formatINR } from "./lib/format";
import { useUpiData } from "./hooks/useUpiData";

export default function App() {
  const { days, status, retry } = useUpiData();

  const total = days.reduce((sum, d) => sum + d.amount, 0);

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-baseline gap-3">
          <h1 className="text-[20px] font-semibold text-gray-900">
            {APP_TITLE}
          </h1>
          <span className="text-[14px] text-gray-600">{APP_SUBTITLE}</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {status === "error" && (
          <div className="bg-red-50 border border-red-300 rounded-lg p-4 sm:p-5">
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
          <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-5">
            <p className="text-[14px] text-gray-500">{BANK_SUM_LABEL}</p>
            <p className="mt-2 text-[16px] text-gray-500">{LOADING_TEXT}</p>
          </div>
        )}

        {status === "success" && (
          <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-5">
            <p className="text-[14px] text-gray-500">{BANK_SUM_LABEL}</p>
            <p
              className="mt-2 text-[30px] font-semibold text-gray-900"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {formatINR(total)}
            </p>
            <p className="mt-1 text-[14px] text-gray-500">
              {BANK_SUM_CAPTION}
            </p>
            <p className="text-[14px] text-gray-500">{SAMPLE_DATA_NOTE}</p>
          </div>
        )}
      </main>
    </div>
  );
}
