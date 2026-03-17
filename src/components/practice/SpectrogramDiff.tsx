"use client";

import { useState } from "react";
import Image from "next/image";
import { Spectrogram } from "./Spectrogram";
import { useAudioBufferFromUrl } from "@/hooks/useAudioBufferFromUrl";
import styles from "./SpectrogramDiff.module.css";

type ViewMode = "side-by-side" | "overlay";

interface SpectrogramDiffProps {
  /** Pre-generated spectrogram image path (PNG fallback) */
  referenceSpectrogramSrc?: string | null;
  /** Audio URL for canvas-based reference rendering */
  referenceAudioSrc?: string | null;
  /** Reference audio playback progress (0→1), null when not playing */
  refPlaybackProgress?: number | null;
  /** User's recorded audio buffer */
  userBuffer: AudioBuffer | null;
  /** Live stream for real-time user spectrogram during recording */
  userStream?: MediaStream | null;
  referenceLabel?: string;
  userLabel?: string;
  sideBySideLabel?: string;
  overlayLabel?: string;
}

export function SpectrogramDiff({
  referenceSpectrogramSrc,
  referenceAudioSrc,
  refPlaybackProgress,
  userBuffer,
  userStream,
  referenceLabel = "Reference",
  userLabel = "You",
  sideBySideLabel = "Side by side",
  overlayLabel = "Overlay",
}: SpectrogramDiffProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("side-by-side");
  const { buffer: refBuffer, loading: refLoading } =
    useAudioBufferFromUrl(referenceAudioSrc);

  // Both canvases share the same duration so cursors move in sync
  const sharedDuration = refBuffer?.duration ?? null;

  const hasCanvasRef = !!refBuffer || refLoading;
  const isOverlay = viewMode === "overlay";

  // Reference panel: canvas-based if audio available, else PNG fallback
  const referenceContent = hasCanvasRef ? (
    <Spectrogram
      audioBuffer={refBuffer}
      playbackProgress={refPlaybackProgress}
      label={referenceLabel}
      placeholder="Loading reference..."
    />
  ) : referenceSpectrogramSrc ? (
    <div className={styles.referencePanel}>
      <span className={styles.panelLabel}>{referenceLabel}</span>
      <Image
        src={referenceSpectrogramSrc}
        alt={`${referenceLabel} spectrogram`}
        width={400}
        height={200}
        className={styles.referenceImg}
        unoptimized
      />
      {refPlaybackProgress != null && (
        <div
          className={styles.playbackCursor}
          style={{ left: `${refPlaybackProgress * 100}%` }}
        />
      )}
      <span className={`${styles.axisLabel} ${styles.axisHigh}`}>high</span>
      <span className={`${styles.axisLabel} ${styles.axisLow}`}>low</span>
    </div>
  ) : (
    <div className={`${styles.referencePanel}`}>
      <div className={styles.empty}>Reference will appear here</div>
    </div>
  );

  const userContent = (
    <Spectrogram
      audioBuffer={userStream ? undefined : userBuffer}
      stream={userStream}
      label={userLabel}
      placeholder="Record to see your spectrogram"
      className={isOverlay ? styles.overlayUser : ""}
      maxDuration={sharedDuration}
    />
  );

  return (
    <div className={styles.wrapper}>
      {/* View mode toggle */}
      <div className={styles.toggleBar}>
        <button
          className={`${styles.toggleBtn} ${!isOverlay ? styles.toggleActive : ""}`}
          onClick={() => setViewMode("side-by-side")}
          aria-pressed={!isOverlay}
        >
          {sideBySideLabel}
        </button>
        <button
          className={`${styles.toggleBtn} ${isOverlay ? styles.toggleActive : ""}`}
          onClick={() => setViewMode("overlay")}
          aria-pressed={isOverlay}
        >
          {overlayLabel}
        </button>
      </div>

      {isOverlay ? (
        <div className={styles.overlayGrid}>
          {referenceContent}
          {userContent}
        </div>
      ) : (
        <div className={styles.pair}>
          {referenceContent}
          {userContent}
        </div>
      )}

      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <span className={`${styles.dot} ${styles.dotRef}`} />
          <span>{referenceLabel}</span>
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.dot} ${styles.dotUser}`} />
          <span>{userLabel}</span>
        </div>
      </div>
    </div>
  );
}
