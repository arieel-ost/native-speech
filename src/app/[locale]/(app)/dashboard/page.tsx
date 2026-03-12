import Link from "next/link";
import { Button } from "@/components/ui";
import { ScoreOverview } from "@/components/dashboard/ScoreOverview";
import { RecentSessions } from "@/components/dashboard/RecentSessions";
import { WeakSpots } from "@/components/dashboard/WeakSpots";
import styles from "./page.module.css";

export default function DashboardPage() {
  return (
    <div className={styles.page}>
      <ScoreOverview />
      <Link href="/practice">
        <Button size="lg">Start Practice</Button>
      </Link>
      <div className={styles.grid}>
        <WeakSpots />
        <RecentSessions />
      </div>
    </div>
  );
}
