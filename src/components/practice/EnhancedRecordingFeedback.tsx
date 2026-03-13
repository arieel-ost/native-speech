"use client";

import { useRef, useEffect, useCallback } from "react";
import type { AudioQuality } from "@/hooks/useAudioPipeline";
import styles from "./EnhancedRecordingFeedback.module.css";

const MAX_DURATION_S = 120; // 2 minutes
const MAX_DURATION_MS = MAX_DURATION_S * 1000;

interface EnhancedRecordingFeedbackProps {
  rmsLevel: number;
  isSpeaking: boolean;
  audioQuality: AudioQuality;
  isRecording: boolean;
  isVadReady: boolean;
  onMaxDuration?: () => void;
}

interface VolumeSample {
  time: number; // ms since recording start
  level: number; // 0-100 (log-scaled percent)
  zone: "quiet" | "good" | "loud";
}

const ZONE_COLORS = {
  quiet: "rgba(156, 163, 175, 0.5)",
  good: "rgba(34, 197, 94, 0.7)",
  loud: "rgba(239, 68, 68, 0.7)",
};

function getZone(volumePercent: number, audioQuality: AudioQuality): "quiet" | "good" | "loud" {
  if (audioQuality.tooLoud) return "loud";
  if (audioQuality.tooQuiet || volumePercent < 20) return "quiet";
  return "good";
}

export function EnhancedRecordingFeedback({
  rmsLevel,
  isSpeaking,
  audioQuality,
  isRecording,
  isVadReady,
  onMaxDuration,
}: EnhancedRecordingFeedbackProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dimsRef = useRef({ width: 0, height: 0 });
  const samplesRef = useRef<VolumeSample[]>([]);
  const startTimeRef = useRef(0);
  const maxFiredRef = useRef(false);

  // Reset state when recording starts
  useEffect(() => {
    if (isRecording) {
      samplesRef.current = [];
      startTimeRef.current = performance.now();
      maxFiredRef.current = false;
    }
  }, [isRecording]);

  // Cache canvas dimensions with ResizeObserver
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      dimsRef.current = { width, height };
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  // Stable ref for onMaxDuration callback
  const onMaxDurationRef = useRef(onMaxDuration);
  onMaxDurationRef.current = onMaxDuration;

  // Collect samples and draw volume timeline
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isRecording) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const { width, height } = dimsRef.current;
    if (width === 0) return;

    // Compute current volume
    const volumePercent = rmsLevel > 0.001
      ? Math.min(Math.max(30 * Math.log10(rmsLevel / 0.001), 0), 100)
      : 0;

    const elapsed = performance.now() - startTimeRef.current;
    const zone = getZone(volumePercent, audioQuality);

    // Push sample
    samplesRef.current.push({ time: elapsed, level: volumePercent, zone });

    // Fire max duration callback once
    if (elapsed >= MAX_DURATION_MS && !maxFiredRef.current) {
      maxFiredRef.current = true;
      onMaxDurationRef.current?.();
    }

    // Draw
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    // "Good zone" background band (20%-75% of volume maps to this area on y-axis)
    const goodTop = height * (1 - 0.75); // 75% volume → 25% from top
    const goodBottom = height * (1 - 0.20); // 20% volume → 80% from top
    ctx.fillStyle = "rgba(34, 197, 94, 0.06)";
    ctx.fillRect(0, goodTop, width, goodBottom - goodTop);

    // Guide lines at good zone boundaries
    ctx.setLineDash([4, 6]);
    ctx.strokeStyle = "rgba(34, 197, 94, 0.2)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, goodTop);
    ctx.lineTo(width, goodTop);
    ctx.moveTo(0, goodBottom);
    ctx.lineTo(width, goodBottom);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw volume bars
    const samples = samplesRef.current;
    const barWidth = Math.max(width / (MAX_DURATION_S * 10), 1.5); // ~10 samples/sec visual density

    for (const sample of samples) {
      const x = (sample.time / MAX_DURATION_MS) * width;
      const barHeight = (sample.level / 100) * height;
      const y = height - barHeight;

      ctx.fillStyle = ZONE_COLORS[sample.zone];
      ctx.fillRect(x, y, barWidth, barHeight);
    }

    // Playhead line at current position
    const playheadX = Math.min((elapsed / MAX_DURATION_MS) * width, width);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, height);
    ctx.stroke();
  }, [rmsLevel, isRecording, audioQuality]);

  // Run draw on every rmsLevel update
  useEffect(() => {
    draw();
  }, [draw]);

  if (!isRecording) return null;

  // Current volume for the level bar below the timeline
  const volumePercent = rmsLevel > 0.001
    ? Math.min(Math.max(30 * Math.log10(rmsLevel / 0.001), 0), 100)
    : 0;

  const zone = getZone(volumePercent, audioQuality);

  const elapsed = performance.now() - startTimeRef.current;
  const elapsedS = Math.floor(elapsed / 1000);
  const remainingS = Math.max(0, MAX_DURATION_S - elapsedS);
  const mm = String(Math.floor(elapsedS / 60)).padStart(2, "0");
  const ss = String(elapsedS % 60).padStart(2, "0");

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

  return (
    <div className={styles.container}>
      {/* Volume-over-time timeline */}
      <div className={styles.waveformWrap}>
        <canvas ref={canvasRef} className={styles.canvas} />
        <span className={styles.guideLabel} style={{ top: "23%" }}>loud</span>
        <span className={styles.guideLabel} style={{ bottom: "18%" }}>quiet</span>
      </div>

      {/* Time display */}
      <div className={styles.timeRow}>
        <span className={styles.elapsed}>{mm}:{ss}</span>
        <span className={styles.remaining}>
          {remainingS <= 30
            ? `${remainingS}s remaining`
            : `${Math.ceil(remainingS / 60)}min remaining`}
        </span>
      </div>

      {/* Level bar */}
      <div className={styles.meterSection}>
        <div className={styles.zoneLabels}>
          <span className={styles.zoneLabel}>Quiet</span>
          <span className={`${styles.zoneLabel} ${styles.zoneLabelGood}`}>Good</span>
          <span className={styles.zoneLabel}>Loud</span>
        </div>
        <div
          className={styles.track}
          role="meter"
          aria-valuenow={Math.round(volumePercent)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Microphone volume"
        >
          <div className={styles.tickLeft} />
          <div className={styles.tickRight} />
          <div className={styles.fill} style={{ width: `${volumePercent}%` }} />
          <div
            className={`${styles.marker} ${styles[`marker_${zone}`]}`}
            style={{ left: `${volumePercent}%` }}
          />
        </div>
      </div>

      {/* Status */}
      <p className={`${styles.status} ${statusClass}`} role="status" aria-live="polite">
        {statusText}
      </p>
    </div>
  );
}
