"use client";

import { useTranslations } from "next-intl";
import { Card, Badge } from "@/components/ui";
import type { SessionRecord } from "@/lib/learner-store";
import { mockDrillCategories, phonemeDrills } from "@/lib/mock-data";
import styles from "./RecentSessions.module.css";

interface RecentSessionsProps {
  sessions: SessionRecord[];
}

export function RecentSessions({ sessions }: RecentSessionsProps) {
  const t = useTranslations("RecentSessions");

  const recent = [...sessions].reverse().slice(0, 10);

  if (recent.length === 0) {
    return (
      <div>
        <h3 className={styles.heading}>{t("title")}</h3>
        <Card variant="outlined">
          <p className={styles.empty}>{t("noSessions")}</p>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <h3 className={styles.heading}>{t("title")}</h3>
      <div className={styles.list}>
        {recent.map((session) => {
          const category = mockDrillCategories.find((c) => c.id === session.drillCategoryId);
          const phonemeDrill = !category
            ? phonemeDrills.find((d) => d.id === session.drillCategoryId)
            : null;
          const displayName = category?.name ?? (phonemeDrill ? `${phonemeDrill.phoneme} ${phonemeDrill.name}` : session.drillCategoryId);
          const date = new Date(session.timestamp).toLocaleDateString();
          return (
            <Card key={session.id} variant="outlined">
              <div className={styles.session}>
                <div>
                  <span className={styles.name}>{displayName}</span>
                  <span className={styles.date}>{date}</span>
                </div>
                <Badge variant={session.overallScore >= 7 ? "success" : "default"}>
                  {session.overallScore}/10
                </Badge>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
