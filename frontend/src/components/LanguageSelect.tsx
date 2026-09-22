import { Globe } from "lucide-react";
import type { Language } from "../i18n";

interface LanguageSelectProps {
  language: Language;
  onChange: (language: Language) => void;
  variant?: "light" | "dark";
  className?: string;
  id?: string;
}

export default function LanguageSelect({
  language,
  onChange,
  variant = "light",
  className = "",
  id = "language-select",
}: LanguageSelectProps) {
  const isDark = variant === "dark";

  return (
    <div
      className={`relative inline-flex items-center rounded-md border transition-colors ${
        isDark
          ? "border-[rgba(250,249,246,0.22)] bg-[#190b05] text-[#FAF9F6] hover:border-[rgba(250,249,246,0.4)]"
          : "border-[#DEDBD4] bg-[#FFFEFA] text-[#1B0D08] hover:border-[#B65F3E]"
      } ${className}`}
      style={{ minHeight: "36px" }}
    >
      <div className="pointer-events-none pl-2.5 pr-1 flex items-center opacity-70">
        <Globe size={15} strokeWidth={1.75} aria-hidden="true" />
      </div>
      <select
        id={id}
        value={language}
        onChange={(e) => onChange(e.target.value as Language)}
        aria-label="Language selection"
        className="h-9 pl-1 pr-7 bg-transparent text-[13px] font-medium focus:outline-none cursor-pointer appearance-none"
        style={{
          color: isDark ? "#FAF9F6" : "#1B0D08",
        }}
      >
        <option value="en" className="text-[#1B0D08] bg-[#FFFEFA]">
          English
        </option>
        <option value="hi" className="text-[#1B0D08] bg-[#FFFEFA]">
          हिंदी (Hindi)
        </option>
        <option value="mr" className="text-[#1B0D08] bg-[#FFFEFA]">
          मराठी (Marathi)
        </option>
      </select>
      <div className="pointer-events-none absolute right-2.5 flex items-center opacity-60">
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M1 1l4 4 4-4" />
        </svg>
      </div>
    </div>
  );
}
