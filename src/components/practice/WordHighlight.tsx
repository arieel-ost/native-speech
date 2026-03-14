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
  const scoreByIndex = useMemo(() => {
    if (!wordScores) return new Map<number, WordScore>();
    const map = new Map<number, WordScore>();
    const normalize = (w: string) =>
      w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

    for (const score of wordScores) {
      const targetNorm = normalize(score.word);
      // Fast path: index matches the expected word
      if (
        score.index < words.length &&
        normalize(words[score.index]) === targetNorm
      ) {
        map.set(score.index, score);
        continue;
      }
      // Fallback: search nearby for the matching word
      let found = false;
      for (let delta = -2; delta <= 2; delta++) {
        const candidate = score.index + delta;
        if (
          candidate >= 0 &&
          candidate < words.length &&
          !map.has(candidate) &&
          normalize(words[candidate]) === targetNorm
        ) {
          map.set(candidate, score);
          found = true;
          break;
        }
      }
      if (!found) {
        map.set(score.index, score);
      }
    }
    return map;
  }, [wordScores, words]);

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
