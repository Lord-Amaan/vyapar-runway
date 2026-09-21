import { useEffect, useRef, useState } from "react";
import { Lightbulb } from "lucide-react";
import { fetchAdvice, type AdvisorContext } from "../lib/api";
import {
  ASK_AI_LABEL,
  ADVISOR_HEADING,
  ADVISOR_LOADING,
  ADVISOR_ERROR,
  ADVISOR_NOTE,
} from "../copy";

interface AdvisorPanelProps {
  shortfall: number;
  dueDate: string;
  context: AdvisorContext;
}

type AdvisorState = "idle" | "loading" | "success" | "error";

export default function AdvisorPanel({ shortfall, dueDate, context }: AdvisorPanelProps) {
  const {
    bankToday,
    drawerCash,
    expectedUpi,
    expectedCash,
    moneyGoingOut,
    promisedPayments,
    orderAmount,
  } = context;
  const contextKey = `${bankToday}:${drawerCash}:${expectedUpi}:${expectedCash}:${moneyGoingOut}:${promisedPayments}:${orderAmount}`;
  const [state, setState] = useState<AdvisorState>("idle");
  const [ideas, setIdeas] = useState<[string, string, string] | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // When shortfall or dueDate changes: abort any in-flight request and reset to idle
  useEffect(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState("idle");
    setIdeas(null);
  }, [
    shortfall,
    dueDate,
    contextKey,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  function handleAskAI() {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setState("loading");
    setIdeas(null);

    fetchAdvice(shortfall, dueDate, context, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setIdeas(result);
        setState("success");
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setState("error");
      });
  }

  function handleRetry() {
    handleAskAI();
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-5">
      {/* Heading with bottom border */}
      <h3 className="text-[18px] font-semibold text-gray-900 pb-3 border-b border-gray-200">
        {ADVISOR_HEADING}
      </h3>

      {/* aria-live region for all dynamic content */}
      <div aria-live="polite" className="mt-4">
        {/* Idle: show the Ask AI button */}
        {state === "idle" && (
          <button
            id="ask-ai-btn"
            onClick={handleAskAI}
            className="secondary-action h-11 px-4 rounded-md border border-gray-300 bg-white text-gray-900 font-medium focus:outline-none focus:ring-2 flex items-center gap-2"
          >
            <Lightbulb size={16} strokeWidth={1.75} aria-hidden="true" />
            {ASK_AI_LABEL}
          </button>
        )}

        {/* Loading: plain text, no spinner */}
        {state === "loading" && (
          <p className="text-[16px] text-gray-600">{ADVISOR_LOADING}</p>
        )}

        {/* Success: numbered list of 3 ideas + note */}
        {state === "success" && ideas !== null && (
          <>
            <ol className="flex flex-col gap-3 list-decimal list-inside">
              {ideas.map((idea, i) => (
                <li
                  key={i}
                  className="text-[16px] text-gray-900"
                  style={{ lineHeight: "1.5" }}
                >
                  {idea}
                </li>
              ))}
            </ol>
            <p className="mt-3 text-[14px] text-gray-500">{ADVISOR_NOTE}</p>
          </>
        )}

        {/* Error: red-tinted message + 44px Retry */}
        {state === "error" && (
          <div>
            <p className="text-[16px] text-red-800">{ADVISOR_ERROR}</p>
            <button
              id="advisor-retry-btn"
              onClick={handleRetry}
              className="primary-action mt-3 h-11 px-4 rounded-md text-white font-medium focus:outline-none focus:ring-2"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
