"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import {
  FFT_SIZE,
  SMOOTHING,
  heatColor,
  rowToBin,
} from "@/lib/spectrogram-utils";
import type { SpectrogramWorkerInput } from "@/workers/spectrogram.worker";
import styles from "./Spectrogram.module.css";

/**
 * Renders a scrolling spectrogram from either a live MediaStream or a static AudioBuffer.
 *
 * - Live mode: pass `stream` — draws a real-time scrolling spectrogram.
 * - Static mode: pass `audioBuffer` — delegates FFT to a Web Worker (non-blocking).
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

export function Spectrogram({
  stream,
  audioBuffer,
  label,
  placeholder = "No audio yet",
  className = "",
}: SpectrogramProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const columnRef = useRef(0);
  const [rendering, setRendering] = useState(false);

  // Cleanup worker on unmount
  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  /* ---- Static render via Web Worker ---- */
  const renderStatic = useCallback((buffer: AudioBuffer) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = Math.round(rect.width * dpr);
    const h = Math.round(rect.height * dpr);
    canvas.width = w;
    canvas.height = h;

    setRendering(true);

    // Lazy-init worker
    if (!workerRef.current) {
      workerRef.current = new Worker(
        new URL("../../workers/spectrogram.worker.ts", import.meta.url),
      );
    }

    const worker = workerRef.current;
    const samples = buffer.getChannelData(0);

    worker.onmessage = (e) => {
      const { pixels, width, height } = e.data;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const imgData = new ImageData(pixels, width, height);
        canvas.width = width;
        canvas.height = height;
        ctx.putImageData(imgData, 0, 0);
      }
      setRendering(false);
    };

    const msg: SpectrogramWorkerInput = {
      samples: samples.slice(), // copy — transferable would neuter the original
      sampleRate: buffer.sampleRate,
      width: w,
      height: h,
    };
    worker.postMessage(msg);
  }, []);

  /* ---- Live scrolling render from MediaStream ---- */
  useEffect(() => {
    if (!stream) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const audioCtx = new AudioContext();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = FFT_SIZE;
    analyser.smoothingTimeConstant = SMOOTHING;

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
        const bin = rowToBin(row, h, analyser.fftSize, audioCtx.sampleRate);
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
          {rendering && (
            <div className={styles.rendering}>Rendering...</div>
          )}
          <span className={`${styles.axisLabel} ${styles.axisHigh}`}>high</span>
          <span className={`${styles.axisLabel} ${styles.axisLow}`}>low</span>
        </>
      ) : (
        <div className={styles.empty}>{placeholder}</div>
      )}
    </div>
  );
}
