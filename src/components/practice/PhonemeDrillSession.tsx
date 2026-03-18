"use client";

import { useState, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Card, Button } from "@/components/ui";
import { ShadowingPlayer } from "./ShadowingPlayer";
import { SpectrogramDiff } from "./SpectrogramDiff";
import { AudioPlayer } from "./AudioPlayer";
import { Link } from "@/i18n/navigation";
import { getLearnerId, addSession, getProfile } from "@/lib/learner-store";
import { ArticulationDiagram } from "./ArticulationDiagram";
import type { PhonemeDrill, Language } from "@/lib/mock-data";
import phonemeMap from "@/../public/audio/phonemes/phoneme-map.json";
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
  produced?: string;
  expected?: string;
}

interface PhonemeAssetEntry {
  audio: string;
  spectrogram: string;
  audio3x: string;
  spectrogram3x: string;
  audioShadow?: string;
  spectrogramShadow?: string;
  audio3xShadow?: string;
  spectrogram3xShadow?: string;
  durationShadow?: number;
  duration3xShadow?: number;
}

interface PhonemeAssets {
  audio: string;
  spectrogram: string;
  /** Pre-calculated duration in seconds — always known, no async decode needed */
  duration: number | null;
}

/**
 * Normalize phoneme IDs that don't have exact matches in phoneme-map.json.
 * Handles length marks, slash-separated alternatives, and common aliases.
 */
const PHONEME_ALIASES: Record<string, string> = {
  "ɹ": "r",       // English R variant
  "iː": "i",      // long E → short E (same base sound)
  "ɪ/iː": "ɪ",   // short I / long E pair → use short I assets
  "yː": "u",      // German ü → closest available
  "øː": "ə",      // German ö → closest available
  "ç/x": "x",     // German CH pair → velar fricative assets
};

/**
 * Look up pre-recorded audio & spectrogram for a given IPA symbol.
 * Always prefers the shadow variant (1s lead + audio + 0.5s trail)
 * so spectrograms align across all modes for overlay comparison.
 */
function getPhonemeAssets(
  ipa: string,
  stepType: string,
): PhonemeAssets | null {
  const map = phonemeMap as Record<string, PhonemeAssetEntry>;
  const entry = map[ipa] ?? map[PHONEME_ALIASES[ipa] ?? ""];
  if (!entry) return null;
  if (stepType === "isolated") {
    return {
      audio: entry.audio3xShadow ?? entry.audio3x,
      spectrogram: entry.spectrogram3xShadow ?? entry.spectrogram3x,
      duration: entry.duration3xShadow ?? null,
    };
  }
  return {
    audio: entry.audioShadow ?? entry.audio,
    spectrogram: entry.spectrogramShadow ?? entry.spectrogram,
    duration: entry.durationShadow ?? null,
  };
}

interface PhonemeDrillSessionProps {
  drill: PhonemeDrill;
}

export function PhonemeDrillSession({ drill }: PhonemeDrillSessionProps) {
  const t = useTranslations("PhonemeDrill");
  const locale = useLocale();
  const [currentStep, setCurrentStep] = useState(0);
  const [userBuffer, setUserBuffer] = useState<AudioBuffer | null>(null);
  const [userStream, setUserStream] = useState<MediaStream | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<PhonemeFeedback | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [refProgress, setRefProgress] = useState<number | null>(null);

  const step = drill.steps[currentStep];
  const lang = BCP47_MAP[drill.language];
  const assets = getPhonemeAssets(drill.phoneme, step?.type ?? "word");
  const refAudioSrc = assets?.audio ?? null;
  const refSpectrogramSrc = assets?.spectrogram ?? null;
  const refDuration = assets?.duration ?? null;

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

  const handleStreamStart = useCallback((stream: MediaStream) => {
    setUserStream(stream);
  }, []);

  const handleStreamEnd = useCallback(() => {
    setUserStream(null);
  }, []);

  const handleRefProgress = useCallback((progress: number | null) => {
    setRefProgress(progress);
  }, []);


  const goToStep = (index: number) => {
    setCurrentStep(index);
    setFeedback(null);
    setError(null);
    setAudioUrl(null);
    setUserBuffer(null);
    setUserStream(null);
  };

  if (!step) return <p>{t("noDrills")}</p>;

  return (
    <div className={styles.session}>
      <nav className={styles.breadcrumb}>
        <Link href="/practice" className={styles.breadcrumbLink}>
          {t("practice")}
        </Link>
        <span className={styles.breadcrumbSep}>›</span>
        <span>{drill.phoneme} {drill.name}</span>
      </nav>
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
      <Card variant="elevated" className={styles.stepCardWide}>
        <div className={styles.stepCard}>
          <div className={styles.stepContent}>
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

          <ArticulationDiagram phoneme={drill.phoneme} />
        </div>
      </Card>

      {/* Shadowing controls */}
      <ShadowingPlayer
        text={step.prompt}
        lang={lang}
        phonemeAudioSrc={refAudioSrc}
        maxRecordDuration={refDuration}
        onRecorded={handleRecorded}
        onStreamStart={handleStreamStart}
        onStreamEnd={handleStreamEnd}
        onRefProgress={handleRefProgress}
        disabled={analyzing}
      />

      {/* Spectrogram comparison */}
      <div className={styles.spectrogramSection}>
        <SpectrogramDiff
          referenceSpectrogramSrc={refSpectrogramSrc}
          referenceAudioSrc={refAudioSrc}
          refPlaybackProgress={refProgress}
          userBuffer={userBuffer}
          userStream={userStream}
          referenceLabel={t("reference")}
          userLabel={t("you")}
          sideBySideLabel={t("sideBySide")}
          overlayLabel={t("overlay")}
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
              {feedback.produced && feedback.expected && feedback.produced !== feedback.expected && (
                <div className={styles.phonemeComparison}>
                  <span className={styles.phonemeProduced}>
                    {t("youSaid")}: <strong>/{feedback.produced}/</strong>
                  </span>
                  <span className={styles.phonemeArrow}>→</span>
                  <span className={styles.phonemeExpected}>
                    {t("target")}: <strong>/{feedback.expected}/</strong>
                  </span>
                </div>
              )}
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
