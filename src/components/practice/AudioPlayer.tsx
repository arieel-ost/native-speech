"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import styles from "./AudioPlayer.module.css";

interface AudioPlayerProps {
  src: string;
}

function formatTime(seconds: number) {
  if (!seconds || isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const BARS = 80;

export function AudioPlayer({ src }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progressParentRef = useRef<HTMLDivElement>(null);
  const timeCurrentRef = useRef<HTMLSpanElement>(null);
  const timeDurationRef = useRef<HTMLSpanElement>(null);
  
  const [playing, setPlaying] = useState(false);
  const [waveform, setWaveform] = useState<number[] | null>(null);
  const [loadingAudio, setLoadingAudio] = useState(false);

  // Web Audio instances
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const rafId = useRef<number | null>(null);

  // 1. Generate static waveform array representation
  useEffect(() => {
    let active = true;
    const fetchAudioData = async () => {
      try {
        setLoadingAudio(true);
        const AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
        const ctx = new AudioContext();
        
        const response = await fetch(src);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        
        if (!active) return;
        
        const rawData = audioBuffer.getChannelData(0);
        const blockSize = Math.floor(rawData.length / BARS);
        const filteredData = [];
        
        for (let i = 0; i < BARS; i++) {
          const blockStart = blockSize * i;
          let sum = 0;
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(rawData[blockStart + j]);
          }
          filteredData.push((sum / blockSize) * 3.5); // Amplify for aesthetics
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

  // 2. Safely initialize Web Audio API
  const initAudio = () => {
    if (audioCtxRef.current || !audioRef.current) return;
    
    const AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 64; // Low bin count produces chunky, cool EQ bars
    analyser.smoothingTimeConstant = 0.8;
    analyserRef.current = analyser;

    // Prevent InvalidStateError in strict mode double-invocations
    if (!sourceRef.current) {
        sourceRef.current = ctx.createMediaElementSource(audioRef.current);
        sourceRef.current.connect(analyser);
        analyser.connect(ctx.destination);
    }
  };

  // 3. Ultra-smooth 60fps decoupled rendering loop
  const draw = useCallback(() => {
    rafId.current = requestAnimationFrame(draw);
    
    if (!canvasRef.current || !audioRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    // Scale for high-DPI displays safely
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    }
    
    const width = rect.width;
    const height = rect.height;
    ctx.clearRect(0, 0, width, height);

    const duration = audioRef.current.duration || 1;
    const currentTime = audioRef.current.currentTime || 0;
    
    // Update direct DOM time nodes without triggering heavy React re-renders
    if (timeCurrentRef.current) timeCurrentRef.current.textContent = formatTime(currentTime);
    if (timeDurationRef.current && audioRef.current.duration) {
      timeDurationRef.current.textContent = formatTime(audioRef.current.duration);
    }

    const pctPlayed = duration ? currentTime / duration : 0;
    const splitX = width * pctPlayed;

    // A. Draw Dancing Spectrum Analyzer in the Background
    if (analyserRef.current && !audioRef.current.paused) {
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyserRef.current.getByteFrequencyData(dataArray);

      const eqBarWidth = width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const eqBarHeight = (dataArray[i] / 255) * height * 0.9;
        
        // Heatmap colors based on frequency index
        const r = eqBarHeight + (25 * (i / bufferLength));
        const g = 250 * (i / bufferLength);
        const b = 250;
        
        ctx.fillStyle = `rgba(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)}, 0.25)`;
        ctx.fillRect(x, height - eqBarHeight, eqBarWidth - 1, eqBarHeight);
        
        x += eqBarWidth;
      }
    }

    // B. Draw Static Waveform Timeline Overlay
    if (waveform) {
      const barWidth = width / BARS;
      const gap = Math.min(2, barWidth * 0.2); 
      const actualBarWidth = barWidth - gap;
      
      const splitIndex = BARS * pctPlayed;

      const playedGradient = ctx.createLinearGradient(0, 0, width, 0);
      playedGradient.addColorStop(0, "#818cf8"); 
      playedGradient.addColorStop(1, "#4338ca"); 
      
      const unplayedGradient = ctx.createLinearGradient(0, 0, width, 0);
      unplayedGradient.addColorStop(0, "#9ca3af");
      unplayedGradient.addColorStop(1, "#d1d5db");

      for (let i = 0; i < BARS; i++) {
        const amplitude = Math.max(0.05, Math.min(1.0, waveform[i])); 
        const waveBarHeight = amplitude * height;
        const x = i * barWidth;
        const y = (height - waveBarHeight) / 2;
        
        ctx.fillStyle = i < splitIndex ? playedGradient : unplayedGradient;
        
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(x, y, actualBarWidth, waveBarHeight, actualBarWidth / 2);
        } else {
          ctx.rect(x, y, actualBarWidth, waveBarHeight);
        }
        ctx.fill();
      }
    }

    // C. Draw Playhead & Played Overlay
    ctx.fillStyle = "rgba(79, 70, 229, 0.15)";
    ctx.fillRect(0, 0, splitX, height);
    
    ctx.fillStyle = "#4F46E5";
    ctx.fillRect(splitX - 1, 0, 2, height);
    
  }, [waveform]);

  // Handle continuous animation loop
  useEffect(() => {
    rafId.current = requestAnimationFrame(draw);
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [draw]);

  // Audio HTML End Event
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnded = () => {
      setPlaying(false);
      audio.currentTime = 0;
    };
    audio.addEventListener("ended", onEnded);
    return () => audio.removeEventListener("ended", onEnded);
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    if (!audioCtxRef.current) {
       initAudio();
    }

    if (playing) {
      audio.pause();
    } else {
      if (audioCtxRef.current?.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      audio.play().catch(e => console.error("Playback failed", e));
    }
    setPlaying(!playing);
  }, [playing]);

  const seek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const parent = progressParentRef.current;
    if (!audio || !parent) return;
    
    const duration = audio.duration || 1;
    const rect = parent.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    
    // Updates audio.currentTime instantly
    audio.currentTime = pct * duration;
  }, []);

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
      <span className={styles.time} ref={timeCurrentRef}>0:00</span>
      
      <div className={styles.progressBarWrapper} ref={progressParentRef} onClick={seek}>
        {loadingAudio && <div className={styles.loading}>Decoding audio...</div>}
        <canvas ref={canvasRef} className={styles.canvas} />
      </div>

      <span className={styles.time} ref={timeDurationRef}>0:00</span>
    </div>
  );
}
