import { useCallback, useEffect, useRef, useState } from "react";
import type { UpiDay } from "../types";
import { API_URL } from "../lib/api";

type Status = "loading" | "error" | "success";

function isValidResponse(data: unknown): data is UpiDay[] {
  if (!Array.isArray(data) || data.length !== 30) return false;
  return data.every(
    (item) =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as Record<string, unknown>).date === "string" &&
      typeof (item as Record<string, unknown>).amount === "number" &&
      Number.isFinite((item as Record<string, unknown>).amount) &&
      ((item as Record<string, unknown>).amount as number) >= 0,
  );
}

function isForecastEnvelope(
  data: unknown,
): data is { predictions: UpiDay[]; model?: { warning?: unknown } } {
  if (typeof data !== "object" || data === null) return false;
  const record = data as Record<string, unknown>;
  return Array.isArray(record.predictions) && isValidResponse(record.predictions);
}

export function useUpiData() {
  const [days, setDays] = useState<UpiDay[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [sourceSelected, setSourceSelected] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [modelWarning, setModelWarning] = useState<string | null>(null);
  const fetchIdRef = useRef(0);

  const fetchData = useCallback(() => {
    const id = ++fetchIdRef.current;
    setStatus("loading");

    const controller = new AbortController();

    fetch(`${API_URL}/api/predict`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: unknown) => {
        if (id !== fetchIdRef.current) return;
        if (!isValidResponse(data)) {
          setStatus("error");
          return;
        }
        setDays(data);
        setStatus("success");
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (id !== fetchIdRef.current) return;
        setStatus("error");
      });

    return controller;
  }, []);

  useEffect(() => {
    const controller = fetchData();
    return () => controller.abort();
  }, [fetchData]);

  const retry = useCallback(() => {
    fetchData();
  }, [fetchData]);

  const chooseSample = useCallback(() => {
    setSourceSelected(true);
    setUploadError(null);
    setModelWarning(null);
  }, []);

  const uploadCsv = useCallback(async (file: File) => {
    setUploading(true);
    setUploadError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch(`${API_URL}/api/forecast`, {
        method: "POST",
        body,
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        const message =
          typeof data === "object" && data !== null && "error" in data && typeof data.error === "string"
            ? data.error
            : "Could not use this file";
        throw new Error(message);
      }
      if (!isForecastEnvelope(data)) {
        throw new Error("The forecast returned by the backend was not valid");
      }
      setDays(data.predictions);
      setModelWarning(
        typeof data.model === "object" && data.model !== null && "warning" in data.model && typeof data.model.warning === "string"
          ? data.model.warning
          : null,
      );
      setSourceSelected(true);
    } catch (error: unknown) {
      setUploadError(error instanceof Error ? error.message : "Could not use this file");
    } finally {
      setUploading(false);
    }
  }, []);

  return {
    days,
    status,
    retry,
    sourceSelected,
    chooseSample,
    uploadCsv,
    uploading,
    uploadError,
    modelWarning,
  } as const;
}
