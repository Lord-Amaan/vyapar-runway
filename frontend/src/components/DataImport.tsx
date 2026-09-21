import { FileUp } from "lucide-react";
import { useState } from "react";

interface DataImportProps {
  onUseSample: () => void;
  onUpload: (file: File) => Promise<void>;
  uploading: boolean;
  error: string | null;
}

export default function DataImport({ onUseSample, onUpload, uploading, error }: DataImportProps) {
  const [file, setFile] = useState<File | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (file) await onUpload(file);
  }

  return (
    <section className="data-import" aria-labelledby="data-import-title">
      <div className="data-import-intro">
        <p className="section-kicker">Choose your numbers</p>
        <h2 id="data-import-title">Use your payment history</h2>
        <p>
          Upload a UPI or POS CSV to get a forecast from your shop&apos;s own payments. We only use digital payments here, so cash sales stay clearly marked as an estimate.
        </p>
      </div>

      <form className="data-import-actions" onSubmit={handleSubmit}>
        <label className="data-file-picker" htmlFor="history-file">
          <FileUp size={20} strokeWidth={1.7} aria-hidden="true" />
          <span>{file ? file.name : "Choose a CSV file"}</span>
          <input
            id="history-file"
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>
        <button type="submit" className="primary-action data-upload-button" disabled={!file || uploading}>
          {uploading ? "Making your forecast…" : "Use this file"}
        </button>
        <button type="button" className="data-sample-button" onClick={onUseSample} disabled={uploading}>
          Use sample data for now
        </button>
        {error && <p className="data-import-error" role="alert">{error}</p>}
      </form>
    </section>
  );
}