"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Spectrogram } from "./Spectrogram";
import { useAudioBufferFromUrl } from "@/hooks/useAudioBufferFromUrl";
import styles from "./SpectrogramDiff.module.css";

export type ViewMode = "side-by-side" | "overlay";

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
  /** External control for view mode */
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
}

export function SpectrogramDiff({
  referenceSpectrogramSrc,
  referenceAudioSrc,
  refPlaybackProgress,
  userBuffer,
  userStream,
  viewMode: externalViewMode,
  onViewModeChange,
}: SpectrogramDiffProps) {
  const t = useTranslations("PhonemeDrill");
  const [internalViewMode, setInternalViewMode] = useState<ViewMode>("side-by-side");
  const viewMode = externalViewMode ?? internalViewMode;
  const setViewMode = onViewModeChange ?? setInternalViewMode;
  
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
      label={t("reference")}
      placeholder={t("loadingReference")}
    />
  ) : referenceSpectrogramSrc ? (
    <div className={styles.referencePanel}>
      <span className={styles.panelLabel}>{t("reference")}</span>
      <Image
        src={referenceSpectrogramSrc}
        alt="Reference spectrogram"
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
      <div className={styles.empty}>{t("referenceWillAppear")}</div>
    </div>
  );

  const userContent = (
    <Spectrogram
      audioBuffer={userStream ? undefined : userBuffer}
      stream={userStream}
      label={t("you")}
      placeholder={t("recordToSee")}
      className={isOverlay ? styles.overlayUser : ""}
      maxDuration={sharedDuration}
    />
  );

  return (
    <div className={styles.wrapper}>
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
    </div>
  );
}

// Export toggle component for use in parent
export function ViewModeToggle({
  viewMode,
  onChange
}: {
  viewMode: ViewMode;
  onChange: (mode: ViewMode) => void;
}) {
  const t = useTranslations("PhonemeDrill");
  return (
    <div className={styles.toggleCompact}>
      <button
        className={`${styles.toggleIcon} ${viewMode === "side-by-side" ? styles.toggleActive : ""}`}
        onClick={() => onChange("side-by-side")}
        aria-pressed={viewMode === "side-by-side"}
        title={t("sideBySide")}
      >
        ◫
      </button>
      <button
        className={`${styles.toggleIcon} ${viewMode === "overlay" ? styles.toggleActive : ""}`}
        onClick={() => onChange("overlay")}
        aria-pressed={viewMode === "overlay"}
        title={t("overlay")}
      >
        ⊕
      </button>
    </div>
  );
}
