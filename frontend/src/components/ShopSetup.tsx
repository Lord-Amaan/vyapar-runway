import { useState } from "react";
import type { ShopInputs } from "../types";

interface ShopSetupProps {
  onContinue: (inputs: ShopInputs) => void;
}

type AmountField = keyof ShopInputs;

const fields: Array<{ key: AmountField; label: string; helper: string; placeholder: string }> = [
  {
    key: "bankBalance",
    label: "How much money is in your bank today?",
    helper: "Your current bank balance, not this month's sales.",
    placeholder: "50,000",
  },
  {
    key: "drawerCash",
    label: "How much cash is in your drawer?",
    helper: "Count the cash you can use for the stock order.",
    placeholder: "20,000",
  },
  {
    key: "moneyGoingOut",
    label: "How much money will go out before then?",
    helper: "Rent, salaries, bills, or other usual payments.",
    placeholder: "15,000",
  },
  {
    key: "promisedPayments",
    label: "How much do you already owe others?",
    helper: "Supplier payments or bills due before this order.",
    placeholder: "10,000",
  },
];

function formatIndian(value: number): string {
  return value === 0 ? "" : new Intl.NumberFormat("en-IN").format(value);
}

export default function ShopSetup({ onContinue }: ShopSetupProps) {
  const [values, setValues] = useState<ShopInputs>({
    bankBalance: 0,
    drawerCash: 0,
    moneyGoingOut: 0,
    promisedPayments: 0,
  });
  const [rawValues, setRawValues] = useState<Record<AmountField, string>>({
    bankBalance: "",
    drawerCash: "",
    moneyGoingOut: "",
    promisedPayments: "",
  });

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
        <p className="section-kicker">Start with today</p>
        <h2 id="shop-setup-title">Tell us about your shop</h2>
        <p>
          We will add what you already have and take away what must be paid before your next stock order.
        </p>
      </div>

      <form className="shop-setup-form" onSubmit={handleSubmit}>
        {fields.map(({ key, label, helper, placeholder }) => (
          <div className="shop-setup-field" key={key}>
            <label htmlFor={`shop-${key}`}>{label}</label>
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
            <p>{helper}</p>
          </div>
        ))}
        <button type="submit" className="primary-action shop-setup-submit">
          Show my stock money
        </button>
      </form>
    </section>
  );
}
