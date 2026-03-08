import Link from "next/link";
import { Card, Badge } from "@/components/ui";
import { mockDrillCategories, type Language } from "@/lib/mock-data";
import styles from "./DrillGrid.module.css";

const difficultyVariants = { beginner: "success", intermediate: "accent", advanced: "error" } as const;

const languageLabels: Record<Language, string> = {
  english: "English",
  german: "Deutsch",
};

export function DrillGrid() {
  const languages = [...new Set(mockDrillCategories.map((d) => d.language))] as Language[];

  return (
    <div className={styles.sections}>
      {languages.map((lang) => (
        <section key={lang} className={styles.section}>
          <h2 className={styles.langHeading}>{languageLabels[lang]}</h2>
          <div className={styles.grid}>
            {mockDrillCategories
              .filter((drill) => drill.language === lang)
              .map((drill) => (
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
        </section>
      ))}
    </div>
  );
}
