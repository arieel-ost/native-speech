import { Card } from "@/components/ui";
import { mockUser } from "@/lib/mock-data";
import styles from "./StreakTracker.module.css";

export function StreakTracker() {
  // Mock last 7 days (1 = practiced, 0 = missed)
  const days = [1, 1, 0, 1, 1, 1, 1];
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <Card variant="outlined">
      <div className={styles.tracker}>
        <h3 className={styles.heading}>This Week</h3>
        <div className={styles.streakValue}>{mockUser.streak} day streak</div>
        <div className={styles.days}>
          {days.map((practiced, i) => (
            <div key={i} className={styles.day}>
              <div className={`${styles.dot} ${practiced ? styles.active : ""}`} />
              <span className={styles.label}>{labels[i]}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
