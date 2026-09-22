import { translate, type Language } from "../i18n";

interface CalibrationSliderProps {
  value: number;
  onChange: (value: number) => void;
  language: Language;
}

export default function CalibrationSlider({ value, onChange, language }: CalibrationSliderProps) {
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-5">
      {/* Label row */}
      <div className="flex items-baseline justify-between gap-2">
        <label
          htmlFor="cash-slider"
          className="text-[16px] text-gray-900"
        >
          {t("cashSliderLabel")}
        </label>
        <span
          className="text-[16px] font-semibold text-gray-900 whitespace-nowrap tabular-nums"
          aria-hidden="true"
        >
          {value} {t("cashSliderValueText")}
        </span>
      </div>

      {/* Slider wrapper — min 44px tall for touch targets */}
      <div className="flex items-center gap-2 mt-3" style={{ minHeight: "44px" }}>
        <input
          id="cash-slider"
          type="range"
          min={0}
          max={8}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full"
          style={{ accentColor: "#B65F3E" }}
          aria-label="Cash customers out of 10"
          aria-valuemin={0}
          aria-valuemax={8}
          aria-valuenow={value}
          aria-valuetext={`${value} out of 10 customers pay cash`}
        />
      </div>

      {/* End labels under the track */}
      <div className="flex justify-between mt-1">
        <span className="text-[12px] text-gray-500">0</span>
        <span className="text-[12px] text-gray-500">8</span>
      </div>

      {/* Helper text */}
      <p className="mt-2 text-[14px] text-gray-500">{t("cashHelper")}</p>
    </div>
  );
}
