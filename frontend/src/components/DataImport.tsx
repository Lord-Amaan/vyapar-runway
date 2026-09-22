import { FileUp } from "lucide-react";
import { useState } from "react";
import { translate, type Language } from "../i18n";

interface DataImportProps {
  onUseSample: () => void;
  onUpload: (file: File) => Promise<void>;
  uploading: boolean;
  error: string | null;
  language?: Language;
}

export default function DataImport({
  onUseSample,
  onUpload,
  uploading,
  error,
  language = "en",
}: DataImportProps) {
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  const [file, setFile] = useState<File | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (file) await onUpload(file);
  }

  return (
    <section className="data-import" aria-labelledby="data-import-title">
      <div className="data-import-intro">
        <p className="section-kicker">{t("dataImportKicker")}</p>
        <h2 id="data-import-title">{t("dataImportHeading")}</h2>
        <p>{t("dataImportIntro")}</p>
      </div>

      <form className="data-import-actions" onSubmit={handleSubmit}>
        <label className="data-file-picker" htmlFor="history-file">
          <FileUp size={20} strokeWidth={1.7} aria-hidden="true" />
          <span>{file ? file.name : t("chooseCsv")}</span>
          <input
            id="history-file"
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>
        <button type="submit" className="primary-action data-upload-button" disabled={!file || uploading}>
          {uploading ? t("uploadingForecast") : t("useThisFile")}
        </button>
        <button type="button" className="data-sample-button" onClick={onUseSample} disabled={uploading}>
          {t("useSampleData")}
        </button>
        {error && <p className="data-import-error" role="alert">{error}</p>}
      </form>
    </section>
  );
}