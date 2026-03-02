import Link from "next/link";
import { Card, Badge } from "@/components/ui";
import { mockDrillCategories } from "@/lib/mock-data";
import styles from "./DrillGrid.module.css";

const difficultyVariants = { beginner: "success", intermediate: "accent", advanced: "error" } as const;

export function DrillGrid() {
  return (
    <div className={styles.grid}>
      {mockDrillCategories.map((drill) => (
        <Link key={drill.id} href={`/practice/${drill.id}`}>
          <Card variant="outlined" className={styles.card}>
            <div className={styles.drill}>
              <span className={styles.icon}>{drill.icon}</span>
              <h3 className={styles.name}>{drill.name}</h3>
              <p className={styles.desc}>{drill.description}</p>
              <div className={styles.meta}>
                <Badge variant={difficultyVariants[drill.difficulty]}>{drill.difficulty}</Badge>
                <span className={styles.time}>{drill.estimatedMinutes} min</span>
              </div>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}
