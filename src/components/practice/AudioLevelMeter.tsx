"use client";

import { useState, useEffect, useRef } from "react";
import type { AudioQuality } from "@/hooks/useAudioPipeline";
import styles from "./AudioLevelMeter.module.css";

interface AudioLevelMeterProps {
  rmsLevel: number;
  isSpeaking: boolean;
  audioQuality: AudioQuality;
  isRecording: boolean;
  isVadReady: boolean;
}

export function AudioLevelMeter({
  rmsLevel,
  isSpeaking,
  audioQuality,
  isRecording,
  isVadReady,
}: AudioLevelMeterProps) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isRecording) {
      setElapsed(0);
      intervalRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRecording]);

  if (!isRecording) return null;

  // Logarithmic scaling — maps normal speech (~0.03-0.15 RMS) to 44-65% (good zone)
  const volumePercent = rmsLevel > 0.001
    ? Math.min(Math.max(30 * Math.log10(rmsLevel / 0.001), 0), 100)
    : 0;

  // Determine zone and status
  const zone = audioQuality.tooLoud
    ? "loud"
    : audioQuality.tooQuiet || volumePercent < 20
      ? "quiet"
      : "good";

  const statusText = !isVadReady
    ? "Preparing microphone..."
    : audioQuality.noSpeechDetected
      ? "No speech detected — check your microphone"
      : audioQuality.tooLoud
        ? "Too loud — move back a bit"
        : audioQuality.tooQuiet
          ? "Try speaking a bit louder"
          : isSpeaking
            ? "Hearing you clearly"
            : "Speak into your microphone";

  const statusClass = zone === "loud"
    ? styles.statusError
    : zone === "quiet" && (audioQuality.tooQuiet || audioQuality.noSpeechDetected)
      ? styles.statusError
      : isSpeaking
        ? styles.statusSuccess
        : styles.statusMuted;

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <div className={styles.container}>
      {/* Recording pill */}
      <div className={styles.pill}>
        <span className={styles.redDot} />
        <span className={styles.pillText}>Recording</span>
        <span className={styles.timer}>{mm}:{ss}</span>
      </div>

      {/* Level meter with zones */}
      <div
        className={styles.meter}
        role="meter"
        aria-valuenow={Math.round(volumePercent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Microphone volume"
      >
        {/* Zone labels */}
        <div className={styles.zoneLabels}>
          <span className={styles.zoneLabel}>Quiet</span>
          <span className={`${styles.zoneLabel} ${styles.zoneLabelGood}`}>Good</span>
          <span className={styles.zoneLabel}>Loud</span>
        </div>
        {/* Track with zone gradient */}
        <div className={styles.track}>
          {/* Zone tick marks */}
          <div className={styles.tick} style={{ left: "20%" }} />
          <div className={styles.tick} style={{ left: "75%" }} />
          {/* Fill */}
          <div
            className={styles.fill}
            style={{ width: `${volumePercent}%` }}
          />
          {/* Current level marker */}
          <div
            className={`${styles.marker} ${styles[`marker_${zone}`]}`}
            style={{ left: `${volumePercent}%` }}
          />
        </div>
      </div>

      {/* Status text */}
      <p className={`${styles.status} ${statusClass}`} role="status" aria-live="polite">
        {statusText}
      </p>
    </div>
  );
}
