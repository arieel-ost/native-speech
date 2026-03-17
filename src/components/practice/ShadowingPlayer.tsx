"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import styles from "./ShadowingPlayer.module.css";

type Phase = "idle" | "listening" | "recording" | "listen_repeat_listen" | "listen_repeat_record" | "countdown" | "shadowing";

/** Buffer added after reference duration before auto-stopping recording (seconds) */
const AUTO_STOP_BUFFER = 0.5;

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
  /** Called with reference playback progress (0→1), null when not playing */
  onRefProgress?: (progress: number | null) => void;
  /**
   * Reference audio duration in seconds. When set, all recording modes
   * auto-stop after this + 0.5s buffer so spectrograms align for overlay.
   */
  maxRecordDuration?: number | null;
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
  onRefProgress,
  maxRecordDuration,
  disabled = false,
}: ShadowingPlayerProps) {
  const t = useTranslations("ShadowingPlayer");
  const [phase, setPhase] = useState<Phase>("idle");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [speed, setSpeed] = useState<number>(1.0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const autoStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (autoStopTimerRef.current) clearTimeout(autoStopTimerRef.current);
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

  /** Stop tracking reference playback progress */
  const stopProgressTracking = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    onRefProgress?.(null);
  }, [onRefProgress]);

  /** Play reference audio — uses pre-recorded file if available, falls back to TTS */
  const playReference = useCallback(
    (playbackSpeed: number): Promise<void> => {
      if (phonemeAudioSrc) {
        return new Promise((resolve, reject) => {
          const audio = new Audio(phonemeAudioSrc);
          audio.playbackRate = playbackSpeed;
          audioElRef.current = audio;

          // Track playback progress via rAF
          const trackProgress = () => {
            if (audio.duration && isFinite(audio.duration)) {
              onRefProgress?.(audio.currentTime / audio.duration);
            }
            rafRef.current = requestAnimationFrame(trackProgress);
          };

          audio.onplay = () => {
            rafRef.current = requestAnimationFrame(trackProgress);
          };
          audio.onended = () => {
            stopProgressTracking();
            resolve();
          };
          audio.onerror = () => {
            stopProgressTracking();
            reject(new Error("Failed to play reference audio"));
          };
          audio.play().catch((err) => {
            stopProgressTracking();
            reject(err);
          });
        });
      }
      // Fallback to browser TTS for words/phrases without a phoneme audio file
      return new Promise((resolve, reject) => {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = playbackSpeed;
        utterance.pitch = 1;
        utterance.onend = () => resolve();
        utterance.onerror = (e) => {
          if (e.error === "canceled") resolve();
          else reject(e);
        };
        window.speechSynthesis.speak(utterance);
      });
    },
    [phonemeAudioSrc, text, lang, onRefProgress, stopProgressTracking],
  );

  const startRecording = useCallback(async (opts?: { disableEchoCancellation?: boolean }): Promise<{ blob: Blob; buffer: AudioBuffer }> => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        noiseSuppression: true,
        autoGainControl: true,
        // Disable echo cancellation when recording alongside reference playback
        // (shadow mode). Even with headphones, the browser uses the OS audio
        // output stream as a reference signal and suppresses correlated input —
        // which is exactly the user's voice during shadowing.
        echoCancellation: !opts?.disableEchoCancellation,
      },
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
    if (autoStopTimerRef.current) {
      clearTimeout(autoStopTimerRef.current);
      autoStopTimerRef.current = null;
    }
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  /** Start recording with auto-stop after refDuration + buffer */
  const startRecordingWithAutoStop = useCallback(async (opts?: { disableEchoCancellation?: boolean }): Promise<{ blob: Blob; buffer: AudioBuffer }> => {
    const recordPromise = startRecording(opts);

    if (maxRecordDuration != null && maxRecordDuration > 0) {
      autoStopTimerRef.current = setTimeout(
        () => stopRecording(),
        (maxRecordDuration + AUTO_STOP_BUFFER) * 1000,
      );
    }

    return recordPromise;
  }, [startRecording, stopRecording, maxRecordDuration]);

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
    if (phase !== "idle") return;
    setPhase("recording");

    let result: { blob: Blob; buffer: AudioBuffer };
    try {
      result = await startRecordingWithAutoStop();
    } catch {
      setPhase("idle");
      return;
    }

    onRecorded(result.blob, result.buffer);
    setPhase("idle");
  }, [phase, startRecordingWithAutoStop, stopRecording, onRecorded]);

  /** Listen & Repeat: listen first, then record */
  const handleListenRepeat = useCallback(async () => {
    if (phase !== "idle") return;

    // Phase 1: Listen to reference
    setPhase("listen_repeat_listen");
    try {
      await playReference(speed);
    } catch {
      setPhase("idle");
      return;
    }

    // Short pause
    await new Promise((r) => setTimeout(r, 500));

    // Phase 2: Record — same auto-stop as all other modes
    setPhase("listen_repeat_record");

    let result: { blob: Blob; buffer: AudioBuffer };
    try {
      result = await startRecordingWithAutoStop();
    } catch {
      setPhase("idle");
      return;
    }

    onRecorded(result.blob, result.buffer);
    setPhase("idle");
  }, [phase, speed, playReference, startRecordingWithAutoStop, onRecorded]);

  /** Play a short tick sound via Web Audio API */
  const playTick = useCallback((freq: number = 800) => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.06);
    } catch {
      // Web Audio not available — skip
    }
  }, []);

  /** Real shadowing: 3-2-1 countdown, then play reference and record simultaneously */
  const handleShadow = useCallback(async () => {
    if (phase !== "idle") return;

    // Countdown phase: 3 → 2 → 1
    setPhase("countdown");
    for (const n of [3, 2, 1]) {
      setCountdown(n);
      playTick(n === 1 ? 1000 : 700);
      await new Promise((r) => setTimeout(r, 800));
    }
    setCountdown(null);

    // Start recording and playback simultaneously — the reference audio's
    // 1s leading silence gives the user visual prep time on the spectrogram.
    setPhase("shadowing");

    let result: { blob: Blob; buffer: AudioBuffer };
    try {
      const recordPromise = startRecordingWithAutoStop({ disableEchoCancellation: true });
      // Play reference alongside recording — auto-stop handles the timing
      playReference(speed).catch(() => {});
      result = await recordPromise;
    } catch {
      setPhase("idle");
      return;
    }

    onRecorded(result.blob, result.buffer);
    setPhase("idle");
  }, [phase, speed, playTick, playReference, startRecordingWithAutoStop, onRecorded]);

  const isBusy = phase !== "idle";
  const isRecording = phase === "recording" || phase === "listen_repeat_record" || phase === "shadowing";
  const isPlaying = phase === "listening" || phase === "listen_repeat_listen";
  const isShadowing = phase === "shadowing" || phase === "countdown";

  let phaseText = "";
  let phaseClass = "";
  if (phase === "listening") {
    phaseText = t("phaseListening");
    phaseClass = styles.phaseListening;
  } else if (phase === "recording") {
    phaseText = t("phaseRecording");
    phaseClass = styles.phaseRecording;
  } else if (phase === "listen_repeat_listen") {
    phaseText = t("phaseShadowListen");
    phaseClass = styles.phaseShadowing;
  } else if (phase === "listen_repeat_record") {
    phaseText = t("phaseShadowRepeat");
    phaseClass = styles.phaseRecording;
  } else if (phase === "countdown") {
    phaseText = t("phaseGetReady");
    phaseClass = styles.phaseShadowing;
  } else if (phase === "shadowing") {
    phaseText = t("phaseShadowing");
    phaseClass = styles.phaseShadowing;
  }

  return (
    <div className={styles.container}>
      <div className={`${styles.phase} ${phaseClass}`}>
        {phaseText || "\u00A0"}
      </div>

      {countdown !== null && (
        <div className={styles.countdownOverlay}>
          <span key={countdown} className={styles.countdownNumber}>{countdown}</span>
        </div>
      )}

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
          className={`${styles.btn} ${styles.recordBtn} ${isRecording && !isShadowing ? styles.recording : ""}`}
          onClick={handleRecord}
          disabled={disabled || isBusy}
        >
          <span className={styles.btnIcon}>●</span>
          {t("record")}
        </button>

        <button
          className={`${styles.btn} ${styles.listenRepeatBtn} ${phase.startsWith("listen_repeat") ? styles.active : ""}`}
          onClick={handleListenRepeat}
          disabled={disabled || isBusy}
        >
          <span className={styles.btnIcon}>🔄</span>
          {t("listenRepeat")}
        </button>

        <button
          className={`${styles.btn} ${styles.shadowBtn} ${isShadowing ? styles.active : ""}`}
          onClick={handleShadow}
          disabled={disabled || isBusy}
        >
          <span className={styles.btnIcon}>🎙️</span>
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
