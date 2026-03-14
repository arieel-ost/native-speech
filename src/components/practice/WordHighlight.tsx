"use client";

import styles from "./WordHighlight.module.css";

export interface WordScore {
  word: string;
  index: number;
  score: number;
  rating: "good" | "acceptable" | "needs_work";
  issue?: string | null;
}

export interface WordHighlightProps {
  /** The original prompt text */
  prompt: string;
  /** Per-word scores from Gemini (post-recording) */
  wordScores?: WordScore[];
  /** Index of the word currently being spoken (real-time tracking) */
  activeWordIndex?: number;
  /** Whether the user is currently recording */
  isRecording?: boolean;
}

export function WordHighlight({
  prompt,
  wordScores,
  activeWordIndex,
  isRecording,
}: WordHighlightProps) {
  const words = prompt.split(/\s+/);

  return (
    <div className={styles.container}>
      {words.map((word, i) => {
        const score = wordScores?.find((ws) => ws.index === i);
        const isActive = isRecording && activeWordIndex === i;
        const isPast = isRecording && activeWordIndex !== undefined && i < activeWordIndex;

        let className = styles.word;
        if (isActive) {
          className += ` ${styles.active}`;
        } else if (score) {
          className += ` ${styles[score.rating]}`;
        } else if (isPast) {
          className += ` ${styles.spoken}`;
        }

        return (
          <span
            key={i}
            className={className}
            title={score?.issue ?? undefined}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
}
