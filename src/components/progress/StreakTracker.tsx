import { useTranslations } from "next-intl";
import { Card } from "@/components/ui";
import { mockUser } from "@/lib/mock-data";
import styles from "./StreakTracker.module.css";

export function StreakTracker() {
  const t = useTranslations("streakTracker");

  // Mock last 7 days (1 = practiced, 0 = missed)
  const days = [1, 1, 0, 1, 1, 1, 1];
  const labelKeys = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

  return (
    <Card variant="outlined">
      <div className={styles.tracker}>
        <h3 className={styles.heading}>{t("thisWeek")}</h3>
        <div className={styles.streakValue}>{t("dayStreak", { count: mockUser.streak })}</div>
        <div className={styles.days}>
          {days.map((practiced, i) => (
            <div key={i} className={styles.day}>
              <div className={`${styles.dot} ${practiced ? styles.active : ""}`} />
              <span className={styles.label}>{t(labelKeys[i])}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
