"use client";

import { useEffect, useRef, useState } from "react";
import { findActiveWordIndex } from "@/lib/speech-tracking";

interface UseSpeechTrackingOptions {
  referenceText: string;
  enabled: boolean;
  lang?: string;
  sessionKey: number;
}

interface TrackingState {
  sessionKey: number;
  interimTranscript: string;
  activeWordIndex: number | undefined;
}

interface UseSpeechTrackingResult {
  activeWordIndex: number | undefined;
  interimTranscript: string;
  isSupported: boolean;
}

function getSpeechRecognitionConstructor():
  | SpeechRecognitionConstructor
  | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  return window.SpeechRecognition ?? window.webkitSpeechRecognition;
}

export function useSpeechTracking({
  referenceText,
  enabled,
  lang = "en-US",
  sessionKey,
}: UseSpeechTrackingOptions): UseSpeechTrackingResult {
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [trackingState, setTrackingState] = useState<TrackingState>({
    sessionKey,
    interimTranscript: "",
    activeWordIndex: undefined,
  });

  const isSupported = getSpeechRecognitionConstructor() !== undefined;
  const hasCurrentSessionState = trackingState.sessionKey === sessionKey;

  useEffect(() => {
    if (!enabled) {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }

      return;
    }

    const SpeechRecognitionCtor = getSpeechRecognitionConstructor();
    if (!SpeechRecognitionCtor) {
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let fullTranscript = "";

      for (let index = 0; index < event.results.length; index += 1) {
        fullTranscript += `${event.results[index][0].transcript} `;
      }

      const trimmedTranscript = fullTranscript.trim();

      setTrackingState((currentState) => {
        const previousActiveWordIndex =
          currentState.sessionKey === sessionKey
            ? currentState.activeWordIndex
            : undefined;

        return {
          sessionKey,
          interimTranscript: trimmedTranscript,
          activeWordIndex: findActiveWordIndex({
            referenceText,
            transcript: trimmedTranscript,
            previousActiveWordIndex,
          }),
        };
      });
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error !== "aborted" && event.error !== "no-speech") {
        console.error("[SpeechTracking] SpeechRecognition error:", event.error);
      }
    };

    recognition.onend = () => {
      if (!enabled || recognitionRef.current !== recognition) {
        return;
      }

      try {
        recognition.start();
      } catch {
        // Chrome throws if start is called while already active.
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      // Ignore duplicate start attempts during quick retries.
    }

    return () => {
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
      }

      try {
        recognition.abort();
      } catch {
        // Ignore shutdown races during unmount or navigation.
      }
    };
  }, [enabled, lang, referenceText, sessionKey]);

  return {
    isSupported,
    activeWordIndex:
      enabled && hasCurrentSessionState
        ? trackingState.activeWordIndex
        : undefined,
    interimTranscript:
      enabled && hasCurrentSessionState ? trackingState.interimTranscript : "",
  };
}
