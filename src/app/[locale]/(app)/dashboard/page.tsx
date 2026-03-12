import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";
import { ScoreOverview } from "@/components/dashboard/ScoreOverview";
import { RecentSessions } from "@/components/dashboard/RecentSessions";
import { WeakSpots } from "@/components/dashboard/WeakSpots";
import styles from "./page.module.css";

export default function DashboardPage() {
  const t = useTranslations("Dashboard");

  return (
    <div className={styles.page}>
      <ScoreOverview />
      <Link href="/practice">
        <Button size="lg">{t("startPractice")}</Button>
      </Link>
      <div className={styles.grid}>
        <WeakSpots />
        <RecentSessions />
      </div>
    </div>
  );
}
