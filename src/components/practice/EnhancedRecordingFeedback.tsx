"use client";

import { useRef, useEffect, useCallback } from "react";
import type { AudioQuality } from "@/hooks/useAudioPipeline";
import styles from "./EnhancedRecordingFeedback.module.css";

const MAX_DURATION_S = 120; // 2 minutes
const MAX_DURATION_MS = MAX_DURATION_S * 1000;
const SAMPLE_INTERVAL_MS = 50; // ~20 samples/sec — smooth but not dense

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

// Fixed dB scale: -60dB (silence) → 0dB (max)
// Standard mapping used by online voice meters and OS audio tools
function rmsToPercent(rms: number): number {
  if (rms <= 0.001) return 0;
  const dB = 20 * Math.log10(rms); // 0–1 RMS → -60..0 dB
  return Math.max(0, Math.min(((dB + 60) / 60) * 100, 100));
}

function getZone(percent: number): "quiet" | "good" | "loud" {
  if (percent > 85) return "loud";
  if (percent < 25) return "quiet";
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
  const lastSampleTimeRef = useRef(0);

  // Reset state when recording starts
  useEffect(() => {
    if (isRecording) {
      samplesRef.current = [];
      startTimeRef.current = performance.now();
      maxFiredRef.current = false;
      lastSampleTimeRef.current = 0;
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

    const volumePercent = rmsToPercent(rmsLevel);
    const elapsed = performance.now() - startTimeRef.current;
    const zone = getZone(volumePercent);

    // Downsample: only push a sample every SAMPLE_INTERVAL_MS
    if (elapsed - lastSampleTimeRef.current >= SAMPLE_INTERVAL_MS) {
      samplesRef.current.push({ time: elapsed, level: volumePercent, zone });
      lastSampleTimeRef.current = elapsed;
    }

    // Fire max duration callback once
    if (elapsed >= MAX_DURATION_MS && !maxFiredRef.current) {
      maxFiredRef.current = true;
      onMaxDurationRef.current?.();
    }

    // Draw
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    // "Good zone" background band (25%-85% on dB scale)
    const goodTop = height * (1 - 0.85);
    const goodBottom = height * (1 - 0.25);
    ctx.fillStyle = "rgba(34, 197, 94, 0.06)";
    ctx.fillRect(0, goodTop, width, goodBottom - goodTop);

    // Guide lines
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

    // Draw volume line — one continuous path per color zone
    const samples = samplesRef.current;
    if (samples.length < 2) return;

    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    // Group consecutive samples by zone, draw each group as a continuous path
    let segStart = 0;
    for (let i = 1; i <= samples.length; i++) {
      const zoneChanged = i === samples.length || samples[i].zone !== samples[segStart].zone;
      if (!zoneChanged) continue;

      // Draw segment from segStart to i-1
      ctx.beginPath();
      ctx.strokeStyle = ZONE_COLORS[samples[segStart].zone];

      // Start one sample before segStart for continuity (overlap)
      const drawFrom = Math.max(0, segStart - 1);
      for (let j = drawFrom; j < i; j++) {
        const s = samples[j];
        const x = (s.time / MAX_DURATION_MS) * width;
        const y = height - (s.level / 100) * height;
        if (j === drawFrom) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      segStart = i;
    }

    // Playhead
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

  const volumePercent = rmsToPercent(rmsLevel);
  const zone = getZone(volumePercent);

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
