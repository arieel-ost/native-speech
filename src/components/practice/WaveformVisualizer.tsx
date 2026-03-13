"use client";

import { useRef, useEffect } from "react";
import styles from "./WaveformVisualizer.module.css";

interface WaveformVisualizerProps {
  waveformData: Float32Array | null;
  rmsLevel: number;
  isRecording: boolean;
}

export function WaveformVisualizer({ waveformData, rmsLevel, isRecording }: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !waveformData || !isRecording) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const centerY = height / 2;

    ctx.clearRect(0, 0, width, height);

    // Draw waveform
    ctx.beginPath();
    ctx.strokeStyle = rmsLevel > 0.02
      ? "rgba(99, 102, 241, 0.8)"  // primary color when speaking
      : "rgba(99, 102, 241, 0.3)"; // dimmed when silent
    ctx.lineWidth = 2;

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
  }, [waveformData, rmsLevel, isRecording]);

  if (!isRecording) return null;

  return (
    <div className={styles.container}>
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  );
}
