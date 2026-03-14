"use client";

import { useMemo } from "react";
import type { CSSProperties } from "react";
import styles from "./WordHighlight.module.css";

export interface WordScore {
  word: string;
  index: number;
  score: number;
  rating: "good" | "acceptable" | "needs_work";
  issue?: string | null;
}

export interface WordHighlightProps {
  prompt: string;
  wordScores?: WordScore[];
  activeWordIndex?: number;
  isRecording?: boolean;
}

export function WordHighlight({
  prompt,
  wordScores,
  activeWordIndex,
  isRecording,
}: WordHighlightProps) {
  const words = useMemo(() => prompt.split(/\s+/).filter(Boolean), [prompt]);
  const scoreByIndex = useMemo(
    () => new Map(wordScores?.map((score) => [score.index, score])),
    [wordScores],
  );

  return (
    <div className={styles.container}>
      {words.map((word, index) => {
        const score = scoreByIndex.get(index);
        const isActive = isRecording && activeWordIndex === index;
        const isPast =
          isRecording && activeWordIndex !== undefined && index < activeWordIndex;
        const hasIssue = Boolean(score?.issue);

        let className = styles.word;

        if (isActive) {
          className = `${className} ${styles.active}`;
        } else if (isPast) {
          className = `${className} ${styles.spoken}`;
        } else if (score) {
          className = `${className} ${styles[score.rating]} ${styles.revealed}`;
        }

        if (hasIssue) {
          className = `${className} ${styles.hasIssue}`;
        }

        const style = score
          ? ({
              "--word-reveal-delay": `${index * 80}ms`,
            } as CSSProperties)
          : undefined;

        return (
          <span
            key={`${word}-${index}`}
            className={className}
            style={style}
            aria-describedby={hasIssue ? `word-issue-${index}` : undefined}
            tabIndex={hasIssue ? 0 : undefined}
          >
            <span>{word}</span>
            {hasIssue ? (
              <span
                id={`word-issue-${index}`}
                className={styles.tooltip}
                role="tooltip"
              >
                {score?.issue}
              </span>
            ) : null}
          </span>
        );
      })}
    </div>
  );
}
