"use client";

import { useTranslations } from "next-intl";
import { ProgressRing } from "@/components/ui";
import styles from "./ScoreOverview.module.css";

interface ScoreOverviewProps {
  score: number;
  sessionCount: number;
  streak: number;
}

export function ScoreOverview({ score, sessionCount, streak }: ScoreOverviewProps) {
  const t = useTranslations("ScoreOverview");

  return (
    <div className={styles.overview}>
      <ProgressRing value={score} size={160} label="overall" />
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{streak}</span>
          <span className={styles.statLabel}>{t("dayStreak")}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{sessionCount}</span>
          <span className={styles.statLabel}>{t("sessions")}</span>
        </div>
      </div>
    </div>
  );
}
