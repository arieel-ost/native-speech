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
  time: number;
  level: number;
  zone: "quiet" | "good" | "loud";
}

const ZONE_COLORS = {
  quiet: "rgba(156, 163, 175, 0.6)",
  good: "rgba(34, 197, 94, 0.85)",
  loud: "rgba(239, 68, 68, 0.85)",
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

  // Collect samples and draw volume line
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

    // "Good zone" background band
    const goodTop = height * (1 - 0.75);
    const goodBottom = height * (1 - 0.20);
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

    // Draw volume as a colored line
    const samples = samplesRef.current;
    if (samples.length < 2) return;

    // Draw line segments colored by zone
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    for (let i = 1; i < samples.length; i++) {
      const prev = samples[i - 1];
      const curr = samples[i];
      const x0 = (prev.time / MAX_DURATION_MS) * width;
      const y0 = height - (prev.level / 100) * height;
      const x1 = (curr.time / MAX_DURATION_MS) * width;
      const y1 = height - (curr.level / 100) * height;

      ctx.beginPath();
      ctx.strokeStyle = ZONE_COLORS[curr.zone];
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }

    // Playhead line at current position
    const playheadX = Math.min((elapsed / MAX_DURATION_MS) * width, width);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
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

  const elapsed = performance.now() - startTimeRef.current;
  const elapsedS = Math.floor(elapsed / 1000);
  const remainingS = Math.max(0, MAX_DURATION_S - elapsedS);
  const mm = String(Math.floor(elapsedS / 60)).padStart(2, "0");
  const ss = String(elapsedS % 60).padStart(2, "0");

  const volumePercent = rmsLevel > 0.001
    ? Math.min(Math.max(30 * Math.log10(rmsLevel / 0.001), 0), 100)
    : 0;
  const zone = getZone(volumePercent, audioQuality);

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
      {/* Volume-over-time line graph */}
      <div className={styles.waveformWrap}>
        <canvas ref={canvasRef} className={styles.canvas} />
        <span className={styles.guideLabel} style={{ top: "23%" }}>loud</span>
        <span className={styles.guideLabel} style={{ bottom: "18%" }}>quiet</span>
      </div>

      {/* Time + status row */}
      <div className={styles.timeRow}>
        <span className={styles.elapsed}>{mm}:{ss}</span>
        <span className={`${styles.statusInline} ${statusClass}`}>{statusText}</span>
        <span className={styles.remaining}>
          {remainingS <= 30
            ? `${remainingS}s remaining`
            : `${Math.ceil(remainingS / 60)}min remaining`}
        </span>
      </div>
    </div>
  );
}
