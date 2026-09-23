import { Fragment, useState, useEffect } from "react";
import type { DetectedObligation, ShopInputs } from "../types";
import { translate, type Language } from "../i18n";

interface ShopSetupProps {
  onContinue: (inputs: ShopInputs) => void;
  initialBankBalance?: number;
  aaBadge?: React.ReactNode;
  detectedObligations?: DetectedObligation[];
  language: Language;
}

type AmountField = keyof ShopInputs;

function formatIndian(value: number): string {
  return value === 0 ? "" : new Intl.NumberFormat("en-IN").format(value);
}

export default function ShopSetup({
  onContinue,
  initialBankBalance,
  aaBadge,
  detectedObligations = [],
  language,
}: ShopSetupProps) {
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);

  // Field configuration with i18n keys
  const fields: Array<{ key: AmountField; labelKey: Parameters<typeof translate>[1]; helperKey: Parameters<typeof translate>[1]; placeholder: string }> = [
    {
      key: "bankBalance",
      labelKey: "bankTodayQuestion",
      helperKey: "bankTodayHelper",
      placeholder: "50,000",
    },
    {
      key: "drawerCash",
      labelKey: "drawerCashQuestion",
      helperKey: "drawerCashHelper",
      placeholder: "20,000",
    },
    {
      key: "moneyGoingOut",
      labelKey: "moneyGoingOutQuestion",
      helperKey: "moneyGoingOutHelper",
      placeholder: "15,000",
    },
    {
      key: "promisedPayments",
      labelKey: "promisedPaymentsQuestion",
      helperKey: "promisedPaymentsHelper",
      placeholder: "10,000",
    },
  ];

  const [values, setValues] = useState<ShopInputs>({
    bankBalance: initialBankBalance ?? 0,
    drawerCash: 0,
    moneyGoingOut: 0,
    promisedPayments: 0,
  });
  const [rawValues, setRawValues] = useState<Record<AmountField, string>>({
    bankBalance: initialBankBalance ? formatIndian(initialBankBalance) : "",
    drawerCash: "",
    moneyGoingOut: "",
    promisedPayments: "",
  });
  const [selectedObligations, setSelectedObligations] = useState<boolean[]>(
    () => detectedObligations.map(() => true),
  );

  useEffect(() => {
    setSelectedObligations(detectedObligations.map(() => true));
  }, [detectedObligations]);

  useEffect(() => {
    if (initialBankBalance !== undefined && initialBankBalance !== null) {
      setValues((current) => ({ ...current, bankBalance: initialBankBalance }));
      setRawValues((current) => ({ ...current, bankBalance: formatIndian(initialBankBalance) }));
    }
  }, [initialBankBalance]);

  function updateField(key: AmountField, input: string) {
    const digits = input.replace(/\D/g, "").slice(0, 9);
    const value = digits === "" ? 0 : Number.parseInt(digits, 10);
    setValues((current) => ({ ...current, [key]: value }));
    setRawValues((current) => ({ ...current, [key]: formatIndian(value) }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onContinue(values);
  }

  function handleAddObligations() {
    const total = detectedObligations.reduce(
      (sum, obligation, index) =>
        sum + (selectedObligations[index] ? obligation.amount : 0),
      0,
    );
    setValues((current) => ({ ...current, moneyGoingOut: total }));
    setRawValues((current) => ({ ...current, moneyGoingOut: formatIndian(total) }));
  }

  return (
    <section className="shop-setup" aria-labelledby="shop-setup-title">
      <div className="shop-setup-intro">
        <p className="section-kicker">{t("startWithToday")}</p>
        <h2 id="shop-setup-title">{t("shopSetupSubtitle")}</h2>
        <p>{t("shopSetupIntro")}</p>
      </div>

      <form className="shop-setup-form" onSubmit={handleSubmit}>
        {fields.map(({ key, labelKey, helperKey, placeholder }) => (
          <Fragment key={key}>
            {key === "moneyGoingOut" && detectedObligations.length > 0 && (
              <div className="col-span-full rounded-md border border-[#DEDBD4] bg-[#FFFEFA] p-4">
                <h3
                  className="text-[16px] font-semibold text-[#190B05]"
                  style={{ fontFamily: "Sentient, 'Iowan Old Style', Baskerville, Georgia, serif" }}
                >
                  Detected Recurring Monthly Bills
                </h3>
                <div className="mt-3 flex flex-col gap-2">
                  {detectedObligations.map((obligation, index) => (
                    <label
                      key={`${obligation.label}-${obligation.dayOfMonth}`}
                      className="flex items-center gap-2 text-[14px] text-[#1B0D08]"
                    >
                      <input
                        type="checkbox"
                        checked={selectedObligations[index] ?? true}
                        onChange={(event) => {
                          const next = [...selectedObligations];
                          next[index] = event.target.checked;
                          setSelectedObligations(next);
                        }}
                        className="accent-[#B65F3E]"
                      />
                      <span>
                        {obligation.label} · ₹{new Intl.NumberFormat("en-IN").format(obligation.amount)} · monthly on day {obligation.dayOfMonth}
                      </span>
                    </label>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleAddObligations}
                  className="mt-3 h-9 px-3 rounded-md border border-[#DEDBD4] bg-[#FFFEFA] text-xs font-medium text-[#1B0D08] hover:bg-[#F6E8E0] focus:outline-none focus:ring-2 focus:ring-[#B65F3E]"
                >
                  Add to committed outflows
                </button>
              </div>
            )}
            <div className="shop-setup-field">
              <label htmlFor={`shop-${key}`}>{t(labelKey)}</label>
              <div className="shop-setup-input">
                <span aria-hidden="true">₹</span>
                <input
                  id={`shop-${key}`}
                  type="text"
                  inputMode="numeric"
                  value={rawValues[key]}
                  onChange={(event) => updateField(key, event.target.value)}
                  placeholder={placeholder}
                />
              </div>
              <p>{t(helperKey)}</p>
              {key === "bankBalance" && aaBadge && (
                <div className="mt-1">{aaBadge}</div>
              )}
            </div>
          </Fragment>
        ))}
        <button type="submit" className="primary-action shop-setup-submit">
          {t("shopSetupSubmit")}
        </button>
      </form>
    </section>
  );
}
