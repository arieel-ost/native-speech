"use client";

import { useEffect, useRef } from "react";
import styles from "./BreathingBackground.module.css";

interface BreathingBackgroundProps {
  rmsLevel: number;
  isRecording: boolean;
}

// Smooth interpolation target to avoid jitter
function lerp(current: number, target: number, speed: number) {
  return current + (target - current) * speed;
}

export function BreathingBackground({ rmsLevel, isRecording }: BreathingBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const smoothedRef = useRef(0);
  const timeRef = useRef(0);
  const rmsRef = useRef(0);

  // Keep rmsLevel in a ref so the animation loop reads the latest value
  rmsRef.current = rmsLevel;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isRecording) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Size the canvas to fill its container
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    smoothedRef.current = 0;
    timeRef.current = 0;
    let lastTime = performance.now();

    const draw = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      timeRef.current += dt;
      const t = timeRef.current;

      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      const cx = w / 2;
      const cy = h / 2;

      // Smooth the RMS to avoid jittery visuals
      smoothedRef.current = lerp(smoothedRef.current, rmsRef.current, 0.12);
      const amp = Math.min(smoothedRef.current * 5, 1); // normalize roughly to 0-1

      ctx.clearRect(0, 0, w, h);

      // Layer 1: deep slow pulse (indigo) — always breathes gently
      const baseBreath = 0.3 + Math.sin(t * 0.8) * 0.1;
      const r1 = 60 + (baseBreath + amp * 0.5) * 80;
      const g1 = ctx.createRadialGradient(cx, cy, 0, cx, cy, r1);
      g1.addColorStop(0, `rgba(99, 102, 241, ${0.15 + amp * 0.2})`);
      g1.addColorStop(0.6, `rgba(99, 102, 241, ${0.05 + amp * 0.08})`);
      g1.addColorStop(1, "rgba(99, 102, 241, 0)");
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, w, h);

      // Layer 2: mid pulse (violet) — offset phase
      const midBreath = 0.3 + Math.sin(t * 1.2 + 1.5) * 0.1;
      const r2 = 45 + (midBreath + amp * 0.4) * 65;
      const g2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, r2);
      g2.addColorStop(0, `rgba(139, 92, 246, ${0.1 + amp * 0.18})`);
      g2.addColorStop(0.5, `rgba(139, 92, 246, ${0.03 + amp * 0.06})`);
      g2.addColorStop(1, "rgba(139, 92, 246, 0)");
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, w, h);

      // Layer 3: hot core (warm accent) — reacts strongest to voice
      const coreBreath = 0.2 + Math.sin(t * 1.6 + 3) * 0.08;
      const r3 = 25 + (coreBreath + amp * 0.6) * 40;
      const g3 = ctx.createRadialGradient(cx, cy, 0, cx, cy, r3);
      g3.addColorStop(0, `rgba(245, 158, 11, ${amp * 0.2})`);
      g3.addColorStop(0.4, `rgba(245, 158, 11, ${amp * 0.06})`);
      g3.addColorStop(1, "rgba(245, 158, 11, 0)");
      ctx.fillStyle = g3;
      ctx.fillRect(0, 0, w, h);

      // Layer 4: expanding ring that pulses outward with amplitude peaks
      if (amp > 0.15) {
        const ringPhase = (t * 2) % 1; // repeating 0-1 cycle
        const ringR = 50 + ringPhase * 80;
        const ringAlpha = (1 - ringPhase) * amp * 0.15;
        ctx.beginPath();
        ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(129, 140, 248, ${ringAlpha})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [isRecording]);

  if (!isRecording) return null;

  return <canvas ref={canvasRef} className={styles.canvas} />;
}
