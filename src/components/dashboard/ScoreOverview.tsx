import { useTranslations } from "next-intl";
import { ProgressRing } from "@/components/ui";
import { mockUser } from "@/lib/mock-data";
import styles from "./ScoreOverview.module.css";

export function ScoreOverview() {
  const t = useTranslations("scoreOverview");

  return (
    <div className={styles.overview}>
      <ProgressRing value={mockUser.overallScore} size={160} label={t("overall")} />
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{mockUser.streak}</span>
          <span className={styles.statLabel}>{t("dayStreak")}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>24</span>
          <span className={styles.statLabel}>{t("sessions")}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>6h</span>
          <span className={styles.statLabel}>{t("totalPractice")}</span>
        </div>
      </div>
    </div>
  );
}
