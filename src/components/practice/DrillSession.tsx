"use client";

import { useState, useRef, useCallback } from "react";
import { Button, Card } from "@/components/ui";
import { AudioPlayer } from "./AudioPlayer";
import { FeedbackDisplay } from "./FeedbackDisplay";
import type { DrillSession as DrillSessionType } from "@/lib/mock-data";
import styles from "./DrillSession.module.css";

interface DrillSessionProps {
  drills: DrillSessionType[];
  categoryName: string;
}

type RecordingState = "idle" | "recording" | "processing" | "done";

export function DrillSession({ drills, categoryName }: DrillSessionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, unknown> | null>(null);
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
      setError("Microphone access denied. Please allow microphone access and try again.");
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
      setFeedback(data.feedback);
      setRecordingState("done");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        console.log("[Recording] Analysis cancelled");
        return;
      }
      const message = err instanceof Error ? err.message : String(err);
      console.error("[Recording] Fetch error:", message);
      setError(`Failed to connect to analysis service: ${message}`);
      setRecordingState("done");
    } finally {
      abortRef.current = null;
    }
  };

  const handleRetry = () => {
    setAudioUrl(null);
    setError(null);
    // keep previous feedback visible during new recording
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

  if (!drill) return <p>No drills available for this category.</p>;

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
          <p className={styles.instruction}>Read this aloud:</p>
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
          recordingState === "processing" ? "Cancel analysis"
          : recordingState === "recording" ? "Stop recording"
          : recordingState === "done" ? "Try again"
          : "Start recording"
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
            ? "Cancel"
            : recordingState === "recording"
              ? "Stop"
              : recordingState === "done"
                ? "Retry"
                : "Record"}
        </span>
      </button>

      {audioUrl && <AudioPlayer src={audioUrl} />}

      <Card variant="outlined">
        <div className={styles.feedback}>
          {error ? (
            <p className={styles.errorText}>{error}</p>
          ) : recordingState === "processing" ? (
            <p className={styles.feedbackText}>Analyzing your pronunciation...</p>
          ) : feedback ? (
            <FeedbackDisplay data={feedback as never} />
          ) : (
            <p className={styles.feedbackText}>
              {recordingState === "recording"
                ? "Listening..."
                : "Your pronunciation feedback will appear here after recording."}
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
          Previous
        </Button>
        <Button
          variant="secondary"
          onClick={() => handleNav("next")}
          disabled={currentIndex === drills.length - 1 || recordingState === "processing" || recordingState === "recording"}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
