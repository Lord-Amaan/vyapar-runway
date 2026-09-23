import { useMemo, useState } from "react";
import { ArrowDownRight, CalendarDays, Landmark } from "lucide-react";
import { buildForecast } from "./lib/forecast";
import { useUpiData } from "./hooks/useUpiData";
import CalibrationSlider from "./components/CalibrationSlider";
import DualRunwayChart from "./components/DualRunwayChart";
import RestockSimulator from "./components/RestockSimulator";
import RetailSummary from "./components/RetailSummary";
import LandingPage from "./components/LandingPage";
import ShopSetup from "./components/ShopSetup";
import DataImport from "./components/DataImport";
import AccountAggregatorModal from "./components/AccountAggregatorModal";
import LanguageSelect from "./components/LanguageSelect";
import type { DetectedObligation, ShopInputs } from "./types";
import { translate, type Language } from "./i18n";

function Dashboard({
  language,
  onLanguageChange,
}: {
  language: Language;
  onLanguageChange: (language: Language) => void;
}) {
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  const {
    days,
    status,
    retry,
    sourceSelected,
    chooseSample,
    uploadCsv,
    uploading,
    uploadError,
    modelWarning,
    detectedObligations,
  } = useUpiData();
  const [cashOutOf10, setCashOutOf10] = useState(4);
  const [shopInputs, setShopInputs] = useState<ShopInputs | null>(null);
  const [aaModalOpen, setAaModalOpen] = useState(false);
  const [aaConnected, setAaConnected] = useState(false);
  const [aaVerifiedBalance, setAaVerifiedBalance] = useState<number | null>(null);
  const [aaObligations, setAaObligations] = useState<DetectedObligation[]>([]);

  function handleAaConnected(verifiedBalance: number, obligations: DetectedObligation[]) {
    setAaVerifiedBalance(verifiedBalance);
    setAaObligations(obligations);
    setAaConnected(true);
    setShopInputs((prev) => (prev ? { ...prev, bankBalance: verifiedBalance } : null));
  }

  const total = days.reduce((sum, d) => sum + d.amount, 0);

  const forecast = useMemo(
    () => buildForecast(days, cashOutOf10),
    [days, cashOutOf10],
  );

  return (
    <div className="min-h-screen app-shell">
      <AccountAggregatorModal
        isOpen={aaModalOpen}
        onClose={() => setAaModalOpen(false)}
        onConnected={handleAaConnected}
        language={language}
      />
      <header className="app-header border-b border-gray-200 px-4 py-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="brand-mark" aria-hidden="true">
              <ArrowDownRight size={18} strokeWidth={2.2} />
            </div>
            <div>
              <h1 className="text-[20px] font-semibold leading-tight text-gray-900">
                {t("appTitle")}
              </h1>
              <p className="text-[13px] text-gray-500">{t("appSubtitle")}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSelect
              id="app-language-select"
              language={language}
              onChange={onLanguageChange}
              variant="light"
            />
            {aaConnected ? (
              <span
                className="hidden sm:inline-flex items-center text-xs font-medium px-2 py-1 rounded border"
                style={{
                  color: "#B65F3E",
                  background: "#F6E8E0",
                  borderColor: "#DEDBD4",
                }}
              >
                {t("aaConnected")}
              </span>
            ) : (
              <button
                id="aa-header-link-btn"
                type="button"
                onClick={() => setAaModalOpen(true)}
                className="hidden sm:inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-[#DEDBD4] bg-[#FFFEFA] text-[#1B0D08] text-[13px] font-medium hover:bg-[#F6E8E0] focus:outline-none focus:ring-2 focus:ring-[#B65F3E]"
              >
                <Landmark size={14} strokeWidth={1.75} aria-hidden="true" />
                {t("aaButton")}
              </button>
            )}
            <div className="hidden sm:flex items-center gap-2 text-[13px] text-gray-500">
              <CalendarDays size={16} strokeWidth={1.75} aria-hidden="true" />
              <span>{t("thirtyDayOutlook")}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="dashboard-main max-w-6xl mx-auto px-4 py-6 sm:px-6 lg:py-8">
        {status === "error" && (
          <div className="max-w-2xl mx-auto bg-red-50 border border-red-300 rounded-lg p-4 sm:p-5">
            <p className="text-[16px] text-red-800">{t("error")}</p>
            <button
              onClick={retry}
              className="primary-action mt-3 h-11 px-4 rounded-md text-white font-medium focus:outline-none focus:ring-2"
            >
              {t("retryButton")}
            </button>
          </div>
        )}

        {status === "loading" && (
          <div className="max-w-2xl mx-auto bg-white border border-gray-200 rounded-lg p-4 sm:p-5">
            <p className="text-[14px] text-gray-500">{t("bankSummaryLabel")}</p>
            <p className="mt-2 text-[16px] text-gray-500">{t("loading")}</p>
          </div>
        )}

        {status === "success" && (
          !sourceSelected ? (
            <DataImport
              onUseSample={chooseSample}
              onUpload={uploadCsv}
              uploading={uploading}
              error={uploadError}
              language={language}
            />
          ) : shopInputs === null ? (
            <>
              <div className="mb-3 flex items-center justify-between">
                <span />
                <button
                  id="aa-link-bank-btn"
                  type="button"
                  onClick={() => setAaModalOpen(true)}
                  className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-[#DEDBD4] bg-[#FFFEFA] text-[#1B0D08] text-[14px] font-medium hover:bg-[#F6E8E0] focus:outline-none focus:ring-2 focus:ring-[#B65F3E]"
                >
                  <Landmark size={15} strokeWidth={1.75} aria-hidden="true" />
                  {t("aaButton")}
                </button>
              </div>
              <ShopSetup
                onContinue={setShopInputs}
                initialBankBalance={aaVerifiedBalance ?? undefined}
                detectedObligations={detectedObligations.length > 0 ? detectedObligations : aaObligations}
                language={language}
                aaBadge={
                  aaConnected ? (
                    <span
                      className="inline-flex items-center text-xs font-medium px-2 py-1 rounded border"
                      style={{
                        color: "#B65F3E",
                        background: "#F6E8E0",
                        borderColor: "#DEDBD4",
                      }}
                    >
                      {t("aaConnected")}
                    </span>
                  ) : undefined
                }
              />
            </>
          ) : (
            <>
              {modelWarning && <p className="forecast-warning" role="status">{modelWarning}</p>}
              <RetailSummary
                forecast={forecast}
                totalBank={total}
                cashOutOf10={cashOutOf10}
                shopInputs={shopInputs}
                onEditShop={() => setShopInputs(null)}
                language={language}
              />

              <div className="mt-6 mb-3 flex items-end justify-between gap-4">
                <div>
                  <p className="section-kicker">{t("planCashMixKicker")}</p>
                  <h2 className="mt-1 text-[22px] font-semibold text-gray-900">{t("planCashMixHeading")}</h2>
                </div>
                <p className="hidden md:block max-w-xs text-right text-[13px] leading-5 text-gray-500">
                  {t("planCashMixHint")}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(250px,0.7fr)_minmax(0,1.3fr)] lg:items-stretch">
                <CalibrationSlider
                  value={cashOutOf10}
                  onChange={setCashOutOf10}
                  language={language}
                />
                <DualRunwayChart forecast={forecast} cashOutOf10={cashOutOf10} language={language} />
              </div>

              <div className="mt-6 mb-3">
                <p className="section-kicker">{t("makeDecisionKicker")}</p>
                <h2 className="mt-1 text-[22px] font-semibold text-gray-900">{t("makeDecisionHeading")}</h2>
              </div>
              <div>
                <RestockSimulator
                  forecast={forecast}
                  cashOutOf10={cashOutOf10}
                  shopInputs={shopInputs}
                  language={language}
                />
              </div>
            </>
          )
        )}
      </main>
    </div>
  );
}

export default function App() {
  const [language, setLanguage] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem("vyapar_language");
      if (saved === "hi" || saved === "mr" || saved === "en") return saved;
    } catch {
      // Ignore storage errors
    }
    return "en";
  });

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    try {
      localStorage.setItem("vyapar_language", lang);
    } catch {
      // Ignore storage errors
    }
  };

  return window.location.pathname.startsWith("/app") ? (
    <Dashboard language={language} onLanguageChange={handleLanguageChange} />
  ) : (
    <LandingPage language={language} onLanguageChange={handleLanguageChange} />
  );
}
