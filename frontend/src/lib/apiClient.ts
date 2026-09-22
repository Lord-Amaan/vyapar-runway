import { API_URL } from "./api";

// ── Session-based API client (§8.2) ──────────────────────────────

async function fetchJSON(url: string, options?: RequestInit) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(body?.error?.message || body?.message || `API error ${res.status}`);
  }
  return res.json();
}

export async function createSession(language = "en"): Promise<string> {
  const data = await fetchJSON(`${API_URL}/api/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ language }),
  });
  return data.session_id;
}

export async function uploadUPI(sessionId: string, file: File, mapping?: Record<string, string>) {
  const form = new FormData();
  form.append("file", file);
  if (mapping) form.append("mapping", JSON.stringify(mapping));
  return fetchJSON(`${API_URL}/api/session/${sessionId}/upi`, {
    method: "POST",
    body: form,
  });
}

export async function uploadBank(sessionId: string, file: File) {
  const form = new FormData();
  form.append("file", file);
  return fetchJSON(`${API_URL}/api/session/${sessionId}/bank`, {
    method: "POST",
    body: form,
  });
}

export async function tagPurchases(sessionId: string, suppliers: string[]) {
  return fetchJSON(`${API_URL}/api/session/${sessionId}/purchases`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ suppliers }),
  });
}

export async function setManual(sessionId: string, data: {
  weekly_cash_deposit?: number;
  purchases_last_4w?: number;
  digital_share?: string;
}) {
  return fetchJSON(`${API_URL}/api/session/${sessionId}/manual`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function setShop(sessionId: string, config: any) {
  return fetchJSON(`${API_URL}/api/session/${sessionId}/shop`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
}

export async function addCashCount(sessionId: string, date: string, amount: number) {
  return fetchJSON(`${API_URL}/api/session/${sessionId}/cashcount`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date, amount }),
  });
}

export async function getBlindspot(sessionId: string) {
  return fetchJSON(`${API_URL}/api/session/${sessionId}/blindspot`);
}

export async function postVerdict(sessionId: string, orders: Array<{ amount: number; date: string }>) {
  return fetchJSON(`${API_URL}/api/session/${sessionId}/verdict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orders }),
  });
}

export async function postPlan(sessionId: string, targetAmount: number) {
  return fetchJSON(`${API_URL}/api/session/${sessionId}/plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ target_amount: targetAmount }),
  });
}

export async function loadSample(sessionId: string, name: string, reveal = false) {
  return fetchJSON(`${API_URL}/api/session/${sessionId}/sample/${name}?reveal=${reveal}`, {
    method: "POST",
  });
}

export async function getBenchmark() {
  return fetchJSON(`${API_URL}/api/benchmark`);
}
