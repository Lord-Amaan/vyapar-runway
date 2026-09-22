import en from "./en.json";
import hi from "./hi.json";
import mr from "./mr.json";

const STRINGS: Record<string, Record<string, string>> = { en, hi, mr };

const STORAGE_KEY = "vr_lang";

export type Lang = "en" | "hi" | "mr";

export function getLang(): Lang {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && stored in STRINGS) return stored as Lang;
  return "en";
}

export function setLang(lang: Lang) {
  localStorage.setItem(STORAGE_KEY, lang);
}

/**
 * Translate a key with optional {param} replacements.
 * Usage: t("blind.headline", { lo: 35, hi: 50 })
 */
export function t(key: string, params?: Record<string, string | number>): string {
  const lang = getLang();
  const strings = STRINGS[lang] || STRINGS.en;
  let text = strings[key] ?? STRINGS.en[key] ?? key;

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }

  return text;
}

/** Format a number in Indian style with ₹ prefix */
export function formatINR(n: number): string {
  return "₹" + new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

/** Format a date for display */
export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
