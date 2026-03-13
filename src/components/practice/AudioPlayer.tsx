"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import styles from "./AudioPlayer.module.css";

interface AudioPlayerProps {
  src: string;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function AudioPlayer({ src }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progressParentRef = useRef<HTMLDivElement>(null);
  
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Web Audio logic
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const rafId = useRef<number | null>(null);

  const initAudio = () => {
    if (audioCtxRef.current || !audioRef.current) return;
    
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;
    analyserRef.current = analyser;

    const source = ctx.createMediaElementSource(audioRef.current);
    sourceRef.current = source;

    source.connect(analyser);
    analyser.connect(ctx.destination);
  };

  const drawVisualizer = useCallback(function draw() {
    if (!analyserRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    // Only resize if needed
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    }

    const width = rect.width;
    const height = rect.height;
    
    ctx.clearRect(0, 0, width, height);

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Draw Frequency Bars
    const barWidth = (width / bufferLength) * 2.5;
    let barHeight;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      barHeight = (dataArray[i] / 255) * height;

      // Color gradient based on frequency
      const r = barHeight + (25 * (i / bufferLength));
      const g = 250 * (i / bufferLength);
      const b = 250;

      ctx.fillStyle = `rgba(${r},${g},${b}, 0.8)`;
      
      // Draw from bottom up
      ctx.beginPath();
      if (ctx.roundRect) {
         ctx.roundRect(x, height - barHeight, barWidth - 1, barHeight, 2);
      } else {
         ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);
      }
      ctx.fill();

      x += barWidth;
    }

    rafId.current = requestAnimationFrame(draw);
  }, []);

  // Audio HTML elements bindings
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoaded = () => setDuration(audio.duration);
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onEnded = () => {
      setPlaying(false);
      audio.currentTime = 0; // return to start
    };

    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
    };
  }, [src]);

  // Start/stop visualizer loop
  useEffect(() => {
    if (playing) {
      if (audioCtxRef.current?.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      rafId.current = requestAnimationFrame(drawVisualizer);
    } else {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    }
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [playing, drawVisualizer]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    // Initialize Web Audio API on first play (requires user gesture)
    if (!audioCtxRef.current) {
       initAudio();
    }

    if (playing) {
      audio.pause();
    } else {
      audio.play().catch(e => console.error("Playback failed", e));
    }
    setPlaying(!playing);
  }, [playing]);

  const seek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const parent = progressParentRef.current;
    if (!audio || !parent || !duration) return;
    
    const rect = parent.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = pct * duration;
    setCurrentTime(audio.currentTime);
  }, [duration]);

  const pct = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className={styles.player}>
      {/* Intentionally without crossOrigin property so we don't encounter CORS errors with local blobs */}
      <audio ref={audioRef} src={src} preload="metadata" />
      <button
        className={styles.playBtn}
        onClick={togglePlay}
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing ? (
          <svg viewBox="0 0 24 24" className={styles.icon}>
            <rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" />
            <rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className={styles.icon}>
            <path d="M8 5v14l11-7z" fill="currentColor" />
          </svg>
        )}
      </button>
      <span className={styles.time}>{formatTime(currentTime)}</span>
      
      <div className={styles.progressBarWrapper} ref={progressParentRef} onClick={seek}>
        <canvas ref={canvasRef} className={styles.canvas} />
        {/* Playback progress overlay layout */}
        <div className={styles.progressOverlay}>
           <div className={styles.progressFillLine} style={{ width: `${pct}%` }} />
        </div>
      </div>

      <span className={styles.time}>{formatTime(duration)}</span>
    </div>
  );
}
