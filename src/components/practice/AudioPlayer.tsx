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

const BARS = 80;

export function AudioPlayer({ src }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progressParentRef = useRef<HTMLDivElement>(null);
  const rafId = useRef<number | null>(null);
  
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [waveform, setWaveform] = useState<number[] | null>(null);
  const [loadingAudio, setLoadingAudio] = useState(false);

  // 1. Generate static waveform timeline of the ENTIRE recorded file
  useEffect(() => {
    let active = true;
    const fetchAudioData = async () => {
      try {
        setLoadingAudio(true);
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContext();
        
        // Fetch the blob URL data
        const response = await fetch(src);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        
        if (!active) return;
        
        const rawData = audioBuffer.getChannelData(0);
        const blockSize = Math.floor(rawData.length / BARS);
        const filteredData = [];
        
        for (let i = 0; i < BARS; i++) {
          let blockStart = blockSize * i;
          let sum = 0;
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(rawData[blockStart + j]);
          }
          // Calculate average amplitude of this block and amplify it for UI clarity
          filteredData.push((sum / blockSize) * 3.5);
        }
        
        setWaveform(filteredData);
      } catch (err) {
        console.error("Failed to generate waveform map", err);
      } finally {
        if (active) setLoadingAudio(false);
      }
    };
    
    if (src) fetchAudioData();
    return () => { active = false; };
  }, [src]);

  // 2. Audio HTML elements bindings
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoaded = () => {
      setDuration(audio.duration);
      setCurrentTime(audio.currentTime);
    };
    const onEnded = () => {
      setPlaying(false);
      audio.currentTime = 0;
      setCurrentTime(0);
    };

    // We do NOT use 'timeupdate' for the cursor – it's too jumpy (4 ticks per sec).
    // The cursor is updated at 60fps in the visualizer loop below!
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("ended", onEnded);
    };
  }, [src]);

  // 3. Smooth 60fps playback tracking
  const updateProgress = useCallback(() => {
    if (audioRef.current && playing) {
      setCurrentTime(audioRef.current.currentTime);
      rafId.current = requestAnimationFrame(updateProgress);
    }
  }, [playing]);

  useEffect(() => {
    if (playing) {
      rafId.current = requestAnimationFrame(updateProgress);
    } else {
      if (rafId.current) cancelAnimationFrame(rafId.current);
      // Ensure we have exact time when paused
      if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
    }
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [playing, updateProgress]);

  // 4. Premium Canvas Drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !waveform) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    // Support High-DPI screens
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    }
    
    const width = rect.width;
    const height = rect.height;
    ctx.clearRect(0, 0, width, height);

    const barWidth = width / BARS;
    const gap = Math.min(2, barWidth * 0.2); // Small gap between bars
    const actualBarWidth = barWidth - gap;
    
    const pctPlayed = duration ? currentTime / duration : 0;
    const splitIndex = BARS * pctPlayed;

    // Create premium gradients
    const playedGradient = ctx.createLinearGradient(0, 0, width, 0);
    playedGradient.addColorStop(0, "#818cf8"); // Lighter dynamic brand
    playedGradient.addColorStop(1, "#4338ca"); // Deeper brand
    
    const unplayedGradient = ctx.createLinearGradient(0, 0, width, 0);
    unplayedGradient.addColorStop(0, "#9ca3af");
    unplayedGradient.addColorStop(1, "#d1d5db");

    for (let i = 0; i < BARS; i++) {
      let amplitude = Math.max(0.05, Math.min(1.0, waveform[i])); // Min 5% height, max 100%
      const barHeight = amplitude * height;
      const x = i * barWidth;
      const y = (height - barHeight) / 2; // Vertically center the waveform
      
      // Determine if this bar is mathematically "played"
      ctx.fillStyle = i < splitIndex ? playedGradient : unplayedGradient;
      
      // Draw capsule bars
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(x, y, actualBarWidth, barHeight, actualBarWidth / 2);
      } else {
        ctx.rect(x, y, actualBarWidth, barHeight);
      }
      ctx.fill();
    }
  }, [waveform, currentTime, duration]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    if (playing) {
      audio.pause();
    } else {
      audio.play().catch(e => console.error("Playback failed", e));
    }
    setPlaying(!playing);
  }, [playing]);

  // Instant seeking with fast-click tolerance
  const seek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const parent = progressParentRef.current;
    if (!audio || !parent || !duration) return;
    
    const rect = parent.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = pct * duration;
    
    // Update both instantly to prevent UI jumpiness/lag
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  }, [duration]);

  const pct = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className={styles.player}>
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
        {loadingAudio ? (
          <div className={styles.loading}>Decoding audio...</div>
        ) : (
          <canvas ref={canvasRef} className={styles.canvas} />
        )}
        <div className={styles.progressOverlay}>
           <div className={styles.progressFillLine} style={{ width: `${pct}%` }} />
        </div>
      </div>

      <span className={styles.time}>{formatTime(duration)}</span>
    </div>
  );
}
