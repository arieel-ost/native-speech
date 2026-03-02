"use client";

import { useState } from "react";
import { Button, Card } from "@/components/ui";
import type { DrillSession as DrillSessionType } from "@/lib/mock-data";
import styles from "./DrillSession.module.css";

interface DrillSessionProps {
  drills: DrillSessionType[];
  categoryName: string;
}

export function DrillSession({ drills, categoryName }: DrillSessionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const drill = drills[currentIndex];

  if (!drill) return <p>No drills available for this category.</p>;

  return (
    <div className={styles.session}>
      <div className={styles.header}>
        <h1 className={styles.title}>{categoryName}</h1>
        <span className={styles.counter}>
          {currentIndex + 1} / {drills.length}
        </span>
      </div>

      <Card variant="elevated">
        <div className={styles.promptArea}>
          <p className={styles.instruction}>Read this aloud:</p>
          <p className={styles.prompt}>{drill.prompt}</p>
          <div className={styles.phonemes}>
            {drill.targetPhonemes.map((p) => (
              <span key={p} className={styles.phoneme}>{p}</span>
            ))}
          </div>
        </div>
      </Card>

      <button
        className={`${styles.recordBtn} ${isRecording ? styles.recording : ""}`}
        onClick={() => setIsRecording(!isRecording)}
        aria-label={isRecording ? "Stop recording" : "Start recording"}
      >
        <span className={styles.recordIcon}>{isRecording ? "■" : "●"}</span>
        <span>{isRecording ? "Stop" : "Record"}</span>
      </button>

      <Card variant="outlined">
        <div className={styles.feedback}>
          <p className={styles.feedbackText}>
            {isRecording
              ? "Listening..."
              : "Your pronunciation feedback will appear here after recording."}
          </p>
        </div>
      </Card>

      <div className={styles.nav}>
        <Button
          variant="secondary"
          onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
          disabled={currentIndex === 0}
        >
          Previous
        </Button>
        <Button
          variant="secondary"
          onClick={() => setCurrentIndex(Math.min(drills.length - 1, currentIndex + 1))}
          disabled={currentIndex === drills.length - 1}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
