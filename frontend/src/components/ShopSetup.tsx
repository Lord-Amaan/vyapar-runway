import { useState, useEffect } from "react";
import type { ShopInputs } from "../types";
import { translate, type Language } from "../i18n";

interface ShopSetupProps {
  onContinue: (inputs: ShopInputs) => void;
  initialBankBalance?: number;
  aaBadge?: React.ReactNode;
  language: Language;
}

type AmountField = keyof ShopInputs;

function formatIndian(value: number): string {
  return value === 0 ? "" : new Intl.NumberFormat("en-IN").format(value);
}

export default function ShopSetup({ onContinue, initialBankBalance, aaBadge, language }: ShopSetupProps) {
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

  return (
    <section className="shop-setup" aria-labelledby="shop-setup-title">
      <div className="shop-setup-intro">
        <p className="section-kicker">{t("startWithToday")}</p>
        <h2 id="shop-setup-title">{t("shopSetupSubtitle")}</h2>
        <p>{t("shopSetupIntro")}</p>
      </div>

      <form className="shop-setup-form" onSubmit={handleSubmit}>
        {fields.map(({ key, labelKey, helperKey, placeholder }) => (
          <div className="shop-setup-field" key={key}>
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
        ))}
        <button type="submit" className="primary-action shop-setup-submit">
          {t("shopSetupSubmit")}
        </button>
      </form>
    </section>
  );
}
