import { useEffect, useRef, useState } from "react";
import { Lightbulb, Mic, Square } from "lucide-react";
import { fetchAdvice, type AdvisorContext } from "../lib/api";
import { translate, type Language } from "../i18n";

interface AdvisorPanelProps {
  shortfall: number;
  dueDate: string;
  context: AdvisorContext;
  language: Language;
}

type AdvisorState = "idle" | "loading" | "success" | "error";

interface SpeechRecognitionEventLike {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

export default function AdvisorPanel({ shortfall, dueDate, context, language }: AdvisorPanelProps) {
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  const {
    bankToday,
    drawerCash,
    expectedUpi,
    expectedCash,
    moneyGoingOut,
    promisedPayments,
    orderAmount,
  } = context;
  const contextKey = `${bankToday}:${drawerCash}:${expectedUpi}:${expectedCash}:${moneyGoingOut}:${promisedPayments}:${orderAmount}:${language}`;
  const [state, setState] = useState<AdvisorState>("idle");
  const [ideas, setIdeas] = useState<[string, string, string] | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceError, setVoiceError] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  // When shortfall or dueDate changes: abort any in-flight request and reset to idle
  useEffect(() => {
    abortRef.current?.abort();
    recognitionRef.current?.stop();
    abortRef.current = null;
    recognitionRef.current = null;
    setIsListening(false);
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
      recognitionRef.current?.stop();
      window.speechSynthesis?.cancel();
    };
  }, []);

  function handleAskAI(question = "", readAloud = false) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setState("loading");
    setIdeas(null);

    fetchAdvice(shortfall, dueDate, context, language, controller.signal, question)
      .then((result) => {
        if (controller.signal.aborted) return;
        setIdeas(result);
        setState("success");
        if (readAloud && "speechSynthesis" in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(result.join(". "));
          utterance.lang = language === "hi" ? "hi-IN" : language === "mr" ? "mr-IN" : "en-IN";
          utterance.onstart = () => setIsSpeaking(true);
          utterance.onend = () => setIsSpeaking(false);
          utterance.onerror = () => setIsSpeaking(false);
          window.speechSynthesis.speak(utterance);
        }
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setState("error");
      });
  }

  function handleRetry() {
    handleAskAI();
  }

  function handleVoiceAsk() {
    const browserWindow = window as Window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Recognition = browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setVoiceError(true);
      return;
    }
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    const recognition = new Recognition();
    recognition.lang = language === "hi" ? "hi-IN" : language === "mr" ? "mr-IN" : "en-IN";
    recognition.continuous = false;
    recognition.interimResults = false;
    setVoiceError(false);
    setVoiceTranscript("");
    setIsListening(true);
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim() ?? "";
      setVoiceTranscript(transcript);
      if (transcript) handleAskAI(transcript, true);
    };
    recognition.onerror = () => {
      setIsListening(false);
      setVoiceError(true);
    };
    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };
    recognitionRef.current = recognition;
    recognition.start();
  }

  const voiceButton = (
    <button
      id="ask-ai-voice-btn"
      type="button"
      onClick={handleVoiceAsk}
        disabled={state === "loading"}
      className="secondary-action h-11 px-4 rounded-md border border-gray-300 bg-white text-gray-900 font-medium focus:outline-none focus:ring-2 flex items-center gap-2"
    >
      {isListening ? (
        <Square size={16} strokeWidth={1.75} aria-hidden="true" />
      ) : (
        <Mic size={16} strokeWidth={1.75} aria-hidden="true" />
      )}
      {isListening ? t("voiceStop") : t("voiceAsk")}
    </button>
  );

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-5">
      {/* Heading with bottom border */}
      <h3 className="text-[18px] font-semibold text-gray-900 pb-3 border-b border-gray-200">
        {t("advisorHeading")}
      </h3>

      {/* aria-live region for all dynamic content */}
      <div aria-live="polite" className="mt-4">
        <div className="flex flex-wrap gap-2">
          <button
            id="ask-ai-btn"
            type="button"
            onClick={() => handleAskAI()}
            disabled={state === "loading" || isListening}
            className="secondary-action h-11 px-4 rounded-md border border-gray-300 bg-white text-gray-900 font-medium focus:outline-none focus:ring-2 flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Lightbulb size={16} strokeWidth={1.75} aria-hidden="true" />
            {t("askAi")}
          </button>
          {voiceButton}
        </div>

        {isListening && (
          <p className="mt-3 text-[14px] text-gray-600">{t("voiceListening")}</p>
        )}
        {voiceTranscript && !isListening && (
          <p className="mt-3 text-[14px] text-gray-600">“{voiceTranscript}”</p>
        )}
        {voiceError && (
          <p className="mt-2 text-[14px] text-red-800">{t("voiceUnsupported")}</p>
        )}

        {/* Loading: plain text, no spinner */}
        {state === "loading" && (
          <p className="text-[16px] text-gray-600">{t("advisorLoading")}</p>
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
            <p className="mt-3 text-[14px] text-gray-500">{t("advisorNote")}</p>
            {isSpeaking && (
              <p className="mt-3 text-[14px] text-gray-500">{t("voiceAnswering")}</p>
            )}
          </>
        )}

        {/* Error: red-tinted message + 44px Retry */}
        {state === "error" && (
          <div>
            <p className="text-[16px] text-red-800">{t("advisorError")}</p>
            <button
              id="advisor-retry-btn"
              onClick={handleRetry}
              className="primary-action mt-3 h-11 px-4 rounded-md text-white font-medium focus:outline-none focus:ring-2"
            >
              {t("retryButton")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
