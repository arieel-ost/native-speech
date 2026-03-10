import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui";
import { ScoreOverview } from "@/components/dashboard/ScoreOverview";
import { RecentSessions } from "@/components/dashboard/RecentSessions";
import { WeakSpots } from "@/components/dashboard/WeakSpots";
import styles from "./page.module.css";

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");

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
