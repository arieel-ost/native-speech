import { useTranslations } from "next-intl";
import { ScoreTrend } from "@/components/progress/ScoreTrend";
import { PhonemeTable } from "@/components/progress/PhonemeTable";
import { StreakTracker } from "@/components/progress/StreakTracker";
import styles from "./page.module.css";

export default function ProgressPage() {
  const t = useTranslations("Progress");

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t("title")}</h1>
      <StreakTracker />
      <ScoreTrend />
      <PhonemeTable />
    </div>
  );
}
