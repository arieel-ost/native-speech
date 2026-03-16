"use client";

import Image from "next/image";
import { Spectrogram } from "./Spectrogram";
import styles from "./SpectrogramDiff.module.css";

interface SpectrogramDiffProps {
  /** Pre-generated spectrogram image path for the reference phoneme */
  referenceSpectrogramSrc?: string | null;
  /** User's recorded audio buffer */
  userBuffer: AudioBuffer | null;
  /** Live stream for real-time user spectrogram during recording */
  userStream?: MediaStream | null;
  referenceLabel?: string;
  userLabel?: string;
}

export function SpectrogramDiff({
  referenceSpectrogramSrc,
  userBuffer,
  userStream,
  referenceLabel = "Reference",
  userLabel = "You",
}: SpectrogramDiffProps) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.pair}>
        <div className={styles.referencePanel}>
          {referenceSpectrogramSrc ? (
            <>
              <span className={styles.panelLabel}>{referenceLabel}</span>
              <Image
                src={referenceSpectrogramSrc}
                alt={`${referenceLabel} spectrogram`}
                width={400}
                height={200}
                className={styles.referenceImg}
                unoptimized
              />
              <span className={`${styles.axisLabel} ${styles.axisHigh}`}>high</span>
              <span className={`${styles.axisLabel} ${styles.axisLow}`}>low</span>
            </>
          ) : (
            <div className={styles.empty}>Reference will appear here</div>
          )}
        </div>
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
