import { useTranslations } from "next-intl";
import { Card, Badge } from "@/components/ui";
import { mockWeakSpots } from "@/lib/mock-data";
import styles from "./WeakSpots.module.css";

const trendIcons = { improving: "↑", declining: "↓", stable: "→" };
const trendVariants = { improving: "success", declining: "error", stable: "default" } as const;

export function WeakSpots() {
  const t = useTranslations("WeakSpots");

  return (
    <div>
      <h3 className={styles.heading}>{t("title")}</h3>
      <div className={styles.grid}>
        {mockWeakSpots.map((spot) => (
          <Card key={spot.phoneme} variant="outlined">
            <div className={styles.spot}>
              <span className={styles.phoneme}>{spot.phoneme}</span>
              <span className={styles.example}>{spot.example}</span>
              <div className={styles.meta}>
                <span className={styles.accuracy}>{spot.accuracy}%</span>
                <Badge variant={trendVariants[spot.trend]}>
                  {trendIcons[spot.trend]} {t(spot.trend)}
                </Badge>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
