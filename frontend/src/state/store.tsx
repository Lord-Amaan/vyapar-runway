import React, { createContext, useContext, useReducer, type ReactNode } from "react";

// ── Types ────────────────────────────────────────────────────────

export interface Obligation {
  label: string;
  amount: number;
  date: string;
  repeat: "none" | "weekly" | "monthly";
}

export interface ShopConfig {
  category: string;
  bank0: number;
  drawer0: number;
  obligations: Obligation[];
  floor: number;
  festival_id: string;
  festival_date: string;
  days_on_shelf: number;
  delivery_days: number;
  credit_days: number;
  lift_choice: number | string | null;
  owner_cash_of_10: number | null;
  price_rise_pct: number | null;
}

export interface EvidenceSource {
  id: string;
  label: string;
  lo: number;
  hi: number;
  used: boolean;
  weak: boolean;
  skip_reason?: string;
}

export interface BlindspotData {
  share_seen: {
    p10: number;
    p50: number;
    p90: number;
    display: { lo: number; hi: number };
  };
  confidence: string;
  evidence: EvidenceSource[];
  skipped: Array<{ id: string; reason: string }>;
  disagreement: { a: number; b: number } | null;
  next_question: { kind: string; date?: string } | null;
}

export interface VerdictData {
  p_safe: number;
  n: number;
  label: string;
  scenarios: { none: number; likely: number; high: number };
  break_even: {
    c_star: number | null;
    daily_cash_p10: number;
    daily_cash_p90: number;
    status: string;
  };
  clock: { order_by: string; days_left: number; missed: boolean };
  chart: {
    dates: string[];
    liquid: { p10: number[]; p50: number[]; p90: number[] };
    upi: { p50: number[] };
    cash: { p10: number[]; p50: number[]; p90: number[] };
    floor: number;
    markers: Array<{ type: string; date: string }>;
  };
  truth: any | null;
}

export interface PlanData {
  target: number;
  affordable_total: number;
  fully_affordable: boolean;
  shortfall: number;
  tranches: Array<{ date: string; amount: number }>;
  levers: Array<{ id: string; n: number }>;
  whatsapp_text: string;
}

export interface AppState {
  sessionId: string | null;
  language: "en" | "hi" | "mr";
  step: number;
  upiSummary: any | null;
  bankSummary: any | null;
  shopConfig: ShopConfig;
  blindspot: BlindspotData | null;
  verdict: VerdictData | null;
  plan: PlanData | null;
  sampleName: string | null;
  sampleTruth: any | null;
  showTruth: boolean;
  loading: boolean;
  error: string | null;
  orderAmount: number;
  orderDate: string;
}

const defaultShopConfig: ShopConfig = {
  category: "kirana",
  bank0: 50000,
  drawer0: 20000,
  obligations: [],
  floor: 15000,
  festival_id: "diwali",
  festival_date: "2026-11-08",
  days_on_shelf: 7,
  delivery_days: 3,
  credit_days: 0,
  lift_choice: null,
  owner_cash_of_10: null,
  price_rise_pct: null,
};

const initialState: AppState = {
  sessionId: null,
  language: "en",
  step: 0,
  upiSummary: null,
  bankSummary: null,
  shopConfig: defaultShopConfig,
  blindspot: null,
  verdict: null,
  plan: null,
  sampleName: null,
  sampleTruth: null,
  showTruth: false,
  loading: false,
  error: null,
  orderAmount: 200000,
  orderDate: "2026-10-29",
};

// ── Actions ─────────────────────────────────────────────────────

type Action =
  | { type: "SET_SESSION"; sessionId: string }
  | { type: "SET_LANGUAGE"; language: "en" | "hi" | "mr" }
  | { type: "SET_STEP"; step: number }
  | { type: "SET_UPI_SUMMARY"; data: any }
  | { type: "SET_BANK_SUMMARY"; data: any }
  | { type: "SET_SHOP_CONFIG"; config: Partial<ShopConfig> }
  | { type: "SET_BLINDSPOT"; data: BlindspotData }
  | { type: "SET_VERDICT"; data: VerdictData }
  | { type: "SET_PLAN"; data: PlanData }
  | { type: "SET_SAMPLE"; name: string; truth: any }
  | { type: "TOGGLE_TRUTH" }
  | { type: "SET_LOADING"; loading: boolean }
  | { type: "SET_ERROR"; error: string | null }
  | { type: "SET_ORDER"; amount?: number; date?: string }
  | { type: "RESET" };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SET_SESSION":
      return { ...state, sessionId: action.sessionId };
    case "SET_LANGUAGE":
      return { ...state, language: action.language };
    case "SET_STEP":
      return { ...state, step: action.step };
    case "SET_UPI_SUMMARY":
      return { ...state, upiSummary: action.data };
    case "SET_BANK_SUMMARY":
      return { ...state, bankSummary: action.data };
    case "SET_SHOP_CONFIG":
      return { ...state, shopConfig: { ...state.shopConfig, ...action.config } };
    case "SET_BLINDSPOT":
      return { ...state, blindspot: action.data };
    case "SET_VERDICT":
      return { ...state, verdict: action.data };
    case "SET_PLAN":
      return { ...state, plan: action.data };
    case "SET_SAMPLE":
      return { ...state, sampleName: action.name, sampleTruth: action.truth };
    case "TOGGLE_TRUTH":
      return { ...state, showTruth: !state.showTruth };
    case "SET_LOADING":
      return { ...state, loading: action.loading };
    case "SET_ERROR":
      return { ...state, error: action.error };
    case "SET_ORDER":
      return {
        ...state,
        orderAmount: action.amount ?? state.orderAmount,
        orderDate: action.date ?? state.orderDate,
      };
    case "RESET":
      return { ...initialState };
    default:
      return state;
  }
}

// ── Context ─────────────────────────────────────────────────────

const StoreContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<Action>;
}>({ state: initialState, dispatch: () => {} });

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <StoreContext.Provider value={{ state, dispatch }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  return useContext(StoreContext);
}
