"use client";

import styles from "./FeedbackDisplay.module.css";

interface PhonemeResult {
  phoneme: string;
  rating: string;
  produced: string;
  expected: string;
  substitution?: string | null;
}

interface AnalysisFeedback {
  accent: {
    detectedLanguage: string;
    confidence: string;
    telltalePatterns: string[];
  };
  phonemeAnalysis: PhonemeResult[];
  prosody: {
    stressAccuracy: string;
    rhythmNotes: string;
    intonationNotes: string;
  };
  overallScore: number;
  tips: {
    targetSound: string;
    exercise: string;
    practiceWord: string;
  }[];
  textMatch: string;
}

function ratingColor(rating: string) {
  if (rating === "good" || rating === "natural") return styles.good;
  if (rating === "acceptable" || rating === "slightly_off") return styles.acceptable;
  return styles.needsWork;
}

function ScoreRing({ score }: { score: number }) {
  const pct = (score / 10) * 100;
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className={styles.scoreRing}>
      <svg viewBox="0 0 80 80" className={styles.scoreSvg}>
        <circle cx="40" cy="40" r="36" className={styles.scoreTrack} />
        <circle
          cx="40"
          cy="40"
          r="36"
          className={`${styles.scoreFill} ${score >= 7 ? styles.good : score >= 4 ? styles.acceptable : styles.needsWork}`}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className={styles.scoreValue}>{score}</span>
      <span className={styles.scoreLabel}>/ 10</span>
    </div>
  );
}

export function FeedbackDisplay({ data }: { data: AnalysisFeedback }) {
  return (
    <div className={styles.feedback}>
      {/* Score + Accent header */}
      <div className={styles.topRow}>
        <ScoreRing score={data.overallScore} />
        <div className={styles.accentInfo}>
          <span className={styles.sectionLabel}>Detected accent</span>
          <span className={styles.accentLang}>{data.accent.detectedLanguage}</span>
          <span className={styles.accentConf}>{data.accent.confidence} confidence</span>
          <div className={styles.patterns}>
            {data.accent.telltalePatterns.map((p) => (
              <span key={p} className={styles.patternTag}>{p}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Phoneme breakdown */}
      <div className={styles.section}>
        <span className={styles.sectionLabel}>Phoneme analysis</span>
        <div className={styles.phonemeList}>
          {data.phonemeAnalysis.map((p) => (
            <div key={p.phoneme} className={styles.phonemeRow}>
              <div className={styles.phonemeHeader}>
                <span className={styles.phonemeSymbol}>{p.phoneme}</span>
                <span className={`${styles.ratingBadge} ${ratingColor(p.rating)}`}>
                  {p.rating.replace("_", " ")}
                </span>
              </div>
              <div className={styles.phonemeDetails}>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>You produced</span>
                  <span>{p.produced}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Expected</span>
                  <span>{p.expected}</span>
                </div>
                {p.substitution && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Substitution</span>
                    <span className={styles.substitution}>{p.substitution}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Prosody */}
      <div className={styles.section}>
        <span className={styles.sectionLabel}>Rhythm &amp; intonation</span>
        <div className={styles.prosodyGrid}>
          <div className={styles.prosodyItem}>
            <span className={styles.detailLabel}>Stress</span>
            <span className={`${styles.ratingBadge} ${ratingColor(data.prosody.stressAccuracy)}`}>
              {data.prosody.stressAccuracy.replace("_", " ")}
            </span>
          </div>
          <p className={styles.prosodyNote}>{data.prosody.rhythmNotes}</p>
          <p className={styles.prosodyNote}>{data.prosody.intonationNotes}</p>
        </div>
      </div>

      {/* Tips */}
      <div className={styles.section}>
        <span className={styles.sectionLabel}>Practice tips</span>
        <div className={styles.tipsList}>
          {data.tips.map((tip, i) => (
            <div key={i} className={styles.tipCard}>
              <span className={styles.tipSound}>{tip.targetSound}</span>
              <p className={styles.tipExercise}>{tip.exercise}</p>
              <span className={styles.tipWord}>Practice with: <strong>{tip.practiceWord}</strong></span>
            </div>
          ))}
        </div>
      </div>

      {/* Text match note */}
      {data.textMatch !== "yes" && (
        <p className={styles.textMatchNote}>
          Text match: {data.textMatch}
        </p>
      )}
    </div>
  );
}
