"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import styles from "./ShadowingPlayer.module.css";

type Phase = "idle" | "listening" | "recording" | "listen_repeat_listen" | "listen_repeat_record" | "countdown" | "shadowing";
type ViewMode = "side-by-side" | "overlay";

const AUTO_STOP_BUFFER = 0.5;

interface ShadowingPlayerProps {
  text: string;
  lang: string;
  phonemeAudioSrc?: string | null;
  onRecorded: (blob: Blob, buffer: AudioBuffer) => void;
  onStreamStart?: (stream: MediaStream) => void;
  onStreamEnd?: () => void;
  onRefProgress?: (progress: number | null) => void;
  maxRecordDuration?: number | null;
  disabled?: boolean;
  hasRecorded?: boolean;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
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
  hasRecorded = false,
  viewMode,
  onViewModeChange,
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

  const stopProgressTracking = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    onRefProgress?.(null);
  }, [onRefProgress]);

  const playReference = useCallback(
    (playbackSpeed: number): Promise<void> => {
      if (phonemeAudioSrc) {
        return new Promise((resolve, reject) => {
          const audio = new Audio(phonemeAudioSrc);
          audio.playbackRate = playbackSpeed;
          audioElRef.current = audio;

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
        const arrayBuf = await blob.arrayBuffer();
        const audioCtx = new AudioContext();
        let buffer: AudioBuffer;
        try {
          buffer = await audioCtx.decodeAudioData(arrayBuf);
        } catch {
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

  const handleListen = useCallback(async () => {
    setPhase("listening");
    try {
      await playReference(speed);
    } catch {
      // ignore
    }
    setPhase("idle");
  }, [speed, playReference]);

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
  }, [phase, startRecordingWithAutoStop, onRecorded]);

  const handleListenRepeat = useCallback(async () => {
    if (phase !== "idle") return;
    setPhase("listen_repeat_listen");
    try {
      await playReference(speed);
    } catch {
      setPhase("idle");
      return;
    }
    await new Promise((r) => setTimeout(r, 500));
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
      // ignore
    }
  }, []);

  const handleShadow = useCallback(async () => {
    if (phase !== "idle") return;
    setPhase("countdown");
    for (const n of [3, 2, 1]) {
      setCountdown(n);
      playTick(n === 1 ? 1000 : 700);
      await new Promise((r) => setTimeout(r, 800));
    }
    setCountdown(null);
    setPhase("shadowing");
    let result: { blob: Blob; buffer: AudioBuffer };
    try {
      const recordPromise = startRecordingWithAutoStop({ disableEchoCancellation: true });
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
  if (phase === "listening") phaseText = t("phaseListening");
  else if (phase === "recording") phaseText = t("phaseRecording");
  else if (phase === "listen_repeat_listen") phaseText = t("phaseShadowListen");
  else if (phase === "listen_repeat_record") phaseText = t("phaseShadowRepeat");
  else if (phase === "countdown") phaseText = t("phaseGetReady");
  else if (phase === "shadowing") phaseText = t("phaseShadowing");

  return (
    <div className={styles.container}>
      {/* Countdown Overlay */}
      {countdown !== null && (
        <div className={styles.countdownOverlay} aria-live="assertive">
          <span key={countdown} className={styles.countdownNumber}>{countdown}</span>
        </div>
      )}

      {/* Control Grid - Gemini Style */}
      <div className={styles.controls}>
        <button
          className={`${styles.btn} ${styles.listenBtn} ${isPlaying ? styles.playing : ""}`}
          onClick={handleListen}
          disabled={disabled || isBusy}
        >
          <div className={styles.btnIcon}>
            {isPlaying ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="6" y="4" width="4" height="16" fill="currentColor"/>
                <rect x="14" y="4" width="4" height="16" fill="currentColor"/>
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 3l14 9-14 9V3z" fill="currentColor"/>
              </svg>
            )}
          </div>
          <span className={styles.btnLabel}>{t("listen")}</span>
        </button>

        <button
          className={`${styles.btn} ${styles.recordBtn} ${isRecording && !isShadowing ? styles.recording : ""}`}
          onClick={handleRecord}
          disabled={disabled || isBusy}
        >
          <div className={styles.btnIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="8"/>
            </svg>
          </div>
          <span className={styles.btnLabel}>{t("record")}</span>
        </button>

        <button
          className={`${styles.btn} ${styles.listenRepeatBtn} ${phase.startsWith("listen_repeat") ? styles.active : ""}`}
          onClick={handleListenRepeat}
          disabled={disabled || isBusy}
        >
          <div className={styles.btnIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 1l4 4-4 4"/>
              <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
              <path d="M7 23l-4-4 4-4"/>
              <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
            </svg>
          </div>
          <span className={styles.btnLabel}>{t("listenRepeat")}</span>
        </button>

        <button
          className={`${styles.btn} ${styles.shadowBtn} ${isShadowing ? styles.active : ""}`}
          onClick={handleShadow}
          disabled={disabled || isBusy}
        >
          <div className={styles.btnIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v1a7 7 0 0 1-14 0v-1"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
          </div>
          <span className={styles.btnLabel}>{t("shadow")}</span>
        </button>
      </div>

      {/* Status + Speed + View Mode Combined */}
      <div className={styles.statusSpeedBar}>
        <div className={styles.statusSection}>
          <div className={`${styles.statusIndicator} ${isRecording ? styles.statusRecording : isPlaying ? styles.statusPlaying : isShadowing ? styles.statusShadowing : ""}`} />
          <span className={styles.statusText}>
            {phase === "idle" && t("phaseReady")}
            {phaseText}
          </span>
        </div>
        <div className={styles.rightSection}>
          <div className={styles.speedSection}>
            <span className={styles.speedLabel}>{t("speed")}</span>
            <div className={styles.speedControl}>
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  className={`${styles.speedBtn} ${speed === s ? styles.speedBtnActive : ""}`}
                  onClick={() => setSpeed(s)}
                  disabled={isBusy}
                  aria-pressed={speed === s}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
          {viewMode && onViewModeChange && (
            <ViewModeToggle viewMode={viewMode} onChange={onViewModeChange} />
          )}
        </div>
      </div>
    </div>
  );
}

// View mode toggle component for spectrogram view
export function ViewModeToggle({ 
  viewMode, 
  onChange 
}: { 
  viewMode: "side-by-side" | "overlay"; 
  onChange: (mode: "side-by-side" | "overlay") => void;
}) {
  return (
    <div className={styles.viewModeToggle}>
      <button
        className={`${styles.viewModeBtn} ${viewMode === "side-by-side" ? styles.viewModeActive : ""}`}
        onClick={() => onChange("side-by-side")}
        aria-pressed={viewMode === "side-by-side"}
        title="Side by side"
      >
        ◫
      </button>
      <button
        className={`${styles.viewModeBtn} ${viewMode === "overlay" ? styles.viewModeActive : ""}`}
        onClick={() => onChange("overlay")}
        aria-pressed={viewMode === "overlay"}
        title="Overlay"
      >
        ⊕
      </button>
    </div>
  );
}
