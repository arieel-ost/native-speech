"use client";

import styles from "./SimplifiedFeedbackDisplay.module.css";

interface Improvement {
  issue: string;
  tip: string;
}

interface SimplifiedFeedback {
  score: number;
  summary: string;
  strengths: string[];
  improvements: Improvement[];
  textMatch: string;
}

function ScoreBar({ score }: { score: number }) {
  const pct = (score / 10) * 100;
  const color =
    score >= 7 ? "var(--color-success)" : score >= 4 ? "var(--color-accent)" : "var(--color-error)";

  return (
    <div className={styles.scoreSection}>
      <div className={styles.scoreHeader}>
        <span className={styles.scoreValue} style={{ color }}>{score}</span>
        <span className={styles.scoreMax}>/ 10</span>
      </div>
      <div className={styles.scoreTrack}>
        <div className={styles.scoreFill} style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export function SimplifiedFeedbackDisplay({ data }: { data: SimplifiedFeedback }) {
  return (
    <div className={styles.feedback}>
      <ScoreBar score={data.score} />

      <p className={styles.summary}>{data.summary}</p>

      {data.strengths.length > 0 && (
        <div className={styles.section}>
          <span className={styles.sectionLabel}>What you did well</span>
          <ul className={styles.list}>
            {data.strengths.map((s, i) => (
              <li key={i} className={styles.strengthItem}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      {data.improvements.length > 0 && (
        <div className={styles.section}>
          <span className={styles.sectionLabel}>Things to work on</span>
          <div className={styles.improvements}>
            {data.improvements.map((imp, i) => (
              <div key={i} className={styles.improvementCard}>
                <p className={styles.issue}>{imp.issue}</p>
                <p className={styles.tip}>{imp.tip}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.textMatch !== "yes" && (
        <p className={styles.textMatchNote}>
          Text match: {data.textMatch}
        </p>
      )}
    </div>
  );
}
