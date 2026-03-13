"use client";

import { useRef, useEffect, useState } from "react";
import { useAudioVisualizer } from "@/hooks/useAudioVisualizer";
import styles from "./WaveformVisualizer.module.css";

const WINDOW_DURATION_MS = 10000; // 10 seconds scrolling window
const SAMPLE_INTERVAL_MS = 30; // ~33fps smooth scrolling

function rmsToPercent(rms: number): number {
  if (rms <= 0.001) return 0;
  const dB = 20 * Math.log10(rms);
  // AGC normalizes the volume so it rarely hits 0dB. 
  // Make the graph more sensitive so -5dB represents 100% and -45dB is 0%.
  return Math.max(0, Math.min(((dB + 45) / 40) * 100, 100)); // 0-100 scale
}

function getZone(percent: number): "quiet" | "good" | "loud" {
  if (percent > 85) return "loud";
  if (percent < 25) return "quiet";
  return "good";
}

interface WaveformVisualizerProps {
  stream: MediaStream | null;
  className?: string;
  isRecording?: boolean;
}

interface Sample {
  time: number;
  level: number;
  zone: "quiet" | "good" | "loud";
}

export function WaveformVisualizer({ stream, className = "", isRecording = false }: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { getMetrics } = useAudioVisualizer(stream);
  const requestRef = useRef<number | null>(null);
  const samplesRef = useRef<Sample[]>([]);
  const startTimeRef = useRef<number>(0);
  const lastSampleTimeRef = useRef<number>(0);
  
  // Local state for UI overlay (throttled updates to prevent lag)
  const [currentZone, setCurrentZone] = useState<"quiet" | "good" | "loud">("quiet");
  const [isClippingUi, setIsClippingUi] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  // ResizeObserver for canvas
  const dimsRef = useRef({ width: 0, height: 0 });
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(([entry]) => {
      const dpr = window.devicePixelRatio || 1;
      const { width, height } = entry.contentRect;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      dimsRef.current = { width, height };
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  // Only clear and reset when starting a new recording
  useEffect(() => {
    if (isRecording) {
      samplesRef.current = [];
      startTimeRef.current = performance.now();
      lastSampleTimeRef.current = 0;
      requestAnimationFrame(() => {
        setElapsed(0);
        setIsClippingUi(false);
        setCurrentZone("quiet");
      });
    }
  }, [isRecording]);

  useEffect(() => {
    if (!stream || !isRecording || !getMetrics) {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      return;
    }

    let lastUiUpdate = 0;

    const draw = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;

      const metrics = getMetrics();
      if (!metrics) {
        requestRef.current = requestAnimationFrame(draw);
        return;
      }

      const { width, height } = dimsRef.current;
      if (width === 0) {
        requestRef.current = requestAnimationFrame(draw);
        return;
      }

      const dpr = window.devicePixelRatio || 1;
      const volumePercent = rmsToPercent(metrics.rms);
      const zone = getZone(volumePercent);
      const now = performance.now();
      const elapsedMs = now - startTimeRef.current;

      // Downsample saving
      if (elapsedMs - lastSampleTimeRef.current >= SAMPLE_INTERVAL_MS) {
        samplesRef.current.push({ time: elapsedMs, level: volumePercent, zone });
        lastSampleTimeRef.current = elapsedMs;
        
        // Evict old samples (keep a bit more than window duration)
        const cutoff = elapsedMs - WINDOW_DURATION_MS - 1000;
        while (samplesRef.current.length > 0 && samplesRef.current[0].time < cutoff) {
          samplesRef.current.shift();
        }
      }

      // Throttled UI State Update (every 250ms)
      if (now - lastUiUpdate > 250) {
        setElapsed(Math.floor(elapsedMs / 1000));
        setCurrentZone(zone);
        if (metrics.isClipping) {
          setIsClippingUi(true);
          setTimeout(() => setIsClippingUi(false), 500); // 500ms flash hold
        }
        lastUiUpdate = now;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      // Safe Zone Gradient Area
      const goodTop = height * (1 - 0.85); // 85%
      const goodBottom = height * (1 - 0.25); // 25%
      
      const safeZoneGradient = ctx.createLinearGradient(0, goodTop, 0, goodBottom);
      safeZoneGradient.addColorStop(0, "rgba(34, 197, 94, 0.0)");
      safeZoneGradient.addColorStop(0.5, "rgba(34, 197, 94, 0.12)");
      safeZoneGradient.addColorStop(1, "rgba(34, 197, 94, 0.0)");
      ctx.fillStyle = safeZoneGradient;
      ctx.fillRect(0, goodTop, width, goodBottom - goodTop);

      // Draw horizontal dashed lines
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

      // Draw timeline filled graph
      if (samplesRef.current.length > 1) {
        const samples = samplesRef.current;
        const currentWindowEnd = elapsedMs;

        ctx.beginPath();
        // Start at bottom left of the path
        const firstS = samples[0];
        const firstX = Math.max(0, width - ((currentWindowEnd - firstS.time) / WINDOW_DURATION_MS) * width);
        ctx.moveTo(firstX, height);

        for (let i = 0; i < samples.length; i++) {
          const s = samples[i];
          const x = width - ((currentWindowEnd - s.time) / WINDOW_DURATION_MS) * width;
          const y = height - (s.level / 100) * height;
          ctx.lineTo(x, y);
        }

        // Draw down to bottom right, then close path
        const lastS = samples[samples.length - 1];
        const lastX = width - ((currentWindowEnd - lastS.time) / WINDOW_DURATION_MS) * width;
        ctx.lineTo(lastX, height);
        ctx.closePath();

        // Beautiful smooth gradient fill underneath
        const fillGradient = ctx.createLinearGradient(0, 0, 0, height);
        fillGradient.addColorStop(0, "rgba(239, 68, 68, 0.4)");    // Loud
        fillGradient.addColorStop(0.3, "rgba(34, 197, 94, 0.5)");   // Good peak
        fillGradient.addColorStop(0.8, "rgba(34, 197, 94, 0.1)");   // Good base
        fillGradient.addColorStop(1, "rgba(156, 163, 175, 0.05)");  // Quiet base
        ctx.fillStyle = fillGradient;
        ctx.fill();

        // Stroke line on top
        ctx.beginPath();
        for (let i = 0; i < samples.length; i++) {
          const s = samples[i];
          const x = width - ((currentWindowEnd - s.time) / WINDOW_DURATION_MS) * width;
          const y = height - (s.level / 100) * height;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        
        const strokeGradient = ctx.createLinearGradient(0, 0, 0, height);
        strokeGradient.addColorStop(0, "#ef4444");
        strokeGradient.addColorStop(0.2, "#fca5a5");
        strokeGradient.addColorStop(0.3, "#4ade80");
        strokeGradient.addColorStop(0.8, "#22c55e");
        strokeGradient.addColorStop(1, "#9ca3af");
        
        ctx.strokeStyle = strokeGradient;
        ctx.lineWidth = 3;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.stroke();
      }

      requestRef.current = requestAnimationFrame(draw);
    };

    requestRef.current = requestAnimationFrame(draw);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [stream, isRecording, getMetrics]);

  if (!isRecording && elapsed === 0) return null;

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  let statusText = "Speak into your microphone";
  if (!isRecording) statusText = "Recording Finished";
  else if (currentZone === "loud") statusText = "Too loud! Move back.";
  else if (currentZone === "quiet") statusText = "A bit quiet...";
  else statusText = "Hearing you clearly";

  return (
    <div className={`${styles.container} ${isClippingUi ? styles.clipping : ""} ${className}`}>
      <div className={styles.canvasWrap}>
        <canvas ref={canvasRef} className={styles.canvas} />
        <div className={styles.infoOverlay}>
          <div className={styles.statusPill}>
            {!isRecording ? null : <span className={styles.redDot} />}
            <span>{mm}:{ss}</span>
            <span className={
              currentZone === "loud" ? styles.alertText :
              currentZone === "quiet" ? styles.quietText : styles.goodText
            }>
              • {statusText}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
