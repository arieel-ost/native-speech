"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export interface AudioQuality {
  tooQuiet: boolean;
  tooLoud: boolean;
  noSpeechDetected: boolean;
}

export interface AudioMetadata {
  avgAmplitude: number;
  peakAmplitude: number;
  speechDuration: number;
  totalDuration: number;
  speechRatio: number;
}

interface AudioPipelineState {
  isRecording: boolean;
  rmsLevel: number;
  waveformData: Float32Array | null;
  audioQuality: AudioQuality;
  speechDuration: number;
  isSpeaking: boolean;
  isVadReady: boolean;
}

const SILENCE_THRESHOLD = 0.01;
const LOUD_THRESHOLD = 0.95;
const QUIET_THRESHOLD = 0.02;
const NO_SPEECH_TIMEOUT_MS = 3000;

export function useAudioPipeline() {
  const [state, setState] = useState<AudioPipelineState>({
    isRecording: false,
    rmsLevel: 0,
    waveformData: null,
    audioQuality: { tooQuiet: false, tooLoud: false, noSpeechDetected: false },
    speechDuration: 0,
    isSpeaking: false,
    isVadReady: false,
  });

  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const amplitudeSamplesRef = useRef<number[]>([]);
  const peakRef = useRef<number>(0);
  const noSpeechTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasSpeechRef = useRef<boolean>(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (noSpeechTimerRef.current) clearTimeout(noSpeechTimerRef.current);
      audioContextRef.current?.close();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const processAudio = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);
    analyser.getFloatTimeDomainData(dataArray);

    // Compute RMS
    let sumSquares = 0;
    let peak = 0;
    for (let i = 0; i < bufferLength; i++) {
      const sample = dataArray[i];
      sumSquares += sample * sample;
      const abs = Math.abs(sample);
      if (abs > peak) peak = abs;
    }
    const rms = Math.sqrt(sumSquares / bufferLength);

    // Track amplitude samples for metadata
    amplitudeSamplesRef.current.push(rms);
    if (peak > peakRef.current) peakRef.current = peak;

    // Detect speech via amplitude (basic — VAD will improve this in Task 3)
    if (rms > SILENCE_THRESHOLD && !hasSpeechRef.current) {
      hasSpeechRef.current = true;
      if (noSpeechTimerRef.current) {
        clearTimeout(noSpeechTimerRef.current);
        noSpeechTimerRef.current = null;
      }
    }

    setState((prev) => ({
      ...prev,
      rmsLevel: rms,
      waveformData: dataArray,
      audioQuality: {
        tooQuiet: rms < QUIET_THRESHOLD && hasSpeechRef.current === false,
        tooLoud: peak > LOUD_THRESHOLD,
        noSpeechDetected: prev.audioQuality.noSpeechDetected,
      },
    }));

    rafRef.current = requestAnimationFrame(processAudio);
  }, []);

  const startRecording = useCallback(async (): Promise<MediaStream> => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;

    // Set up AudioContext + AnalyserNode
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.3;
    source.connect(analyser);
    audioContextRef.current = audioContext;
    analyserRef.current = analyser;

    // Set up MediaRecorder
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;
    chunksRef.current = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    // Reset state
    amplitudeSamplesRef.current = [];
    peakRef.current = 0;
    hasSpeechRef.current = false;
    startTimeRef.current = Date.now();

    // Start no-speech detection timer
    noSpeechTimerRef.current = setTimeout(() => {
      if (!hasSpeechRef.current) {
        setState((prev) => ({
          ...prev,
          audioQuality: { ...prev.audioQuality, noSpeechDetected: true },
        }));
      }
    }, NO_SPEECH_TIMEOUT_MS);

    mediaRecorder.start();
    setState((prev) => ({ ...prev, isRecording: true }));

    // Start animation frame loop
    processAudio();

    return stream;
  }, [processAudio]);

  const stopRecording = useCallback((): Promise<{ blob: Blob; metadata: AudioMetadata }> => {
    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current;
      if (!mediaRecorder || mediaRecorder.state !== "recording") {
        resolve({
          blob: new Blob(),
          metadata: { avgAmplitude: 0, peakAmplitude: 0, speechDuration: 0, totalDuration: 0, speechRatio: 0 },
        });
        return;
      }

      mediaRecorder.onstop = () => {
        // Stop all tracks
        streamRef.current?.getTracks().forEach((t) => t.stop());

        // Stop animation frame
        if (rafRef.current) cancelAnimationFrame(rafRef.current);

        // Stop no-speech timer
        if (noSpeechTimerRef.current) clearTimeout(noSpeechTimerRef.current);

        // Close audio context
        audioContextRef.current?.close();

        // Build blob
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });

        // Compute metadata
        const samples = amplitudeSamplesRef.current;
        const avgAmplitude = samples.length > 0
          ? samples.reduce((a, b) => a + b, 0) / samples.length
          : 0;
        const totalDuration = (Date.now() - startTimeRef.current) / 1000;
        const speechSamples = samples.filter((s) => s > SILENCE_THRESHOLD).length;
        const speechDuration = samples.length > 0
          ? (speechSamples / samples.length) * totalDuration
          : 0;

        const metadata: AudioMetadata = {
          avgAmplitude,
          peakAmplitude: peakRef.current,
          speechDuration,
          totalDuration,
          speechRatio: samples.length > 0 ? speechSamples / samples.length : 0,
        };

        // Reset state
        setState({
          isRecording: false,
          rmsLevel: 0,
          waveformData: null,
          audioQuality: { tooQuiet: false, tooLoud: false, noSpeechDetected: false },
          speechDuration: 0,
          isSpeaking: false,
          isVadReady: false,
        });

        resolve({ blob, metadata });
      };

      mediaRecorder.stop();
    });
  }, []);

  return {
    ...state,
    startRecording,
    stopRecording,
  };
}
