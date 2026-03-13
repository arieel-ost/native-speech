"use client";

import { useTranslations } from "next-intl";
import type { AudioQuality } from "@/hooks/useAudioPipeline";
import styles from "./RecordingStatus.module.css";

interface RecordingStatusProps {
  rmsLevel: number;
  isSpeaking: boolean;
  audioQuality: AudioQuality;
  isRecording: boolean;
  isVadReady: boolean;
}

export function RecordingStatus({
  rmsLevel,
  isSpeaking,
  audioQuality,
  isRecording,
  isVadReady,
}: RecordingStatusProps) {
  const t = useTranslations("DrillSession");

  if (!isRecording) return null;

  // Volume bar color: green normal, yellow high, red clipping
  const volumePercent = Math.min(rmsLevel * 500, 100); // scale RMS to percentage
  const barColor = audioQuality.tooLoud
    ? "var(--color-error)"
    : volumePercent > 60
      ? "var(--color-warning, #f59e0b)"
      : "var(--color-success, #22c55e)";

  const statusText = isSpeaking ? t("speaking") : t("waitingForSpeech");

  const warningText = audioQuality.noSpeechDetected
    ? t("noSpeechDetected")
    : audioQuality.tooQuiet
      ? t("tooQuiet")
      : audioQuality.tooLoud
        ? t("tooLoud")
        : null;

  return (
    <div className={styles.container}>
      <div className={styles.row}>
        <div className={styles.volumeBar}>
          <div
            className={styles.volumeFill}
            style={{ width: `${volumePercent}%`, backgroundColor: barColor }}
          />
        </div>
        <span className={styles.statusText}>
          {isVadReady ? statusText : t("preparingAudio")}
        </span>
      </div>
      {warningText && (
        <p className={styles.warning}>{warningText}</p>
      )}
    </div>
  );
}
