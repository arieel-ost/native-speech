"use client";

import { Spectrogram } from "./Spectrogram";
import styles from "./SpectrogramDiff.module.css";

interface SpectrogramDiffProps {
  /** Reference audio buffer (TTS / model pronunciation) */
  referenceBuffer: AudioBuffer | null;
  /** User's recorded audio buffer */
  userBuffer: AudioBuffer | null;
  /** Live stream for real-time user spectrogram during recording */
  userStream?: MediaStream | null;
  referenceLabel?: string;
  userLabel?: string;
}

export function SpectrogramDiff({
  referenceBuffer,
  userBuffer,
  userStream,
  referenceLabel = "Reference",
  userLabel = "You",
}: SpectrogramDiffProps) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.pair}>
        <Spectrogram
          audioBuffer={referenceBuffer}
          label={referenceLabel}
          placeholder="Reference will appear here"
        />
        <Spectrogram
          audioBuffer={userStream ? undefined : userBuffer}
          stream={userStream}
          label={userLabel}
          placeholder="Record to see your spectrogram"
        />
      </div>
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
