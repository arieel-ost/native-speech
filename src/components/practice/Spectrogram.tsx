"use client";

import { useRef, useEffect, useCallback } from "react";
import styles from "./Spectrogram.module.css";

/**
 * Renders a scrolling spectrogram from either a live MediaStream or a static AudioBuffer.
 *
 * - Live mode: pass `stream` — draws a real-time scrolling spectrogram.
 * - Static mode: pass `audioBuffer` — renders the full spectrogram of the buffer.
 *
 * Uses a Mel-weighted frequency scale for perceptually meaningful colour mapping
 * and a "hot" colourmap (black → purple → red → orange → yellow → white).
 */

interface SpectrogramProps {
  /** Live mic stream — enables real-time scrolling mode */
  stream?: MediaStream | null;
  /** Pre-decoded audio — enables static full-render mode */
  audioBuffer?: AudioBuffer | null;
  /** Label shown in the top-left corner */
  label?: string;
  /** Placeholder when nothing to show */
  placeholder?: string;
  /** CSS class on the root container */
  className?: string;
}

/* ---- colour map (hot) ---- */
function heatColor(value: number): [number, number, number] {
  // value 0..1 → black → purple → red → orange → yellow → white
  const v = Math.max(0, Math.min(1, value));
  if (v < 0.2) {
    const t = v / 0.2;
    return [Math.round(t * 80), 0, Math.round(t * 120)]; // black → purple
  }
  if (v < 0.4) {
    const t = (v - 0.2) / 0.2;
    return [80 + Math.round(t * 175), 0, 120 - Math.round(t * 120)]; // purple → red
  }
  if (v < 0.6) {
    const t = (v - 0.4) / 0.2;
    return [255, Math.round(t * 140), 0]; // red → orange
  }
  if (v < 0.8) {
    const t = (v - 0.6) / 0.2;
    return [255, 140 + Math.round(t * 115), 0]; // orange → yellow
  }
  const t = (v - 0.8) / 0.2;
  return [255, 255, Math.round(t * 255)]; // yellow → white
}

/* ---- Mel scale helpers ---- */
function hzToMel(hz: number) {
  return 2595 * Math.log10(1 + hz / 700);
}

function melToHz(mel: number) {
  return 700 * (10 ** (mel / 2595) - 1);
}

/** Map pixel row (0=top=high freq, height-1=bottom=low freq) to FFT bin */
function rowTobin(row: number, canvasHeight: number, fftSize: number, sampleRate: number) {
  const maxFreq = sampleRate / 2;
  const melMax = hzToMel(maxFreq);
  const melMin = hzToMel(60); // cut below 60 Hz
  // row 0 = top = high freq
  const mel = melMax - ((row / canvasHeight) * (melMax - melMin));
  const hz = melToHz(mel);
  return Math.round((hz / maxFreq) * (fftSize / 2));
}

export function Spectrogram({
  stream,
  audioBuffer,
  label,
  placeholder = "No audio yet",
  className = "",
}: SpectrogramProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const columnRef = useRef(0);

  /* ---- Static render from AudioBuffer ---- */
  const renderStatic = useCallback((buffer: AudioBuffer) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = Math.round(rect.width * dpr);
    const h = Math.round(rect.height * dpr);
    canvas.width = w;
    canvas.height = h;

    // Offline analysis
    const offCtx = new OfflineAudioContext(1, buffer.length, buffer.sampleRate);
    const source = offCtx.createBufferSource();
    source.buffer = buffer;
    const analyser = offCtx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.3;
    source.connect(analyser);
    analyser.connect(offCtx.destination);
    source.start();

    offCtx.startRendering().then(() => {
      // We can't use the analyser after offline rendering, so do a manual STFT
      const raw = buffer.getChannelData(0);
      const fftSize = 2048;
      const hopSize = Math.max(1, Math.floor(raw.length / w));
      const imgData = ctx.createImageData(w, h);

      for (let col = 0; col < w; col++) {
        const start = col * hopSize;
        // Simple magnitude spectrum via DFT approximation using overlapping windows
        const frame = new Float32Array(fftSize);
        for (let i = 0; i < fftSize && start + i < raw.length; i++) {
          // Hann window
          frame[i] = raw[start + i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (fftSize - 1)));
        }
        // Compute magnitude spectrum (only need first half)
        const halfBins = fftSize / 2;
        const magnitudes = new Float32Array(halfBins);
        for (let k = 0; k < halfBins; k++) {
          let re = 0, im = 0;
          for (let n = 0; n < fftSize; n++) {
            const angle = (2 * Math.PI * k * n) / fftSize;
            re += frame[n] * Math.cos(angle);
            im -= frame[n] * Math.sin(angle);
          }
          magnitudes[k] = Math.sqrt(re * re + im * im);
        }

        // Map to canvas rows using Mel scale
        for (let row = 0; row < h; row++) {
          const bin = rowTobin(row, h, fftSize, buffer.sampleRate);
          const clampedBin = Math.min(bin, halfBins - 1);
          // dB scale: -80 dB floor
          const mag = magnitudes[clampedBin] || 0.00001;
          const dB = 20 * Math.log10(mag / fftSize);
          const norm = Math.max(0, Math.min(1, (dB + 80) / 80));
          const [r, g, b] = heatColor(norm);
          const idx = (row * w + col) * 4;
          imgData.data[idx] = r;
          imgData.data[idx + 1] = g;
          imgData.data[idx + 2] = b;
          imgData.data[idx + 3] = 255;
        }
      }

      ctx.putImageData(imgData, 0, 0);
    });
  }, []);

  /* ---- Live scrolling render from MediaStream ---- */
  useEffect(() => {
    if (!stream) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const audioCtx = new AudioContext();
    ctxRef.current = audioCtx;
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.3;
    analyserRef.current = analyser;

    const src = audioCtx.createMediaStreamSource(stream);
    src.connect(analyser);

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    columnRef.current = 0;

    const freqData = new Uint8Array(analyser.frequencyBinCount);
    const ctx2d = canvas.getContext("2d")!;
    const h = canvas.height;
    const w = canvas.width;

    const draw = () => {
      analyser.getByteFrequencyData(freqData);

      // Shift existing image left by 1 pixel
      const existing = ctx2d.getImageData(1, 0, w - 1, h);
      ctx2d.putImageData(existing, 0, 0);

      // Draw new column at the right edge
      for (let row = 0; row < h; row++) {
        const bin = rowTobin(row, h, analyser.fftSize, audioCtx.sampleRate);
        const clampedBin = Math.min(bin, freqData.length - 1);
        const norm = freqData[clampedBin] / 255;
        const [r, g, b] = heatColor(norm);
        ctx2d.fillStyle = `rgb(${r},${g},${b})`;
        ctx2d.fillRect(w - 1, row, 1, 1);
      }

      columnRef.current++;
      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      src.disconnect();
      if (audioCtx.state !== "closed") audioCtx.close();
    };
  }, [stream]);

  /* ---- Static buffer render trigger ---- */
  useEffect(() => {
    if (audioBuffer) {
      renderStatic(audioBuffer);
    }
  }, [audioBuffer, renderStatic]);

  const hasContent = !!stream || !!audioBuffer;

  return (
    <div className={`${styles.container} ${className}`}>
      {label && <span className={styles.label}>{label}</span>}
      {hasContent ? (
        <>
          <canvas ref={canvasRef} className={styles.canvas} />
          <span className={`${styles.axisLabel} ${styles.axisHigh}`}>high</span>
          <span className={`${styles.axisLabel} ${styles.axisLow}`}>low</span>
        </>
      ) : (
        <div className={styles.empty}>{placeholder}</div>
      )}
    </div>
  );
}
