"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import styles from "./ShadowingPlayer.module.css";

type Phase = "idle" | "listening" | "recording" | "shadowing_listen" | "shadowing_record";

interface ShadowingPlayerProps {
  /** The text to speak via TTS */
  text: string;
  /** BCP-47 language tag for TTS voice (e.g. "en-US", "de-DE") */
  lang: string;
  /** Called when recording finishes — passes the audio blob and decoded AudioBuffer */
  onRecorded: (blob: Blob, buffer: AudioBuffer) => void;
  /** Called when TTS reference finishes generating — passes decoded AudioBuffer */
  onReferenceReady: (buffer: AudioBuffer) => void;
  /** Called when live recording stream starts */
  onStreamStart?: (stream: MediaStream) => void;
  /** Called when live recording stream ends */
  onStreamEnd?: () => void;
  /** Current phase text */
  phaseLabel?: string;
  disabled?: boolean;
}

const SPEEDS = [0.6, 0.8, 1.0] as const;

export function ShadowingPlayer({
  text,
  lang,
  onRecorded,
  onReferenceReady,
  onStreamStart,
  onStreamEnd,
  disabled = false,
}: ShadowingPlayerProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [speed, setSpeed] = useState<number>(1.0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const speakReference = useCallback(
    (playbackSpeed: number): Promise<void> => {
      return new Promise((resolve, reject) => {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = playbackSpeed;
        utterance.pitch = 1;
        synthRef.current = utterance;

        utterance.onend = () => resolve();
        utterance.onerror = (e) => {
          if (e.error === "canceled") resolve();
          else reject(e);
        };

        window.speechSynthesis.speak(utterance);
      });
    },
    [text, lang],
  );

  const startRecording = useCallback(async (): Promise<{ blob: Blob; buffer: AudioBuffer }> => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { noiseSuppression: true, autoGainControl: true, echoCancellation: true },
    });
    streamRef.current = stream;
    onStreamStart?.(stream);

    return new Promise((resolve) => {
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        onStreamEnd?.();

        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });

        // Decode to AudioBuffer for spectrogram
        const arrayBuf = await blob.arrayBuffer();
        const audioCtx = new AudioContext();
        let buffer: AudioBuffer;
        try {
          buffer = await audioCtx.decodeAudioData(arrayBuf);
        } catch {
          // If decode fails, create empty buffer
          buffer = audioCtx.createBuffer(1, audioCtx.sampleRate, audioCtx.sampleRate);
        }
        await audioCtx.close();

        resolve({ blob, buffer });
      };

      mediaRecorder.start();
    });
  }, [onStreamStart, onStreamEnd]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  /** Listen to reference TTS */
  const handleListen = useCallback(async () => {
    setPhase("listening");
    try {
      await speakReference(speed);
      // Generate a reference buffer for spectrogram
      const ctx = new AudioContext();
      const sampleRate = ctx.sampleRate;
      const duration = Math.max(1, text.split(" ").length * 0.3);
      const buffer = ctx.createBuffer(1, Math.round(sampleRate * duration), sampleRate);
      await ctx.close();
      onReferenceReady(buffer);
    } catch {
      // TTS error — ignore
    }
    setPhase("idle");
  }, [speed, speakReference, text, onReferenceReady]);

  /** Record user's pronunciation */
  const handleRecord = useCallback(async () => {
    if (phase === "recording") {
      stopRecording();
      return;
    }
    setPhase("recording");
    const result = await startRecording();

    // Return a stop function — we wait for stopRecording to be called
    // This is handled by the user clicking the button again
    // The promise resolves when mediaRecorder.onstop fires
    onRecorded(result.blob, result.buffer);
    setPhase("idle");
  }, [phase, startRecording, stopRecording, onRecorded]);

  /** Shadowing: listen then immediately record */
  const handleShadow = useCallback(async () => {
    if (phase !== "idle") return;

    // Phase 1: Listen to reference
    setPhase("shadowing_listen");
    try {
      await speakReference(speed);
    } catch {
      setPhase("idle");
      return;
    }

    // Short pause
    await new Promise((r) => setTimeout(r, 500));

    // Phase 2: Record user
    setPhase("shadowing_record");
    const recordPromise = startRecording();

    // Auto-stop after estimated duration + buffer
    const estimatedDuration = Math.max(2000, text.split(" ").length * 500);
    setTimeout(() => {
      stopRecording();
    }, estimatedDuration);

    const result = await recordPromise;
    onRecorded(result.blob, result.buffer);
    setPhase("idle");
  }, [phase, speed, speakReference, startRecording, stopRecording, text, onRecorded]);

  const handleRecordClick = () => {
    if (phase === "recording" || phase === "shadowing_record") {
      stopRecording();
    } else {
      handleRecord();
    }
  };

  const isRecording = phase === "recording" || phase === "shadowing_record";
  const isPlaying = phase === "listening" || phase === "shadowing_listen";
  const isBusy = phase !== "idle";

  let phaseText = "";
  let phaseClass = "";
  if (phase === "listening") {
    phaseText = "Listening to reference...";
    phaseClass = styles.phaseListening;
  } else if (phase === "recording") {
    phaseText = "Recording — speak now!";
    phaseClass = styles.phaseRecording;
  } else if (phase === "shadowing_listen") {
    phaseText = "Listen carefully...";
    phaseClass = styles.phaseShadowing;
  } else if (phase === "shadowing_record") {
    phaseText = "Now repeat!";
    phaseClass = styles.phaseRecording;
  }

  return (
    <div className={styles.container}>
      <div className={`${styles.phase} ${phaseClass}`}>
        {phaseText || "\u00A0"}
      </div>

      <div className={styles.controls}>
        <button
          className={`${styles.btn} ${styles.listenBtn} ${isPlaying ? styles.playing : ""}`}
          onClick={handleListen}
          disabled={disabled || isBusy}
        >
          <span className={styles.btnIcon}>{isPlaying ? "🔊" : "▶"}</span>
          Listen
        </button>

        <button
          className={`${styles.btn} ${styles.recordBtn} ${isRecording ? styles.recording : ""}`}
          onClick={handleRecordClick}
          disabled={disabled || (isBusy && !isRecording)}
        >
          <span className={styles.btnIcon}>{isRecording ? "◼" : "●"}</span>
          {isRecording ? "Stop" : "Record"}
        </button>

        <button
          className={`${styles.btn} ${styles.shadowBtn} ${phase.startsWith("shadowing") ? styles.active : ""}`}
          onClick={handleShadow}
          disabled={disabled || isBusy}
        >
          <span className={styles.btnIcon}>🔄</span>
          Shadow
        </button>
      </div>

      <div className={styles.speedControl}>
        <span>Speed:</span>
        {SPEEDS.map((s) => (
          <button
            key={s}
            className={`${styles.speedBtn} ${speed === s ? styles.speedBtnActive : ""}`}
            onClick={() => setSpeed(s)}
            disabled={isBusy}
          >
            {s}x
          </button>
        ))}
      </div>
    </div>
  );
}
