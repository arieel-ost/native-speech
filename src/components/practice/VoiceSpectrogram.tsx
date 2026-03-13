"use client";

import { useEffect, useRef } from "react";
import styles from "./VoiceSpectrogram.module.css";

interface VoiceSpectrogramProps {
  analyserNode: AnalyserNode | null;
  isRecording: boolean;
}

// Frequency range we care about for vowel formants
const MIN_FREQ = 100;
const MAX_FREQ = 4000;

// Formant region labels (approximate ranges for vowel identification)
const FORMANT_LABELS: { label: string; freq: number; description: string }[] = [
  { label: "F1", freq: 500, description: "vowel height" },
  { label: "F2", freq: 1500, description: "front / back" },
  { label: "F3", freq: 2500, description: "rounding" },
];

// Vowel reference markers — typical F1 frequencies
const VOWEL_MARKERS: { vowel: string; f1: number; f2: number }[] = [
  { vowel: "ee", f1: 270, f2: 2290 },
  { vowel: "oo", f1: 300, f2: 870 },
  { vowel: "ah", f1: 730, f2: 1090 },
  { vowel: "eh", f1: 530, f2: 1840 },
  { vowel: "oh", f1: 570, f2: 840 },
];

export function VoiceSpectrogram({ analyserNode, isRecording }: VoiceSpectrogramProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const columnRef = useRef<number>(0);
  const hasBeenActiveRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyserNode || !isRecording) return;
    hasBeenActiveRef.current = true;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const w = rect.width;
    const h = rect.height;

    // Reserve space for axis labels
    const labelWidth = 40;
    const plotW = w - labelWidth;
    const plotX = labelWidth;

    // Clear to dark background
    ctx.fillStyle = "#0a0a12";
    ctx.fillRect(0, 0, w, h);

    // Draw y-axis labels and formant markers
    drawAxisLabels(ctx, labelWidth, h, plotX, plotW);

    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);
    const sampleRate = analyserNode.context.sampleRate;

    // Map frequency to y position (log scale for better vowel resolution)
    const freqToY = (freq: number): number => {
      const minLog = Math.log10(MIN_FREQ);
      const maxLog = Math.log10(MAX_FREQ);
      const freqLog = Math.log10(Math.max(MIN_FREQ, Math.min(MAX_FREQ, freq)));
      // Invert: high freq at top
      return h * (1 - (freqLog - minLog) / (maxLog - minLog));
    };

    // Map FFT bin to frequency
    const binToFreq = (bin: number): number => {
      return (bin * sampleRate) / (bufferLength * 2);
    };

    columnRef.current = 0;

    const draw = () => {
      analyserNode.getFloatFrequencyData(dataArray);

      // Shift existing image left by 1px in the plot area
      if (columnRef.current > 0) {
        const imageData = ctx.getImageData(
          (plotX + 1) * dpr, 0,
          (plotW - 1) * dpr, h * dpr
        );
        ctx.putImageData(imageData, plotX * dpr, 0);
      }

      // Draw new column at the right edge
      const x = plotX + plotW - 1;

      // Clear the new column
      ctx.fillStyle = "#0a0a12";
      ctx.fillRect(x, 0, 1, h);

      // Draw each frequency bin as a colored pixel
      for (let i = 0; i < bufferLength; i++) {
        const freq = binToFreq(i);
        if (freq < MIN_FREQ || freq > MAX_FREQ) continue;

        const y = freqToY(freq);
        const nextFreq = binToFreq(i + 1);
        const nextY = freqToY(nextFreq);
        const binHeight = Math.max(1, Math.abs(y - nextY));

        // Normalize dB: typically -100 to 0
        const db = dataArray[i];
        const normalized = Math.max(0, Math.min(1, (db + 90) / 70));

        if (normalized < 0.05) continue; // skip silence

        const color = intensityToColor(normalized);
        ctx.fillStyle = color;
        ctx.fillRect(x, y - binHeight / 2, 1, binHeight);
      }

      // Re-draw formant guide lines over the spectrogram
      ctx.setLineDash([2, 4]);
      ctx.lineWidth = 0.5;
      for (const marker of FORMANT_LABELS) {
        const y = freqToY(marker.freq);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
        ctx.beginPath();
        ctx.moveTo(plotX, y);
        ctx.lineTo(plotX + plotW, y);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      columnRef.current++;
      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [analyserNode, isRecording]);

  // Hide if never been active (no analyser yet)
  if (!isRecording && !hasBeenActiveRef.current) return null;

  return (
    <div className={styles.container}>
      <canvas ref={canvasRef} className={styles.canvas} />
      <div className={styles.legend}>
        {VOWEL_MARKERS.map((v) => (
          <span key={v.vowel} className={styles.vowelTag}>/{v.vowel}/</span>
        ))}
      </div>
    </div>
  );
}

function drawAxisLabels(
  ctx: CanvasRenderingContext2D,
  labelWidth: number,
  h: number,
  plotX: number,
  plotW: number,
) {
  const minLog = Math.log10(MIN_FREQ);
  const maxLog = Math.log10(MAX_FREQ);

  const freqToY = (freq: number): number => {
    const freqLog = Math.log10(Math.max(MIN_FREQ, Math.min(MAX_FREQ, freq)));
    return h * (1 - (freqLog - minLog) / (maxLog - minLog));
  };

  // Background for labels
  ctx.fillStyle = "#0a0a12";
  ctx.fillRect(0, 0, labelWidth, h);

  // Frequency ticks
  ctx.fillStyle = "#6b6b80";
  ctx.font = "9px 'JetBrains Mono', monospace";
  ctx.textAlign = "right";

  const freqTicks = [200, 500, 1000, 2000, 3000, 4000];
  for (const freq of freqTicks) {
    const y = freqToY(freq);
    const label = freq >= 1000 ? `${freq / 1000}k` : `${freq}`;
    ctx.fillText(label, labelWidth - 4, y + 3);
  }

  // Formant region markers
  ctx.textAlign = "left";
  for (const marker of FORMANT_LABELS) {
    const y = freqToY(marker.freq);
    ctx.fillStyle = "rgba(99, 102, 241, 0.7)";
    ctx.font = "bold 9px 'JetBrains Mono', monospace";
    ctx.fillText(marker.label, 2, y - 4);
  }

  // Separator line
  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(plotX, 0);
  ctx.lineTo(plotX, h);
  ctx.stroke();
}

function intensityToColor(normalized: number): string {
  // Dark → indigo → violet → amber/white for peaks
  if (normalized < 0.25) {
    const t = normalized / 0.25;
    const r = Math.round(10 + t * 89);
    const g = Math.round(10 + t * 92);
    const b = Math.round(18 + t * 223);
    return `rgb(${r},${g},${b})`;
  } else if (normalized < 0.55) {
    const t = (normalized - 0.25) / 0.3;
    const r = Math.round(99 + t * 40);
    const g = Math.round(102 - t * 10);
    const b = Math.round(241 - t * (241 - 246));
    return `rgb(${r},${g},${b})`;
  } else if (normalized < 0.8) {
    const t = (normalized - 0.55) / 0.25;
    const r = Math.round(139 + t * 106);
    const g = Math.round(92 + t * 66);
    const b = Math.round(246 - t * 235);
    return `rgb(${r},${g},${b})`;
  } else {
    const t = (normalized - 0.8) / 0.2;
    const r = Math.round(245 + t * 10);
    const g = Math.round(158 + t * 80);
    const b = Math.round(11 + t * 100);
    return `rgb(${r},${g},${b})`;
  }
}
