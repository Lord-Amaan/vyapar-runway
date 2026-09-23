import { useState, useEffect, useRef } from "react";
import {
  CircleCheck,
  TriangleAlert,
  CircleX,
  Copy,
} from "lucide-react";
import type { ForecastDay, ShopInputs } from "../types";
import { totalsUntil, getVerdict } from "../lib/forecast";
import { formatINR, formatShortDate } from "../lib/format";
import { translate, type Language } from "../i18n";
import AdvisorPanel from "./AdvisorPanel";
import ModelInspectionModal from "./ModelInspectionModal";
import { fetchSimulation, type SimulationResult } from "../lib/api";

interface RestockSimulatorProps {
  forecast: ForecastDay[];
  cashOutOf10: number;
  shopInputs: ShopInputs;
  language: Language;
}

/** Format a number with Indian grouping (e.g. 250000 → "2,50,000"). */
function formatIndian(n: number): string {
  return new Intl.NumberFormat("en-IN").format(n);
}

/** Start with 75% of the money available by the sample due date as a cautious example order. */
function computePrefillAmount(
  forecast: ForecastDay[],
  prefillDate: string,
  shopInputs: ShopInputs,
): number {
  const { bank, galla } = totalsUntil(forecast, prefillDate);
  const available =
    shopInputs.bankBalance + shopInputs.drawerCash + bank + galla -
    shopInputs.moneyGoingOut - shopInputs.promisedPayments;
  const raw = Math.max(0, available * 0.75);
  return Math.max(10000, Math.round(raw / 10000) * 10000);
}

export default function RestockSimulator({
  forecast,
  cashOutOf10,
  shopInputs,
  language,
}: RestockSimulatorProps) {
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  const minDate = forecast[0]?.date ?? "";
  const maxDate = forecast[forecast.length - 1]?.date ?? "";

  // Prefill date = 25th day (index 24); prefill amount = 125% of bank total till that date
  const prefillDate = forecast[24]?.date ?? maxDate;
  const prefillAmount = computePrefillAmount(forecast, prefillDate, shopInputs);

  const [orderAmount, setOrderAmount] = useState<number>(prefillAmount);
  const [rawInput, setRawInput] = useState<string>(formatIndian(prefillAmount));
  const [dueDate, setDueDate] = useState<string>(prefillDate);
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [simResult, setSimResult] = useState<SimulationResult | null>(null);
  const [modelModalOpen, setModelModalOpen] = useState(false);

  // Background Monte Carlo & Bayesian simulation fetch
  useEffect(() => {
    if (!dueDate || orderAmount <= 0) {
      setSimResult(null);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetchSimulation(
        {
          orderAmount,
          dueDate,
          cashOutOf10,
          bankBalance: shopInputs.bankBalance,
          drawerCash: shopInputs.drawerCash,
          dailyFixedExpense: Math.round(shopInputs.moneyGoingOut / 30),
          promisedPayments: shopInputs.promisedPayments,
          dailyUpiForecast: forecast.map((f) => ({ date: f.date, amount: f.bankMoney })),
        },
        controller.signal
      )
        .then((res) => {
          if (!controller.signal.aborted) {
            setSimResult(res);
          }
        })
        .catch(() => {
          // Keep prior state on abort/network failure
        });
    }, 150);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [
    orderAmount,
    dueDate,
    cashOutOf10,
    shopInputs.bankBalance,
    shopInputs.drawerCash,
    shopInputs.moneyGoingOut,
    shopInputs.promisedPayments,
    forecast,
  ]);

  // Validate date
  const dateValid =
    dueDate.length > 0 && dueDate >= minDate && dueDate <= maxDate;

  // Derive range label for error message ("1 Oct" to "30 Oct")
  const minLabel = minDate ? formatShortDate(minDate) : "";
  const maxLabel = maxDate ? formatShortDate(maxDate) : "";
  const dateErrorText =
    language === "hi"
      ? `${minLabel} और ${maxLabel} के बीच की तारीख चुनें।`
      : language === "mr"
      ? `${minLabel} आणि ${maxLabel} दरम्यानची तारीख निवडा.`
      : `Pick a date between ${minLabel} and ${maxLabel}.`;

  // Compute verdict
  const forecastTotals = dateValid
    ? totalsUntil(forecast, dueDate)
    : { bank: 0, galla: 0 };
  const bank = shopInputs.bankBalance + forecastTotals.bank -
    shopInputs.moneyGoingOut - shopInputs.promisedPayments;
  const galla = shopInputs.drawerCash + forecastTotals.galla;

  const verdict =
    !dateValid || orderAmount <= 0
      ? { level: "idle" as const, fromGalla: 0, shortBy: 0 }
      : getVerdict(orderAmount, bank, galla);

  const dueDateLabel = dueDate ? formatShortDate(dueDate) : "";

  // --- Handlers ---
  function handleAmountChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 9);
    const num = digits === "" ? 0 : parseInt(digits, 10);
    setOrderAmount(num);
    setRawInput(digits === "" ? "" : formatIndian(num));
  }

  function buildVerdictExplanation(): string {
    switch (verdict.level) {
      case "green":
        return t("verdictGreenText");
      case "yellow":
        if (language === "hi") {
          return `बैंक का पैसा ₹${formatIndian(bank)} कवर करता है। थोक व्यापारी को भुगतान के लिए आपको अपने गल्ले से लगभग ₹${formatIndian(verdict.fromGalla)} की आवश्यकता होगी।`;
        }
        if (language === "mr") {
          return `बँकेतील पैसे ₹${formatIndian(bank)} भागवतात. घाऊक व्यापाऱ्याला देण्यासाठी तुम्हाला गल्ल्यातून सुमारे ₹${formatIndian(verdict.fromGalla)} ची गरज भासेल।`;
        }
        return `Money in the bank covers ₹${formatIndian(bank)}. You will need about ₹${formatIndian(verdict.fromGalla)} from your cash drawer to pay the wholesaler.`;
      case "red":
        if (language === "hi") {
          return `गल्ले की नकद मिलाकर भी ${dueDateLabel} तक आपके पास ₹${formatIndian(verdict.shortBy)} कम पड़ सकते हैं। छोटा ऑर्डर दें या बाद की तारीख चुनें।`;
        }
        if (language === "mr") {
          return `गल्ल्यातील रोख मिळवूनही ${dueDateLabel} पर्यंत तुमच्याकडे ₹${formatIndian(verdict.shortBy)} कमी पडू शकतात. लहान ऑर्डर द्या किंवा नंतरची तारीख निवडा.`;
        }
        return `Even with your drawer cash you may be ₹${formatIndian(verdict.shortBy)} short by ${dueDateLabel}. Try a smaller order or a later date.`;
      default:
        return "";
    }
  }

  function handleCopyWhatsApp() {
    if (config === null || verdict.level === "idle") return;
    const currentDate = new Date().toLocaleDateString(language === "hi" ? "hi-IN" : language === "mr" ? "mr-IN" : "en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const text = [
      `${t("appTitle")} — ${currentDate}`,
      `${t("paymentLabel")}: ₹${formatIndian(orderAmount)} (${t("dateLabel")}: ${dueDateLabel})`,
      `${t("bankLabel")}: ₹${formatIndian(bank)}`,
      `${t("gallaLabel")}: ₹${formatIndian(galla)}`,
      "",
      `${config.heading} — ${buildVerdictExplanation()}`,
    ].join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 3000);
    });
  }

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  // --- Verdict UI config ---
  type VerdictConfig = {
    bg: string;
    border: string;
    textColor: string;
    headingColor: string;
    icon: React.ReactNode;
    heading: string;
    body: React.ReactNode;
  };

  function buildVerdictConfig(): VerdictConfig | null {
    switch (verdict.level) {
      case "green":
        return {
          bg: "#F0FDF4",
          border: "#86EFAC",
          textColor: "#166534",
          headingColor: "#166534",
          icon: (
            <CircleCheck
              size={20}
              strokeWidth={1.75}
              style={{ flexShrink: 0, color: "#166534" }}
            />
          ),
          heading: t("verdictGreenHeading"),
          body: <p className="text-[16px] mt-1">{t("verdictGreenText")}</p>,
        };
      case "yellow":
        return {
          bg: "#FEFCE8",
          border: "#FDE047",
          textColor: "#854D0E",
          headingColor: "#854D0E",
          icon: (
            <TriangleAlert
              size={20}
              strokeWidth={1.75}
              style={{ flexShrink: 0, color: "#854D0E" }}
            />
          ),
          heading: t("verdictYellowHeading"),
          body:
            language === "hi" ? (
              <p className="text-[16px] mt-1">
                बैंक का पैसा{" "}
                <span style={{ fontVariantNumeric: "tabular-nums" }}>
                  {formatINR(bank)}
                </span>{" "}
                कवर करता है। थोक व्यापारी को भुगतान के लिए आपको अपने गल्ले से लगभग{" "}
                <span style={{ fontVariantNumeric: "tabular-nums" }}>
                  {formatINR(verdict.fromGalla)}
                </span>{" "}
                की आवश्यकता होगी।
              </p>
            ) : language === "mr" ? (
              <p className="text-[16px] mt-1">
                बँकेतील पैसे{" "}
                <span style={{ fontVariantNumeric: "tabular-nums" }}>
                  {formatINR(bank)}
                </span>{" "}
                भागवतात. घाऊक व्यापाऱ्याला देण्यासाठी तुम्हाला गल्ल्यातून सुमारे{" "}
                <span style={{ fontVariantNumeric: "tabular-nums" }}>
                  {formatINR(verdict.fromGalla)}
                </span>{" "}
                ची गरज भासेल.
              </p>
            ) : (
              <p className="text-[16px] mt-1">
                Money in the bank covers{" "}
                <span style={{ fontVariantNumeric: "tabular-nums" }}>
                  {formatINR(bank)}
                </span>
                . You will need about{" "}
                <span style={{ fontVariantNumeric: "tabular-nums" }}>
                  {formatINR(verdict.fromGalla)}
                </span>{" "}
                from your Galla (drawer) to pay the wholesaler.
              </p>
            ),
        };
      case "red":
        return {
          bg: "#FEF2F2",
          border: "#FCA5A5",
          textColor: "#991B1B",
          headingColor: "#991B1B",
          icon: (
            <CircleX
              size={20}
              strokeWidth={1.75}
              style={{ flexShrink: 0, color: "#991B1B" }}
            />
          ),
          heading: t("verdictRedHeading"),
          body:
            language === "hi" ? (
              <p className="text-[16px] mt-1">
                गल्ले की नकद मिलाकर भी {dueDateLabel} तक आपके पास{" "}
                <span style={{ fontVariantNumeric: "tabular-nums" }}>
                  {formatINR(verdict.shortBy)}
                </span>{" "}
                कम पड़ सकते हैं। छोटा ऑर्डर दें या बाद की तारीख चुनें।
              </p>
            ) : language === "mr" ? (
              <p className="text-[16px] mt-1">
                गल्ल्यातील रोख मिळवूनही {dueDateLabel} पर्यंत तुमच्याकडे{" "}
                <span style={{ fontVariantNumeric: "tabular-nums" }}>
                  {formatINR(verdict.shortBy)}
                </span>{" "}
                कमी पडू शकतात. लहान ऑर्डर द्या किंवा नंतरची तारीख निवडा.
              </p>
            ) : (
              <p className="text-[16px] mt-1">
                Even with your drawer cash you may be{" "}
                <span style={{ fontVariantNumeric: "tabular-nums" }}>
                  {formatINR(verdict.shortBy)}
                </span>{" "}
                short by {dueDateLabel}. Try a smaller order or a later date.
              </p>
            ),
        };
      default:
        return null;
    }
  }

  const config = buildVerdictConfig();

  const showAdvisor = verdict.level === "yellow" || verdict.level === "red";
  const advisorShortfall =
    verdict.level === "red" ? verdict.shortBy : verdict.fromGalla;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-5">
      {/* Card heading */}
      <h2 className="text-[18px] font-semibold text-gray-900 pb-3 border-b border-gray-200">
        {t("simulatorHeading")}
      </h2>

      {/* Form fields */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Field 1: Order amount */}
        <div>
          <label
            htmlFor="order-amount"
            className="block text-[16px] text-gray-900 mb-1"
          >
            {t("paymentLabel")}
          </label>
          <div
            className="flex items-center border border-gray-300 rounded-md"
            style={{ height: "44px" }}
          >
            <span
              className="pl-3 pr-2 text-[16px] text-gray-500 select-none"
              aria-hidden="true"
            >
              ₹
            </span>
            <input
              id="order-amount"
              type="text"
              inputMode="numeric"
              value={rawInput}
              onChange={handleAmountChange}
              placeholder="2,50,000"
              className="flex-1 min-w-0 pr-3 text-[16px] text-gray-900 bg-transparent focus:outline-none focus:ring-0"
              style={{ fontVariantNumeric: "tabular-nums", border: "none" }}
              aria-label={t("paymentLabel")}
            />
          </div>
        </div>

        {/* Field 2: Due date */}
        <div>
          <label
            htmlFor="due-date"
            className="block text-[16px] text-gray-900 mb-1"
          >
            {t("dateLabel")}
          </label>
          <input
            id="due-date"
            type="date"
            value={dueDate}
            min={minDate}
            max={maxDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="focus-copper w-full border border-gray-300 rounded-md px-3 text-[16px] text-gray-900 focus:outline-none focus:ring-2"
            style={{ height: "44px" }}
          />
          {/* Inline date validation error */}
          {dueDate.length > 0 && !dateValid && (
            <p className="mt-1 text-[14px] text-red-600" role="alert">
              {dateErrorText}
            </p>
          )}
        </div>

      </div>

      {/* Verdict card */}
      <div className="mt-4" role="status" aria-live="polite">
        {verdict.level === "idle" && (
          <div
            className="rounded-lg p-4"
            style={{
              background: "#F9FAFB",
              border: "1px solid #E5E7EB",
              color: "#4B5563",
            }}
          >
            <p className="text-[16px]">{t("verdictIdleText")}</p>
          </div>
        )}

        {config !== null && (
          <div
            className="rounded-lg p-4"
            style={{
              background: config.bg,
              border: `1px solid ${config.border}`,
              color: config.textColor,
            }}
          >
            {/* Icon + heading row */}
            <div className="flex items-center gap-2">
              {config.icon}
              <p
                className="text-[18px] font-semibold"
                style={{ color: config.headingColor }}
              >
                {config.heading}
              </p>
            </div>
            {/* Body text */}
            {config.body}

            {/* Humanized Simulation Badge & Drawer Trigger */}
            {simResult && (
              <div className="mt-3 pt-3 border-t border-black/10 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 font-medium">
                  <span className="inline-block w-2 h-2 rounded-full bg-current opacity-80" />
                  <span>
                    {simResult.safetyConfidencePct}% {t("simulationConfidence")}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setModelModalOpen(true)}
                  className="font-medium underline underline-offset-2 hover:opacity-80 transition-opacity focus:outline-none cursor-pointer"
                >
                  {t("seeHowTested")}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* WhatsApp summary button — shown for any non-idle verdict */}
      {config !== null && (
        <div className="mt-3">
          <button
            id="copy-whatsapp-btn"
            type="button"
            onClick={handleCopyWhatsApp}
            className="inline-flex items-center gap-2 h-11 px-4 rounded-md border border-[#DEDBD4] bg-[#FFFEFA] text-[#1B0D08] font-medium hover:bg-[#F6E8E0] focus:outline-none focus:ring-2 focus:ring-[#B65F3E] text-[15px]"
          >
            <Copy size={16} strokeWidth={1.75} aria-hidden="true" />
            {t("copyWhatsApp")}
          </button>
          <p
            aria-live="polite"
            className="mt-1 text-[14px] text-[#716D67]"
            style={{ minHeight: "20px" }}
          >
            {copied ? t("copiedNotice") : ""}
          </p>
        </div>
      )}

      {/* Ask AI panel — available for yellow and red verdicts */}
      {showAdvisor && (
        <div className="mt-4">
          <AdvisorPanel
            shortfall={advisorShortfall}
            dueDate={dueDate}
            language={language}
            context={{
              bankToday: shopInputs.bankBalance,
              drawerCash: shopInputs.drawerCash,
              expectedUpi: forecastTotals.bank,
              expectedCash: forecastTotals.galla,
              moneyGoingOut: shopInputs.moneyGoingOut,
              promisedPayments: shopInputs.promisedPayments,
              orderAmount,
            }}
          />
        </div>
      )}

      {/* Hackathon Quant Model & VaR Inspection Modal */}
      <ModelInspectionModal
        isOpen={modelModalOpen}
        onClose={() => setModelModalOpen(false)}
        result={simResult}
        orderAmount={orderAmount}
        dueDate={dueDateLabel || dueDate}
      />
    </div>
  );
}
