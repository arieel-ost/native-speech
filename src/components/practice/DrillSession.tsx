"use client";

import { useState, useRef, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Button, Card } from "@/components/ui";
import { AudioPlayer } from "./AudioPlayer";
import { FeedbackDisplay } from "./FeedbackDisplay";
import { SimplifiedFeedbackDisplay } from "./SimplifiedFeedbackDisplay";
import { JsonFeedbackDisplay } from "./JsonFeedbackDisplay";
import type { DrillSession as DrillSessionType } from "@/lib/mock-data";
import type { AnalysisMode } from "@/app/api/analyze/route";
import styles from "./DrillSession.module.css";

interface DrillSessionProps {
  drills: DrillSessionType[];
  categoryName: string;
}

type RecordingState = "idle" | "recording" | "processing" | "done";

interface CombinedFeedback {
  simple: Record<string, unknown>;
  detailed: Record<string, unknown>;
  textMatch: string;
}

export function DrillSession({ drills, categoryName }: DrillSessionProps) {
  const t = useTranslations("DrillSession");
  const locale = useLocale();
  const tPractice = useTranslations("Practice");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<CombinedFeedback | null>(null);
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>("simplified");
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const drill = drills[currentIndex];

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setFeedback(null);
      setAudioUrl(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        await analyze(blob);
      };

      mediaRecorder.start();
      setRecordingState("recording");
    } catch {
      setError(t("micDenied"));
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const cancelAnalysis = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setRecordingState("done");
  }, []);

  const analyze = async (blob: Blob) => {
    if (!drill) return;
    setRecordingState("processing");
    setError(null);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      console.log("[Recording] Blob size:", blob.size, "bytes");
      console.log("[Recording] Blob type:", blob.type);
      console.log("[Recording] Sending to /api/analyze...");

      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");
      formData.append("prompt", drill.prompt);
      formData.append("phonemes", JSON.stringify(drill.targetPhonemes));
      formData.append("locale", locale);

      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });
      const data = await res.json();

      console.log("[Recording] Response status:", res.status);
      console.log("[Recording] Feedback:", data.error ?? JSON.stringify(data.feedback)?.slice(0, 300));

      if (!res.ok) {
        const errMsg = data.details
          ? `${data.error}: ${data.details}`
          : data.error || "Analysis failed";
        console.error("[Recording] Server error:", errMsg);
        setError(errMsg);
        setRecordingState("done");
        return;
      }

      console.log("[Recording] Analysis result:", JSON.stringify(data.feedback, null, 2));
      setFeedback(data.feedback as CombinedFeedback);
      setRecordingState("done");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        console.log("[Recording] Analysis cancelled");
        return;
      }
      const message = err instanceof Error ? err.message : String(err);
      console.error("[Recording] Fetch error:", message);
      setError(t("connectionError", { message }));
      setRecordingState("done");
    } finally {
      abortRef.current = null;
    }
  };

  const handleRetry = () => {
    setAudioUrl(null);
    setError(null);
    startRecording();
  };

  const handleRecordClick = () => {
    if (recordingState === "processing") {
      cancelAnalysis();
    } else if (recordingState === "recording") {
      stopRecording();
    } else if (recordingState === "done") {
      handleRetry();
    } else {
      startRecording();
    }
  };

  const handleNav = (direction: "prev" | "next") => {
    const newIndex = direction === "prev"
      ? Math.max(0, currentIndex - 1)
      : Math.min(drills.length - 1, currentIndex + 1);
    setCurrentIndex(newIndex);
    setRecordingState("idle");
    setAudioUrl(null);
    setFeedback(null);
    setError(null);
  };

  if (!drill) return <p>{tPractice("noDrills")}</p>;

  return (
    <div className={styles.session}>
      <div className={styles.header}>
        <h1 className={styles.title}>{categoryName}</h1>
        <span className={styles.counter}>
          {currentIndex + 1} / {drills.length}
        </span>
      </div>

      <Card variant="elevated">
        <div className={styles.promptArea}>
          <p className={styles.instruction}>{t("readAloud")}</p>
          <p className={styles.prompt}>{drill.prompt}</p>
          <div className={styles.phonemes}>
            {drill.targetPhonemes.map((p) => (
              <span key={p} className={styles.phoneme}>{p}</span>
            ))}
          </div>
        </div>
      </Card>

      <button
        className={`${styles.recordBtn} ${recordingState === "recording" ? styles.recording : ""} ${recordingState === "done" ? styles.retry : ""} ${recordingState === "processing" ? styles.cancel : ""}`}
        onClick={handleRecordClick}
        aria-label={
          recordingState === "processing" ? t("cancel")
          : recordingState === "recording" ? t("stop")
          : recordingState === "done" ? t("retry")
          : t("record")
        }
      >
        <span className={styles.recordIcon}>
          {recordingState === "processing" ? "\u2715"
          : recordingState === "recording" ? "\u25A0"
          : recordingState === "done" ? "\u21BB"
          : "\u25CF"}
        </span>
        <span>
          {recordingState === "processing"
            ? t("cancel")
            : recordingState === "recording"
              ? t("stop")
              : recordingState === "done"
                ? t("retry")
                : t("record")}
        </span>
      </button>

      {audioUrl && <AudioPlayer src={audioUrl} />}

      <div className={styles.modeToggle}>
        {(["simplified", "advanced", "json"] as const).map((mode) => (
          <button
            key={mode}
            className={`${styles.modeBtn} ${analysisMode === mode ? styles.modeBtnActive : ""}`}
            onClick={() => setAnalysisMode(mode)}
          >
            {mode === "simplified" ? t("simple") : mode === "advanced" ? t("advanced") : t("json")}
          </button>
        ))}
      </div>

      <Card variant="outlined">
        <div className={styles.feedback}>
          {error ? (
            <p className={styles.errorText}>{error}</p>
          ) : recordingState === "processing" ? (
            <p className={styles.feedbackText}>{t("analyzing")}</p>
          ) : feedback ? (
            analysisMode === "json" ? (
              <JsonFeedbackDisplay data={feedback as unknown as Record<string, unknown>} />
            ) : analysisMode === "simplified" ? (
              <SimplifiedFeedbackDisplay data={{ ...feedback.simple, textMatch: feedback.textMatch } as never} />
            ) : (
              <FeedbackDisplay data={{ ...feedback.detailed, textMatch: feedback.textMatch } as never} />
            )
          ) : (
            <p className={styles.feedbackText}>
              {recordingState === "recording"
                ? t("listening")
                : t("feedbackPlaceholder")}
            </p>
          )}
        </div>
      </Card>

      <div className={styles.nav}>
        <Button
          variant="secondary"
          onClick={() => handleNav("prev")}
          disabled={currentIndex === 0 || recordingState === "processing" || recordingState === "recording"}
        >
          {t("previous")}
        </Button>
        <Button
          variant="secondary"
          onClick={() => handleNav("next")}
          disabled={currentIndex === drills.length - 1 || recordingState === "processing" || recordingState === "recording"}
        >
          {t("next")}
        </Button>
      </div>
    </div>
  );
}
