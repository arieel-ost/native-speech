import { useEffect, useRef, useCallback } from "react";

export interface AudioMetrics {
  rms: number;
  isClipping: boolean;
}

export function useAudioVisualizer(stream: MediaStream | null) {
  const analyserRef = useRef<AnalyserNode | null>(null);
  const floatArrayRef = useRef<Float32Array | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!stream) {
      analyserRef.current = null;
      return;
    }

    const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    audioContextRef.current = audioCtx;

    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.8;
    
    const source = audioCtx.createMediaStreamSource(stream);
    source.connect(analyser);
    
    analyserRef.current = analyser;
    floatArrayRef.current = new Float32Array(analyser.frequencyBinCount);

    return () => {
      source.disconnect();
      if (audioCtx.state !== "closed") {
        audioCtx.close();
      }
      analyserRef.current = null;
    };
  }, [stream]);

  const getMetrics = useCallback((): AudioMetrics | null => {
    if (!analyserRef.current || !floatArrayRef.current) return null;
    
    const analyser = analyserRef.current;
    const floatArray = floatArrayRef.current;
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    analyser.getFloatTimeDomainData(floatArray as any);
    let sumSquares = 0;
    let isClipping = false;
    
    for (let i = 0; i < floatArray.length; i++) {
        const sample = floatArray[i];
        sumSquares += sample * sample;
        if (sample >= 0.99 || sample <= -0.99) isClipping = true;
    }
    
    const rms = Math.sqrt(sumSquares / floatArray.length);
    return { rms, isClipping };
  }, []);

  return { getMetrics };
}
