"use client";

import { useState, useRef, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Button, Card } from "@/components/ui";
import { AudioPlayer } from "./AudioPlayer";
import { WaveformVisualizer } from "./WaveformVisualizer";
import { FeedbackDisplay } from "./FeedbackDisplay";
import { SimplifiedFeedbackDisplay } from "./SimplifiedFeedbackDisplay";
import { JsonFeedbackDisplay } from "./JsonFeedbackDisplay";
import { WordHighlight } from "./WordHighlight";
import type { WordScore } from "./WordHighlight";
import { useSpeechTracking } from "@/hooks/useSpeechTracking";
import { Link } from "@/i18n/navigation";
import { addSession, getProfile, getLearnerId } from "@/lib/learner-store";
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
  wordScores?: WordScore[];
}

const BCP47_MAP: Record<string, string> = {
  en: "en-US",
  ru: "ru-RU",
  es: "es-ES",
  fr: "fr-FR",
};

export function DrillSession({ drills, categoryName }: DrillSessionProps) {
  const t = useTranslations("DrillSession");
  const locale = useLocale();
  const tPractice = useTranslations("Practice");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [feedback, setFeedback] = useState<CombinedFeedback | null>(null);
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>("simplified");
  const [error, setError] = useState<string | null>(null);
  const [trackingSessionKey, setTrackingSessionKey] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const drill = drills[currentIndex];

  const { activeWordIndex } = useSpeechTracking({
    referenceText: drill?.prompt ?? "",
    enabled: recordingState === "recording",
    lang: BCP47_MAP[locale] ?? "en-US",
    sessionKey: trackingSessionKey,
  });

  const analyze = useCallback(async (blob: Blob) => {
    if (!drill) return;
    setRecordingState("processing");
    setError(null);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      console.log("[Recording] Blob size:", blob.size, "bytes");
      console.log("[Recording] Blob type:", blob.type);
      console.log("[Recording] Sending to /api/analyze...");

      // MOCK ANALYSIS FOR TESTING
      console.log("⚠️ SKIPPING API CALL TO SAVE CREDITS ⚠️");
      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (!abortRef.current) return;
      setFeedback({
        simple: { 
          score: 9, 
          summary: "Great job on parsing and holding the vowels.",
          strengths: ["Clear pronunciation", "Good pace"],
          improvements: []
        },
        detailed: { 
          overallScore: 9,
          accent: {
            detectedLanguage: "German",
            confidence: "high",
            telltalePatterns: ["Replacing TH with D"]
          },
          phonemeAnalysis: [
            { phoneme: "a", rating: "good", word: "test", produced: "ah", expected: "ah" }
          ],
          prosody: {
            stressAccuracy: "good",
            rhythmNotes: "Good rhythm.",
            intonationNotes: "Good intonation."
          },
          tips: [
            { targetSound: "TH", exercise: "Put tongue between teeth", practiceWord: "The" }
          ]
        },
        textMatch: drill.prompt,
        wordScores: [
          { word: "The", index: 0, score: 8, rating: "good", issue: null },
          { word: "weather", index: 1, score: 6, rating: "acceptable", issue: "w slightly soft" },
          { word: "is", index: 2, score: 9, rating: "good", issue: null },
          { word: "rather", index: 3, score: 5, rating: "acceptable", issue: "r slightly rolled" },
          { word: "nice", index: 4, score: 9, rating: "good", issue: null },
          { word: "today,", index: 5, score: 8, rating: "good", issue: null },
          { word: "though", index: 6, score: 3, rating: "needs_work", issue: "th pronounced as d" },
          { word: "it", index: 7, score: 9, rating: "good", issue: null },
          { word: "might", index: 8, score: 8, rating: "good", issue: null },
          { word: "thunder", index: 9, score: 4, rating: "acceptable", issue: "th slightly off" },
          { word: "this", index: 10, score: 3, rating: "needs_work", issue: "th pronounced as z" },
          { word: "Thursday.", index: 11, score: 4, rating: "acceptable", issue: "th needs work" },
        ],
      } as CombinedFeedback);
      setRecordingState("done");
      return;

      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");
      formData.append("prompt", drill.prompt);
      formData.append("phonemes", JSON.stringify(drill.targetPhonemes));
      formData.append("locale", locale);

      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
        signal: controller.signal,
        headers: { "X-Learner-ID": getLearnerId() },
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

      try {
        if (getProfile()) {
          const detailed = data.feedback.detailed as {
            phonemeAnalysis?: { phoneme: string; rating: string; word: string }[];
            overallScore?: number;
          };
          addSession({
            drillCategoryId: drill.categoryId,
            drillItemId: drill.id,
            overallScore: (data.feedback.simple as { score?: number })?.score ?? detailed?.overallScore ?? 5,
            phonemeScores: (detailed?.phonemeAnalysis ?? []).map((pa) => ({
              phoneme: pa.phoneme,
              rating: pa.rating as "good" | "acceptable" | "needs_work",
              word: pa.word,
            })),
          });
        }
      } catch (err) {
        console.error("[Recording] Failed to save session:", err);
      }
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
  }, [drill, locale, t]);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setFeedback(null);
      setAudioUrl(null);
      const newStream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          noiseSuppression: true, 
          autoGainControl: true, 
          echoCancellation: true
        } 
      });
      setStream(newStream);
      const mediaRecorder = new MediaRecorder(newStream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        newStream.getTracks().forEach((t) => t.stop());
        setStream(null);
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        await analyze(blob);
      };

      mediaRecorder.start();
      setTrackingSessionKey((currentKey) => currentKey + 1);
      setRecordingState("recording");
    } catch {
      setError(t("micDenied"));
    }
  }, [analyze, t]);

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

  const handleRetry = () => {
    setAudioUrl(null);
    setStream(null);
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
    setStream(null);
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
          <WordHighlight
            prompt={drill.prompt}
            wordScores={feedback?.wordScores}
            activeWordIndex={activeWordIndex}
            isRecording={recordingState === "recording"}
          />
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

      <div style={{ marginTop: '1rem', marginBottom: '1rem', minHeight: '120px' }}>
        {recordingState !== "idle" && recordingState !== "done" && (
           <WaveformVisualizer stream={stream} isRecording={recordingState === "recording"} />
        )}
        {recordingState === "done" && audioUrl && (
           <AudioPlayer src={audioUrl} />
        )}
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

      <Link href="/dashboard" className={styles.backLink}>
        {t("backToDashboard")}
      </Link>
    </div>
  );
}
