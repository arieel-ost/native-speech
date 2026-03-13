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
  
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [waveform, setWaveform] = useState<number[] | null>(null);
  const [loadingAudio, setLoadingAudio] = useState(false);

  // Audio loading & generation of waveform
  useEffect(() => {
    let active = true;
    const fetchAudioData = async () => {
      try {
        setLoadingAudio(true);
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContext();
        const response = await fetch(src);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        
        if (!active) return;
        
        const rawData = audioBuffer.getChannelData(0); // Only use first channel
        const samples = BARS;
        const blockSize = Math.floor(rawData.length / samples);
        const filteredData = [];
        
        for (let i = 0; i < samples; i++) {
          let blockStart = blockSize * i;
          let sum = 0;
          for (let j = 0; j < blockSize; j++) {
            sum = sum + Math.abs(rawData[blockStart + j]);
          }
          // Calculate average amplitude of this block and amplify it a bit for visual clarity
          filteredData.push((sum / blockSize) * 2.5);
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

  // Audio HTML elements bindings
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoaded = () => setDuration(audio.duration);
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onEnded = () => setPlaying(false);

    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
    };
  }, [src]);

  // Canvas drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !waveform) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    // Scale canvas for high DPI
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    
    const width = rect.width;
    const height = rect.height;
    
    ctx.clearRect(0, 0, width, height);

    const barWidth = width / BARS;
    const gap = Math.min(2, barWidth * 0.2); // Small gap between bars
    const actualBarWidth = barWidth - gap;
    
    // Percentage played
    const pctPlayed = duration ? currentTime / duration : 0;
    const splitIndex = Math.floor(BARS * pctPlayed);

    for (let i = 0; i < BARS; i++) {
      let amplitude = Math.max(0.05, Math.min(1.0, waveform[i])); // Min 5% height, max 100%
      const barHeight = amplitude * height;
      const x = i * barWidth;
      const y = (height - barHeight) / 2; // Center vertically
      
      // Determine if this bar is "played"
      if (i < splitIndex) {
        ctx.fillStyle = "#4F46E5"; // Primary brand color
      } else {
        ctx.fillStyle = "#9ca3af"; // Muted gray
      }
      
      // Draw rounded rectangle
      ctx.beginPath();
      // Using roundRect if supported, otherwise standard rect
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
      audio.play();
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
      
      <div className={styles.progressBar} ref={progressParentRef} onClick={seek}>
        {loadingAudio ? (
          <div className={styles.loading}>Loading map...</div>
        ) : (
          <canvas ref={canvasRef} className={styles.canvas} />
        )}
      </div>

      <span className={styles.time}>{formatTime(duration)}</span>
    </div>
  );
}
