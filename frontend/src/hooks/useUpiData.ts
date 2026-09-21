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

export function useUpiData() {
  const [days, setDays] = useState<UpiDay[]>([]);
  const [status, setStatus] = useState<Status>("loading");
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

  return { days, status, retry } as const;
}
