"use client";

import { useState, useEffect } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Card, Badge } from "@/components/ui";
import { mockDrillCategories, phonemeDrills, type Language } from "@/lib/mock-data";
import { getProfile, type LearnerProfile } from "@/lib/learner-store";
import styles from "./DrillGrid.module.css";

const difficultyVariants = { beginner: "success", intermediate: "accent", advanced: "error" } as const;

export function DrillGrid() {
  const t = useTranslations("DrillGrid");
  const tDrills = useTranslations("Drills");
  const [profile, setProfile] = useState<LearnerProfile | null>(null);

  useEffect(() => {
    setProfile(getProfile());
  }, []);

  const recommended = profile?.assessment.recommendedDrills ?? [];
  const targetLanguage = profile?.language;

  // Filter to target language if profile exists, otherwise show all
  const drills = targetLanguage
    ? mockDrillCategories.filter((d) => d.language === targetLanguage)
    : mockDrillCategories;

  const languages = [...new Set(drills.map((d) => d.language))] as Language[];

  // Find first unpracticed recommended drill for "Start here" badge
  const practicedCategories = new Set(profile?.sessions.map((s) => s.drillCategoryId) ?? []);
  const startHereDrill = recommended.find((id) => !practicedCategories.has(id));

  // Group phoneme drills by language
  const phonemeDrillsByLang = phonemeDrills.reduce(
    (acc, d) => {
      if (!targetLanguage || d.language === targetLanguage) {
        (acc[d.language] ??= []).push(d);
      }
      return acc;
    },
    {} as Record<Language, typeof phonemeDrills>,
  );

  return (
    <div className={styles.sections}>
      {languages.map((lang) => {
        const langDrills = drills.filter((d) => d.language === lang);
        // Sort: recommended first (in recommendation order), then the rest
        const sorted = [...langDrills].sort((a, b) => {
          const aIdx = recommended.indexOf(a.id);
          const bIdx = recommended.indexOf(b.id);
          if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
          if (aIdx !== -1) return -1;
          if (bIdx !== -1) return 1;
          return 0;
        });

        const langPhonemeDrills = phonemeDrillsByLang[lang] ?? [];

        return (
          <section key={lang} className={styles.section}>
            <h2 className={styles.langHeading}>{t(lang)}</h2>
            <div className={styles.grid}>
              {sorted.map((drill) => {
                const isRecommended = recommended.includes(drill.id);
                const isStartHere = drill.id === startHereDrill;
                return (
                  <Link key={drill.id} href={`/practice/${drill.id}`}>
                    <Card
                      variant="outlined"
                      className={`${styles.card} ${isStartHere ? styles.startHere : isRecommended ? styles.recommended : ""}`}
                    >
                      <div className={styles.drill}>
                        {isStartHere && (
                          <Badge variant="accent">{t("startHere")}</Badge>
                        )}
                        {isRecommended && !isStartHere && (
                          <Badge variant="default">{t("recommended")}</Badge>
                        )}
                        <span className={styles.icon}>{drill.icon}</span>
                        <h3 className={styles.name}>{tDrills(`${drill.id}.name`)}</h3>
                        <p className={styles.desc}>{tDrills(`${drill.id}.description`)}</p>
                        <div className={styles.meta}>
                          <Badge variant={difficultyVariants[drill.difficulty]}>{drill.difficulty}</Badge>
                          <span className={styles.time}>{t("min", { count: drill.estimatedMinutes })}</span>
                        </div>
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>

            {langPhonemeDrills.length > 0 && (
              <>
                <h3 className={styles.langHeading} style={{ fontSize: "1rem", marginTop: "var(--space-md)" }}>
                  {t("phonemeDrills")}
                </h3>
                <div className={styles.grid}>
                  {langPhonemeDrills.map((pd) => (
                    <Link key={pd.id} href={`/practice/phoneme/${pd.id}`}>
                      <Card variant="outlined" className={styles.card}>
                        <div className={styles.drill}>
                          <Badge variant="accent">{t("phonemeFocus")}</Badge>
                          <span className={styles.icon}>{pd.phoneme}</span>
                          <h3 className={styles.name}>{pd.name}</h3>
                          <p className={styles.desc}>{pd.description}</p>
                          <div className={styles.meta}>
                            <span className={styles.time}>{pd.steps.length} {t("steps")}</span>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </section>
        );
      })}
    </div>
  );
}
