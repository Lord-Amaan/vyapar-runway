export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export interface AdvisorContext {
  bankToday: number;
  drawerCash: number;
  expectedUpi: number;
  expectedCash: number;
  moneyGoingOut: number;
  promisedPayments: number;
  orderAmount: number;
}

/**
 * POST to /api/advisor and validate the response is exactly 3 non-empty strings.
 * Throws on network error, non-ok status, or bad payload shape.
 */
export async function fetchAdvice(
  shortfall: number,
  dueDate: string,
  context: AdvisorContext,
  signal: AbortSignal,
): Promise<[string, string, string]> {
  const res = await fetch(`${API_URL}/api/advisor`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ shortfall, dueDate, ...context }),
    signal,
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const data: unknown = await res.json();

  if (
    !Array.isArray(data) ||
    data.length < 3 ||
    !data.slice(0, 3).every((s) => typeof s === "string" && s.trim().length > 0)
  ) {
    throw new Error("Unexpected response shape");
  }

  return [data[0] as string, data[1] as string, data[2] as string];
}
