"use client";

import { useState, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Card, Button } from "@/components/ui";
import { ShadowingPlayer } from "./ShadowingPlayer";
import { SpectrogramDiff } from "./SpectrogramDiff";
import { AudioPlayer } from "./AudioPlayer";
import { Link } from "@/i18n/navigation";
import { getLearnerId, addSession, getProfile } from "@/lib/learner-store";
import type { PhonemeDrill, Language } from "@/lib/mock-data";
import styles from "./PhonemeDrillSession.module.css";

const BCP47_MAP: Record<Language, string> = {
  english: "en-US",
  german: "de-DE",
};

const STEP_TYPE_ICONS: Record<string, string> = {
  isolated: "🔤",
  minimal_pair: "⇄",
  word: "📝",
  short_phrase: "💬",
};

const STEP_TYPE_LABELS: Record<string, string> = {
  isolated: "Isolated Sound",
  minimal_pair: "Minimal Pair",
  word: "Word",
  short_phrase: "Short Phrase",
};

interface PhonemeFeedback {
  score: number;
  summary: string;
  tip: string;
  phonemeRating: "good" | "acceptable" | "needs_work";
}

interface PhonemeDrillSessionProps {
  drill: PhonemeDrill;
}

export function PhonemeDrillSession({ drill }: PhonemeDrillSessionProps) {
  const t = useTranslations("PhonemeDrill");
  const locale = useLocale();
  const [currentStep, setCurrentStep] = useState(0);
  const [referenceBuffer, setReferenceBuffer] = useState<AudioBuffer | null>(null);
  const [userBuffer, setUserBuffer] = useState<AudioBuffer | null>(null);
  const [userStream, setUserStream] = useState<MediaStream | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<PhonemeFeedback | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const step = drill.steps[currentStep];
  const lang = BCP47_MAP[drill.language];

  const analyzeRecording = useCallback(
    async (blob: Blob) => {
      setAnalyzing(true);
      setError(null);
      try {
        const formData = new FormData();
        formData.append("audio", blob, "recording.webm");
        formData.append("prompt", step.prompt);
        formData.append("phonemes", JSON.stringify([drill.phoneme]));
        formData.append("locale", locale);
        formData.append("mode", "phoneme");

        const res = await fetch("/api/analyze-phoneme", {
          method: "POST",
          body: formData,
          headers: { "X-Learner-ID": getLearnerId() },
        });
        const data = await res.json();

        if (!res.ok) {
          setError(data.details ? `${data.error}: ${data.details}` : data.error || "Analysis failed");
          setAnalyzing(false);
          return;
        }

        const fb = data.feedback as PhonemeFeedback;
        setFeedback(fb);
        setCompletedSteps((prev) => new Set(prev).add(currentStep));

        // Save session
        try {
          if (getProfile()) {
            addSession({
              drillCategoryId: drill.id,
              drillItemId: step.id,
              overallScore: fb.score,
              phonemeScores: [
                {
                  phoneme: drill.phoneme,
                  rating: fb.phonemeRating,
                  word: step.prompt,
                },
              ],
            });
          }
        } catch {
          // ignore save errors
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(t("connectionError", { message }));
      } finally {
        setAnalyzing(false);
      }
    },
    [step, drill, locale, currentStep, t],
  );

  const handleRecorded = useCallback(
    (blob: Blob, buffer: AudioBuffer) => {
      setUserBuffer(buffer);
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      analyzeRecording(blob);
    },
    [analyzeRecording],
  );

  const handleReferenceReady = useCallback((buffer: AudioBuffer) => {
    setReferenceBuffer(buffer);
  }, []);

  const handleStreamStart = useCallback((stream: MediaStream) => {
    setUserStream(stream);
  }, []);

  const handleStreamEnd = useCallback(() => {
    setUserStream(null);
  }, []);

  const goToStep = (index: number) => {
    setCurrentStep(index);
    setFeedback(null);
    setError(null);
    setAudioUrl(null);
    setUserBuffer(null);
    setReferenceBuffer(null);
    setUserStream(null);
  };

  if (!step) return <p>{t("noDrills")}</p>;

  return (
    <div className={styles.session}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          <span className={styles.phonemeSymbol}>{drill.phoneme}</span>{" "}
          {drill.name}
        </h1>
        <span className={styles.counter}>
          {currentStep + 1} / {drill.steps.length}
        </span>
      </div>

      {/* Progress dots */}
      <div className={styles.progressDots}>
        {drill.steps.map((_, i) => (
          <button
            key={i}
            className={`${styles.dot} ${i === currentStep ? styles.dotActive : ""} ${completedSteps.has(i) ? styles.dotCompleted : ""}`}
            onClick={() => goToStep(i)}
            aria-label={`Step ${i + 1}`}
          />
        ))}
      </div>

      {/* Step content */}
      <Card variant="elevated">
        <div className={styles.stepCard}>
          <span className={styles.stepType}>
            <span className={styles.stepTypeIcon}>
              {STEP_TYPE_ICONS[step.type] ?? "📝"}
            </span>
            {t(`stepType_${step.type}`, { defaultValue: STEP_TYPE_LABELS[step.type] })}
          </span>

          <p className={styles.prompt}>{step.prompt}</p>
          <p className={styles.ipa}>/{step.ipa}/</p>

          <div className={styles.instruction}>
            {step.instruction}
          </div>
        </div>
      </Card>

      {/* Shadowing controls */}
      <ShadowingPlayer
        text={step.prompt}
        lang={lang}
        onRecorded={handleRecorded}
        onReferenceReady={handleReferenceReady}
        onStreamStart={handleStreamStart}
        onStreamEnd={handleStreamEnd}
        disabled={analyzing}
      />

      {/* Spectrogram comparison */}
      <div className={styles.spectrogramSection}>
        <SpectrogramDiff
          referenceBuffer={referenceBuffer}
          userBuffer={userBuffer}
          userStream={userStream}
          referenceLabel={t("reference")}
          userLabel={t("you")}
        />
      </div>

      {/* Audio playback */}
      {audioUrl && (
        <div className={styles.audioPlayback}>
          <AudioPlayer src={audioUrl} />
        </div>
      )}

      {/* Feedback area */}
      <Card variant="outlined">
        <div className={styles.feedbackArea}>
          {error ? (
            <p className={styles.errorText}>{error}</p>
          ) : analyzing ? (
            <div className={styles.analyzing}>
              <div className={styles.spinner} />
              <span>{t("analyzing")}</span>
            </div>
          ) : feedback ? (
            <div className={styles.feedbackResult}>
              <div className={styles.feedbackScore}>
                <span className={styles.scoreValue}>{feedback.score}</span>
                <span className={styles.scoreMax}>/ 10</span>
              </div>
              <p className={styles.feedbackSummary}>{feedback.summary}</p>
              {feedback.tip && (
                <div className={styles.feedbackTip}>
                  {feedback.tip}
                </div>
              )}
            </div>
          ) : (
            <p className={styles.feedbackText}>{t("feedbackPlaceholder")}</p>
          )}
        </div>
      </Card>

      {/* Navigation */}
      <div className={styles.nav}>
        <Button
          variant="secondary"
          onClick={() => goToStep(currentStep - 1)}
          disabled={currentStep === 0 || analyzing}
        >
          {t("previous")}
        </Button>
        <Button
          variant="secondary"
          onClick={() => goToStep(currentStep + 1)}
          disabled={currentStep === drill.steps.length - 1 || analyzing}
        >
          {t("next")}
        </Button>
      </div>

      <Link href="/practice" className={styles.backLink}>
        {t("backToPractice")}
      </Link>
    </div>
  );
}
