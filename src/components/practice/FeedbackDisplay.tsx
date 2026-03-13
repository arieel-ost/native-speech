"use client";

import { useTranslations } from "next-intl";
import styles from "./FeedbackDisplay.module.css";

interface PhonemeResult {
  phoneme: string;
  word: string;
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

function ScoreRing({ score, outOfLabel }: { score: number; outOfLabel: string }) {
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
      <span className={styles.scoreLabel}>{outOfLabel}</span>
    </div>
  );
}

export function FeedbackDisplay({ data }: { data: AnalysisFeedback }) {
  const t = useTranslations("FeedbackDisplay");

  // Group phoneme entries by phoneme symbol so we can show per-word results under each sound
  const phonemeGroups = (data.phonemeAnalysis || []).reduce<Record<string, PhonemeResult[]>>((acc, p) => {
    (acc[p.phoneme] ??= []).push(p);
    return acc;
  }, {});

  return (
    <div className={styles.feedback}>
      {/* Score + Accent header */}
      <div className={styles.topRow}>
        <ScoreRing score={data.overallScore} outOfLabel={t("outOf")} />
        <div className={styles.accentInfo}>
          <span className={styles.sectionLabel}>{t("detectedAccent")}</span>
          <span className={styles.accentLang}>{data.accent?.detectedLanguage || "Unknown"}</span>
          <span className={styles.accentConf}>{t("confidence", { level: data.accent?.confidence || "low" })}</span>
          <div className={styles.patterns}>
            {(data.accent?.telltalePatterns || []).map((p) => (
              <span key={p} className={styles.patternTag}>{p}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Phoneme breakdown — grouped by sound, per-word detail */}
      <div className={styles.section}>
        <span className={styles.sectionLabel}>{t("phonemeAnalysis")}</span>
        <div className={styles.phonemeList}>
          {Object.entries(phonemeGroups).map(([phoneme, entries]) => (
            <div key={phoneme} className={styles.phonemeRow}>
              <div className={styles.phonemeHeader}>
                <span className={styles.phonemeSymbol}>{phoneme}</span>
              </div>
              {entries.map((p) => (
                <div key={`${p.phoneme}-${p.word}`} className={styles.phonemeDetails}>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>{t("word")}</span>
                    <span><strong>{p.word}</strong></span>
                    <span className={`${styles.ratingBadge} ${ratingColor(p.rating)}`}>
                      {p.rating.replace("_", " ")}
                    </span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>{t("youProduced")}</span>
                    <span>{p.produced}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>{t("expected")}</span>
                    <span>{p.expected}</span>
                  </div>
                  {p.substitution && (
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>{t("substitution")}</span>
                      <span className={styles.substitution}>{p.substitution}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Prosody */}
      <div className={styles.section}>
        <span className={styles.sectionLabel}>{t("rhythmIntonation")}</span>
        <div className={styles.prosodyGrid}>
          <div className={styles.prosodyItem}>
            <span className={styles.detailLabel}>{t("stress")}</span>
            <span className={`${styles.ratingBadge} ${ratingColor(data.prosody?.stressAccuracy || "acceptable")}`}>
              {(data.prosody?.stressAccuracy || "acceptable").replace("_", " ")}
            </span>
          </div>
          <p className={styles.prosodyNote}>{data.prosody?.rhythmNotes || "No rhythm data."}</p>
          <p className={styles.prosodyNote}>{data.prosody?.intonationNotes || "No intonation data."}</p>
        </div>
      </div>

      {/* Tips */}
      <div className={styles.section}>
        <span className={styles.sectionLabel}>{t("practiceTips")}</span>
        <div className={styles.tipsList}>
          {(data.tips || []).map((tip, i) => (
            <div key={i} className={styles.tipCard}>
              <span className={styles.tipSound}>{tip.targetSound}</span>
              <p className={styles.tipExercise}>{tip.exercise}</p>
              <span className={styles.tipWord}>{t("practiceWith")} <strong>{tip.practiceWord}</strong></span>
            </div>
          ))}
        </div>
      </div>

      {/* Text match note */}
      {data.textMatch !== "yes" && (
        <p className={styles.textMatchNote}>
          {t("textMatch", { value: data.textMatch })}
        </p>
      )}
    </div>
  );
}
