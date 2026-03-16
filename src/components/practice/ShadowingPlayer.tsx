"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import styles from "./ShadowingPlayer.module.css";

type Phase = "idle" | "listening" | "recording" | "shadowing_listen" | "shadowing_record";

interface ShadowingPlayerProps {
  /** The text to speak via TTS */
  text: string;
  /** BCP-47 language tag for TTS voice (e.g. "en-US", "de-DE") */
  lang: string;
  /** Path to a pre-recorded phoneme audio file (e.g. /audio/phonemes/th_voiceless.mp3) */
  phonemeAudioSrc?: string | null;
  /** Called when recording finishes — passes the audio blob and decoded AudioBuffer */
  onRecorded: (blob: Blob, buffer: AudioBuffer) => void;
  /** Called when live recording stream starts */
  onStreamStart?: (stream: MediaStream) => void;
  /** Called when live recording stream ends */
  onStreamEnd?: () => void;
  disabled?: boolean;
}

const SPEEDS = [0.6, 0.8, 1.0] as const;

export function ShadowingPlayer({
  text,
  lang,
  phonemeAudioSrc,
  onRecorded,
  onStreamStart,
  onStreamEnd,
  disabled = false,
}: ShadowingPlayerProps) {
  const t = useTranslations("ShadowingPlayer");
  const [phase, setPhase] = useState<Phase>("idle");
  const [speed, setSpeed] = useState<number>(1.0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  /** Duration of the last reference playback in ms — used for shadow auto-stop */
  const lastRefDurationRef = useRef<number>(2000);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioElRef.current) {
        audioElRef.current.pause();
        audioElRef.current = null;
      }
      window.speechSynthesis.cancel();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  /** Play reference audio — uses pre-recorded file if available, falls back to TTS */
  const playReference = useCallback(
    (playbackSpeed: number): Promise<void> => {
      const start = Date.now();
      if (phonemeAudioSrc) {
        return new Promise((resolve, reject) => {
          const audio = new Audio(phonemeAudioSrc);
          audio.playbackRate = playbackSpeed;
          audioElRef.current = audio;
          audio.onended = () => {
            lastRefDurationRef.current = Date.now() - start;
            resolve();
          };
          audio.onerror = () => reject(new Error("Failed to play reference audio"));
          audio.play().catch(reject);
        });
      }
      // Fallback to browser TTS for words/phrases without a phoneme audio file
      return new Promise((resolve, reject) => {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = playbackSpeed;
        utterance.pitch = 1;
        utterance.onend = () => {
          lastRefDurationRef.current = Date.now() - start;
          resolve();
        };
        utterance.onerror = (e) => {
          if (e.error === "canceled") resolve();
          else reject(e);
        };
        window.speechSynthesis.speak(utterance);
      });
    },
    [phonemeAudioSrc, text, lang],
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

  /** Listen to reference audio */
  const handleListen = useCallback(async () => {
    setPhase("listening");
    try {
      await playReference(speed);
    } catch {
      // playback error — ignore
    }
    setPhase("idle");
  }, [speed, playReference]);

  /** Record user's pronunciation */
  const handleRecord = useCallback(async () => {
    if (phase === "recording") {
      stopRecording();
      return;
    }
    setPhase("recording");
    const result = await startRecording();
    onRecorded(result.blob, result.buffer);
    setPhase("idle");
  }, [phase, startRecording, stopRecording, onRecorded]);

  /** Shadowing: listen then immediately record */
  const handleShadow = useCallback(async () => {
    if (phase !== "idle") return;

    // Phase 1: Listen to reference
    setPhase("shadowing_listen");
    try {
      await playReference(speed);
    } catch {
      setPhase("idle");
      return;
    }

    // Short pause
    await new Promise((r) => setTimeout(r, 500));

    // Phase 2: Record user — auto-stop based on actual reference duration
    setPhase("shadowing_record");
    const recordPromise = startRecording();

    const autoStopMs = Math.max(2000, Math.round(lastRefDurationRef.current * 1.5) + 1000);
    setTimeout(() => {
      stopRecording();
    }, autoStopMs);

    const result = await recordPromise;
    onRecorded(result.blob, result.buffer);
    setPhase("idle");
  }, [phase, speed, playReference, startRecording, stopRecording, onRecorded]);

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
    phaseText = t("phaseListening");
    phaseClass = styles.phaseListening;
  } else if (phase === "recording") {
    phaseText = t("phaseRecording");
    phaseClass = styles.phaseRecording;
  } else if (phase === "shadowing_listen") {
    phaseText = t("phaseShadowListen");
    phaseClass = styles.phaseShadowing;
  } else if (phase === "shadowing_record") {
    phaseText = t("phaseShadowRepeat");
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
          {t("listen")}
        </button>

        <button
          className={`${styles.btn} ${styles.recordBtn} ${isRecording ? styles.recording : ""}`}
          onClick={handleRecordClick}
          disabled={disabled || (isBusy && !isRecording)}
        >
          <span className={styles.btnIcon}>{isRecording ? "◼" : "●"}</span>
          {isRecording ? t("stop") : t("record")}
        </button>

        <button
          className={`${styles.btn} ${styles.shadowBtn} ${phase.startsWith("shadowing") ? styles.active : ""}`}
          onClick={handleShadow}
          disabled={disabled || isBusy}
        >
          <span className={styles.btnIcon}>🔄</span>
          {t("shadow")}
        </button>
      </div>

      <div className={styles.speedControl}>
        <span>{t("speed")}</span>
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
