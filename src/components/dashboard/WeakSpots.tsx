"use client";

import { useTranslations } from "next-intl";
import { Card, Badge } from "@/components/ui";
import type { PhonemeProgress } from "@/lib/learner-store";
import styles from "./WeakSpots.module.css";

const statusVariants = {
  not_started: "default",
  struggled: "error",
  improving: "accent",
  strong: "success",
} as const;

interface WeakSpotsProps {
  phonemes: PhonemeProgress[];
}

export function WeakSpots({ phonemes }: WeakSpotsProps) {
  const t = useTranslations("WeakSpots");

  return (
    <div>
      <h3 className={styles.heading}>{t("title")}</h3>
      <div className={styles.grid}>
        {phonemes.map((p) => (
          <Card key={p.phoneme} variant="outlined">
            <div className={styles.spot}>
              <span className={styles.phoneme}>{p.phoneme}</span>
              <span className={styles.example}>{p.exampleWord}</span>
              <div className={styles.meta}>
                <Badge variant={statusVariants[p.status]}>
                  {t(p.status)}
                </Badge>
                {p.practiceCount > 0 && (
                  <span className={styles.accuracy}>
                    {t("practiced", { count: p.practiceCount })}
                  </span>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
