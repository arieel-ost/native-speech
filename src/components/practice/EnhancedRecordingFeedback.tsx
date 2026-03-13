"use client";

import { useRef, useEffect } from "react";
import type { AudioQuality } from "@/hooks/useAudioPipeline";
import styles from "./EnhancedRecordingFeedback.module.css";

interface EnhancedRecordingFeedbackProps {
  waveformData: Float32Array | null;
  rmsLevel: number;
  isSpeaking: boolean;
  audioQuality: AudioQuality;
  isRecording: boolean;
  isVadReady: boolean;
}

function getWaveformColor(audioQuality: AudioQuality, isSpeaking: boolean, volumePercent: number): string {
  if (audioQuality.tooLoud) return "rgba(239, 68, 68, 0.85)";
  if (volumePercent > 65) return "rgba(245, 158, 11, 0.8)";
  if (isSpeaking) return "rgba(34, 197, 94, 0.8)";
  if (audioQuality.tooQuiet) return "rgba(150, 150, 150, 0.35)";
  return "rgba(150, 150, 150, 0.4)";
}

export function EnhancedRecordingFeedback({
  waveformData,
  rmsLevel,
  isSpeaking,
  audioQuality,
  isRecording,
  isVadReady,
}: EnhancedRecordingFeedbackProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dimsRef = useRef({ width: 0, height: 0 });
  // Peak-hold: snap up instantly, hold 800ms after speech pause, then decay
  const holdRef = useRef({ level: 0, time: 0 });

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

  // Draw waveform
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !waveformData || !isRecording) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const { width, height } = dimsRef.current;
    if (width === 0) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const centerY = height / 2;

    // Draw guide lines (ideal volume zone: 30%-70% of height)
    const guideTop = height * 0.3;
    const guideBottom = height * 0.7;

    // Sweet spot zone background
    ctx.fillStyle = "rgba(34, 197, 94, 0.04)";
    ctx.fillRect(0, guideTop, width, guideBottom - guideTop);

    // Guide lines
    ctx.setLineDash([4, 6]);
    ctx.strokeStyle = "rgba(34, 197, 94, 0.2)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, guideTop);
    ctx.lineTo(width, guideTop);
    ctx.moveTo(0, guideBottom);
    ctx.lineTo(width, guideBottom);
    ctx.stroke();
    ctx.setLineDash([]);

    // Logarithmic volume — maps normal speech (~0.03-0.15 RMS) to 44-65%
    const volumePercent = rmsLevel > 0.001
      ? Math.min(Math.max(30 * Math.log10(rmsLevel / 0.001), 0), 100)
      : 0;

    // Draw waveform with color-coded stroke
    ctx.beginPath();
    ctx.strokeStyle = getWaveformColor(audioQuality, isSpeaking, volumePercent);
    ctx.lineWidth = 2.5;

    const sliceWidth = width / waveformData.length;
    let x = 0;

    for (let i = 0; i < waveformData.length; i++) {
      const v = waveformData[i];
      const y = centerY + v * centerY;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      x += sliceWidth;
    }

    ctx.stroke();
  }, [waveformData, rmsLevel, isRecording, isSpeaking, audioQuality]);

  if (!isRecording) return null;

  // Volume bar — same log scale but with peak-hold for less pressure during pauses
  const rawPercent = rmsLevel > 0.001
    ? Math.min(Math.max(30 * Math.log10(rmsLevel / 0.001), 0), 100)
    : 0;

  const now = performance.now();
  if (rawPercent >= holdRef.current.level) {
    holdRef.current = { level: rawPercent, time: now };
  } else if (now - holdRef.current.time > 800) {
    holdRef.current.level += (rawPercent - holdRef.current.level) * 0.08;
  }
  const volumePercent = holdRef.current.level;

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

  return (
    <div className={styles.container}>
      {/* Color-coded waveform with guide lines */}
      <div className={styles.waveformWrap}>
        <canvas ref={canvasRef} className={styles.canvas} />
        <span className={styles.guideLabel} style={{ top: "28%" }}>ideal</span>
        <span className={styles.guideLabel} style={{ bottom: "28%" }}>zone</span>
      </div>

      {/* Enhanced volume bar */}
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
