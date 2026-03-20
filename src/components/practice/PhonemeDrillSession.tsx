"use client";

import { useState, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui";
import { ShadowingPlayer } from "./ShadowingPlayer";
import { SpectrogramDiff, type ViewMode } from "./SpectrogramDiff";
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
  isolated: "●",
  minimal_pair: "⇄",
  word: "◆",
  short_phrase: "◈",
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
  duration: number | null;
}

const PHONEME_ALIASES: Record<string, string> = {
  "ɹ": "r",
  "iː": "i",
  "ɪ/iː": "ɪ",
  "yː": "u",
  "øː": "ə",
  "ç/x": "x",
};

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
  const [viewMode, setViewMode] = useState<ViewMode>("side-by-side");

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

  const progressPercent = ((currentStep + 1) / drill.steps.length) * 100;

  return (
    <div className={styles.container}>
      {/* Top Navigation Bar */}
      <header className={styles.topBar}>
        {/* Left: Back + Breadcrumb */}
        <div className={styles.topBarLeft}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.location.href = "/practice"}
            className={styles.backBtn}
            title="Back to practice"
          >
            ←
          </Button>
          <nav className={styles.breadcrumb}>
            <Link href="/practice" className={styles.breadcrumbLink}>
              Practice
            </Link>
            <span className={styles.breadcrumbSep}>/</span>
            <span className={styles.breadcrumbCurrent}>
              {drill.phoneme} {drill.name}
            </span>
          </nav>
        </div>

        {/* Right: Step Nav + Progress */}
        <div className={styles.topBarRight}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => goToStep(currentStep - 1)}
            disabled={currentStep === 0 || analyzing}
            className={styles.stepArrowBtn}
          >
            ←
          </Button>
          
          <div className={styles.progress}>
            <div className={styles.progressTrack}>
              <div 
                className={styles.progressFill} 
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className={styles.progressText}>
              {currentStep + 1} <span className={styles.progressTotal}>/ {drill.steps.length}</span>
            </span>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => goToStep(currentStep + 1)}
            disabled={currentStep === drill.steps.length - 1 || analyzing}
            className={styles.stepArrowBtn}
          >
            →
          </Button>
        </div>
      </header>

      {/* Main Content: Sidebar + Practice Area */}
      <div className={styles.main}>
        {/* Left Sidebar: Phoneme Identity */}
        <aside className={styles.sidebar}>
          <div className={styles.phonemeIdentity}>
            <span className={styles.phonemeSymbol}>{drill.phoneme}</span>
            <span className={styles.phonemeName}>{drill.name}</span>
            <span className={styles.phonemeIpa}>/{drill.phoneme}/</span>
          </div>
          
          <div className={styles.diagramSection}>
            <ArticulationDiagram phoneme={drill.phoneme} />
          </div>

          {step.instruction && (
            <div className={styles.instructionSidebar}>
              <span className={styles.instructionLabel}>How to make this sound</span>
              <p className={styles.instructionText}>{step.instruction}</p>
            </div>
          )}
        </aside>

        {/* Right: Practice Zone */}
        <main className={styles.practiceZone}>
          {/* Drill Content Header */}
          <div className={styles.drillHeader}>
            <div className={styles.stepMeta}>
              <span className={styles.stepTypeIcon} aria-hidden="true">
                {STEP_TYPE_ICONS[step.type]}
              </span>
              <span className={styles.stepTypeLabel}>
                {t(`stepType_${step.type}`, { defaultValue: step.type })}
              </span>
            </div>
            
            <div className={styles.promptSection}>
              <h1 className={styles.prompt}>{step.prompt}</h1>
              <span className={styles.promptIpa}>/{step.ipa}/</span>
            </div>
          </div>

          {/* Recording Controls */}
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
            hasRecorded={!!userBuffer}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />

          {/* Spectrogram Comparison */}
          <div className={styles.analysisSection}>
            <SpectrogramDiff
              referenceSpectrogramSrc={refSpectrogramSrc}
              referenceAudioSrc={refAudioSrc}
              refPlaybackProgress={refProgress}
              userBuffer={userBuffer}
              userStream={userStream}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />
          </div>

          {/* Feedback Zone */}
          <div className={styles.feedbackZone} aria-live="polite">
            {error ? (
              <div className={styles.feedbackError}>
                <span className={styles.feedbackIcon}>⚠</span>
                <p>{error}</p>
              </div>
            ) : analyzing ? (
              <div className={styles.feedbackAnalyzing}>
                <div className={styles.analyzingSpinner} />
                <span>{t("analyzing")}</span>
              </div>
            ) : feedback ? (
              <div className={styles.feedbackResult}>
                <div className={styles.scoreSection}>
                  <div className={styles.scoreRing}>
                    <span className={styles.scoreValue}>{feedback.score}</span>
                    <span className={styles.scoreMax}>/10</span>
                  </div>
                  <div className={styles.scoreLabel}>
                    {feedback.phonemeRating === "good" ? "Excellent" : 
                     feedback.phonemeRating === "acceptable" ? "Good progress" : "Keep practicing"}
                  </div>
                </div>
                
                {feedback.produced && feedback.expected && feedback.produced !== feedback.expected && (
                  <div className={styles.phonemeDiff}>
                    <span className={styles.phonemeHeard}>Heard: /{feedback.produced}/</span>
                    <span className={styles.phonemeArrow}>→</span>
                    <span className={styles.phonemeTarget}>Target: /{feedback.expected}/</span>
                  </div>
                )}
                
                <p className={styles.feedbackSummary}>{feedback.summary}</p>
                
                {feedback.tip && (
                  <div className={styles.feedbackTip}>
                    <span className={styles.tipIcon}>💡</span>
                    <p>{feedback.tip}</p>
                  </div>
                )}
                
                {audioUrl && (
                  <div className={styles.playbackSection}>
                    <span className={styles.playbackLabel}>Your recording</span>
                    <AudioPlayer src={audioUrl} />
                  </div>
                )}
              </div>
            ) : (
              <div className={styles.feedbackPlaceholder}>
                <span className={styles.placeholderIcon}>🎙️</span>
                <p>{t("feedbackPlaceholder")}</p>
              </div>
            )}
          </div>
        </main>
      </div>

    </div>
  );
}
