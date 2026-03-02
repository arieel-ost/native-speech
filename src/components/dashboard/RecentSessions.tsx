import { Card, Badge } from "@/components/ui";
import { mockRecentSessions } from "@/lib/mock-data";
import styles from "./RecentSessions.module.css";

export function RecentSessions() {
  return (
    <div>
      <h3 className={styles.heading}>Recent Sessions</h3>
      <div className={styles.list}>
        {mockRecentSessions.map((session) => (
          <Card key={session.id} variant="outlined">
            <div className={styles.session}>
              <div>
                <span className={styles.name}>{session.categoryName}</span>
                <span className={styles.date}>{session.date}</span>
              </div>
              <div className={styles.meta}>
                <Badge variant={session.score >= 70 ? "success" : "default"}>
                  {session.score}%
                </Badge>
                <span className={styles.duration}>{session.duration}min</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
