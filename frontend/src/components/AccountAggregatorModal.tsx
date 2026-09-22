import { useState, useEffect } from "react";
import { translate, type Language } from "../i18n";

interface AccountAggregatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnected: (verifiedBalance: number) => void;
  language?: Language;
}

type Bank = "SBI" | "HDFC" | "ICICI";

export default function AccountAggregatorModal({
  isOpen,
  onClose,
  onConnected,
  language = "en",
}: AccountAggregatorModalProps) {
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedBank, setSelectedBank] = useState<Bank>("SBI");
  const [mobile, setMobile] = useState("98765 43210");
  const [otp, setOtp] = useState("1234");

  // Reset to step 1 each time modal opens
  useEffect(() => {
    if (isOpen) setStep(1);
  }, [isOpen]);

  // Auto-advance step 3 -> done
  useEffect(() => {
    if (step !== 3) return;
    const timer = setTimeout(() => {
      onConnected(74500);
      onClose();
    }, 1200);
    return () => clearTimeout(timer);
  }, [step, onConnected, onClose]);

  if (!isOpen) return null;

  const banks: Bank[] = ["SBI", "HDFC", "ICICI"];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="aa-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(25, 11, 5, 0.40)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-md rounded-lg border p-5"
        style={{
          background: "#FFFEFA",
          borderColor: "#DEDBD4",
        }}
      >
        {/* Header */}
        <div
          className="pb-3 mb-4 border-b flex items-center justify-between"
          style={{ borderColor: "#DEDBD4" }}
        >
          <h2
            id="aa-modal-title"
            className="text-[20px] font-semibold leading-tight"
            style={{ fontFamily: "Sentient, 'Iowan Old Style', Baskerville, Georgia, serif", color: "#1B0D08" }}
          >
            {step === 1 && t("aaStep1Title")}
            {step === 2 && t("aaStep2Title")}
            {step === 3 && t("aaStep3Title")}
          </h2>
          {step !== 3 && (
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="text-[#716D67] hover:text-[#1B0D08] focus:outline-none focus:ring-2 focus:ring-[#B65F3E] rounded"
              style={{ lineHeight: 1 }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path strokeLinecap="round" d="M4 4l12 12M16 4L4 16" />
              </svg>
            </button>
          )}
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div className="flex flex-col gap-5">
            <p className="text-[15px] leading-relaxed" style={{ color: "#716D67" }}>
              {t("aaStep1Desc")}
            </p>

            <div>
              <p className="text-[14px] font-medium mb-2" style={{ color: "#1B0D08" }}>
                {t("aaBankLabel")}
              </p>
              <div className="flex gap-2">
                {banks.map((bank) => {
                  const isActive = selectedBank === bank;
                  return (
                    <button
                      key={bank}
                      id={`aa-bank-${bank.toLowerCase()}`}
                      type="button"
                      onClick={() => setSelectedBank(bank)}
                      className="flex-1 h-11 rounded-md border text-[15px] font-medium focus:outline-none focus:ring-2 focus:ring-[#B65F3E]"
                      style={{
                        borderColor: isActive ? "#B65F3E" : "#DEDBD4",
                        background: isActive ? "#F6E8E0" : "#FFFEFA",
                        color: isActive ? "#B65F3E" : "#1B0D08",
                      }}
                    >
                      {bank}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label
                htmlFor="aa-mobile"
                className="block text-[14px] font-medium mb-1"
                style={{ color: "#1B0D08" }}
              >
                {t("aaMobileLabel")}
              </label>
              <input
                id="aa-mobile"
                type="tel"
                inputMode="numeric"
                maxLength={11}
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="98765 43210"
                className="w-full h-11 rounded-md border px-3 text-[16px] focus:outline-none focus:ring-2 focus:ring-[#B65F3E]"
                style={{
                  borderColor: "#DEDBD4",
                  background: "#FFFEFA",
                  color: "#1B0D08",
                }}
              />
            </div>

            <button
              id="aa-request-otp-btn"
              type="button"
              onClick={() => setStep(2)}
              className="h-11 rounded-md font-medium text-[15px] focus:outline-none focus:ring-2 focus:ring-[#B65F3E]"
              style={{ background: "#190B05", color: "#FAF9F6" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#B65F3E"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#190B05"; }}
            >
              {t("aaRequestOtp")}
            </button>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="flex flex-col gap-5">
            <div>
              <p className="text-[15px] leading-relaxed" style={{ color: "#1B0D08" }}>
                {t("aaOtpPrompt")}
              </p>
              <p className="text-[13px] mt-1" style={{ color: "#716D67" }}>
                {t("aaOtpDemoHint")}
              </p>
            </div>

            <div>
              <label
                htmlFor="aa-otp"
                className="block text-[14px] font-medium mb-1"
                style={{ color: "#1B0D08" }}
              >
                {t("aaOtpLabel")}
              </label>
              <input
                id="aa-otp"
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 4))}
                className="w-full h-11 rounded-md border px-3 text-[16px] tracking-widest focus:outline-none focus:ring-2 focus:ring-[#B65F3E]"
                style={{
                  borderColor: "#DEDBD4",
                  background: "#FFFEFA",
                  color: "#1B0D08",
                  fontVariantNumeric: "tabular-nums",
                }}
              />
            </div>

            <button
              id="aa-verify-btn"
              type="button"
              onClick={() => setStep(3)}
              className="h-11 rounded-md font-medium text-[15px] focus:outline-none focus:ring-2 focus:ring-[#B65F3E]"
              style={{ background: "#190B05", color: "#FAF9F6" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#B65F3E"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#190B05"; }}
            >
              {t("aaVerify")}
            </button>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div className="py-2">
            <p className="text-[15px] leading-relaxed" style={{ color: "#716D67" }}>
              {t("aaFetching")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
