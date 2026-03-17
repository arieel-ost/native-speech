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
  /** Playback progress 0→1 — shows a vertical cursor */
  playbackProgress?: number | null;
  /**
   * When set with `stream`, switches live mode to progressive fill (left→right)
   * instead of scrolling.  The canvas width maps to this many seconds, so the
   * user spectrogram and the reference share the same time-scale.
   */
  maxDuration?: number | null;
}

export function Spectrogram({
  stream,
  audioBuffer,
  label,
  placeholder = "No audio yet",
  className = "",
  playbackProgress,
  maxDuration,
}: SpectrogramProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const columnRef = useRef(0);
  const [rendering, setRendering] = useState(false);
  const [liveProgress, setLiveProgress] = useState<number | null>(null);

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

  /* ---- Live render from MediaStream ---- */
  /*
   * Two modes:
   *   1. Scrolling (default) — new column at right edge, shifts left.
   *   2. Progressive fill — when `maxDuration` is set, draws left→right so the
   *      canvas maps to the same time-scale as the reference spectrogram.
   */
  useEffect(() => {
    if (!stream) {
      setLiveProgress(null);
      return;
    }

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

    const progressive = maxDuration != null && maxDuration > 0;
    const startTime = performance.now();
    const totalMs = (maxDuration ?? 1) * 1000;
    let lastCol = -1;

    const draw = () => {
      analyser.getByteFrequencyData(freqData);

      if (progressive) {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(1, elapsed / totalMs);
        const col = Math.min(Math.floor(progress * w), w - 1);

        // Draw all columns from lastCol+1 to col (in case we skipped frames)
        for (let c = lastCol + 1; c <= col; c++) {
          for (let row = 0; row < h; row++) {
            const bin = rowToBin(row, h, analyser.fftSize, audioCtx.sampleRate);
            const clampedBin = Math.min(bin, freqData.length - 1);
            const norm = freqData[clampedBin] / 255;
            const [r, g, b] = heatColor(norm);
            ctx2d.fillStyle = `rgb(${r},${g},${b})`;
            ctx2d.fillRect(c, row, 1, 1);
          }
        }
        lastCol = col;
        setLiveProgress(progress);
      } else {
        // Original scrolling mode
        const existing = ctx2d.getImageData(1, 0, w - 1, h);
        ctx2d.putImageData(existing, 0, 0);

        for (let row = 0; row < h; row++) {
          const bin = rowToBin(row, h, analyser.fftSize, audioCtx.sampleRate);
          const clampedBin = Math.min(bin, freqData.length - 1);
          const norm = freqData[clampedBin] / 255;
          const [r, g, b] = heatColor(norm);
          ctx2d.fillStyle = `rgb(${r},${g},${b})`;
          ctx2d.fillRect(w - 1, row, 1, 1);
        }
      }

      columnRef.current++;
      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      setLiveProgress(null);
      src.disconnect();
      if (audioCtx.state !== "closed") audioCtx.close();
    };
  }, [stream, maxDuration]);

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
          {(playbackProgress ?? liveProgress) != null && (
            <div
              className={styles.playbackCursor}
              style={{ left: `${((playbackProgress ?? liveProgress)!) * 100}%` }}
            />
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
