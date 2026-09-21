import type { UpiDay, ForecastDay } from "../types";

/** Clamps the raw cashOutOf10 slider value to the valid integer range 0..8. */
export function clampCashOutOf10(n: number): number {
  return Math.max(0, Math.min(8, Math.round(n)));
}

/**
 * Build a 30-day dual-band forecast from UPI days.
 *
 * bankMoney  = day.amount  (verified bank / UPI receipts)
 * gallaCash  = Math.round(bankMoney * r / (1 - r))
 *   where r  = clampedValue / 10
 *
 * At r = 0   → gallaCash = 0
 * At r = 0.4 → gallaCash ≈ 0.667 × bankMoney   (4 out of 10)
 * At r = 0.8 → gallaCash = 4 × bankMoney        (8 out of 10)
 */
export function buildForecast(days: UpiDay[], cashOutOf10: number): ForecastDay[] {
  const clamped = clampCashOutOf10(cashOutOf10);
  const r = clamped / 10;

  return days.map((day) => {
    const bankMoney = day.amount;
    // When r === 0, gallaCash must be 0 (guard avoids 0/0 = NaN)
    const gallaCash = r === 0 ? 0 : Math.round((bankMoney * r) / (1 - r));
    return {
      date: day.date,
      bankMoney,
      gallaCash,
      total: bankMoney + gallaCash,
    };
  });
}
