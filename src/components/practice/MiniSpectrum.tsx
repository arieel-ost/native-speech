"use client";

import { useEffect, useRef } from "react";
import styles from "./MiniSpectrum.module.css";

interface MiniSpectrumProps {
  sourceNode: AudioNode | null;
  audioContext: AudioContext | null;
  isRecording: boolean;
}

export function MiniSpectrum({ sourceNode, audioContext, isRecording }: MiniSpectrumProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const analyzerRef = useRef<import("audiomotion-analyzer").default | null>(null);

  useEffect(() => {
    if (!containerRef.current || !sourceNode || !audioContext || !isRecording) return;

    let analyzer: import("audiomotion-analyzer").default | null = null;

    (async () => {
      const AudioMotionAnalyzer = (await import("audiomotion-analyzer")).default;

      // Guard: component may have unmounted during dynamic import
      if (!containerRef.current) return;

      analyzer = new AudioMotionAnalyzer(containerRef.current, {
        audioCtx: audioContext as InstanceType<typeof AudioContext>,
        connectSpeakers: false,
        mode: 3,
        barSpace: 0.2,
        showBgColor: false,
        overlay: true,
        showPeaks: false,
        showScaleX: false,
        showScaleY: false,
        reflexRatio: 0.3,
        smoothing: 0.7,
      });

      analyzer.registerGradient("appTheme", {
        colorStops: [
          { color: "#6366f1", pos: 0 },
          { color: "#818cf8", pos: 0.5 },
          { color: "#a78bfa", pos: 1 },
        ],
      });
      analyzer.gradient = "appTheme";

      analyzer.connectInput(sourceNode);
      analyzerRef.current = analyzer;
    })();

    return () => {
      if (analyzer) {
        analyzer.destroy();
      }
      analyzerRef.current = null;
    };
  }, [sourceNode, audioContext, isRecording]);

  return <div ref={containerRef} className={styles.container} />;
}
