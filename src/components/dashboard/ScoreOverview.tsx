import { ProgressRing } from "@/components/ui";
import { mockUser } from "@/lib/mock-data";
import styles from "./ScoreOverview.module.css";

export function ScoreOverview() {
  return (
    <div className={styles.overview}>
      <ProgressRing value={mockUser.overallScore} size={160} label="overall" />
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{mockUser.streak}</span>
          <span className={styles.statLabel}>Day Streak</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>24</span>
          <span className={styles.statLabel}>Sessions</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>6h</span>
          <span className={styles.statLabel}>Total Practice</span>
        </div>
      </div>
    </div>
  );
}
