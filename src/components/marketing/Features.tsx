import { useTranslations } from "next-intl";
import { Card } from "@/components/ui";
import styles from "./Features.module.css";

const featureKeys = [
  { key: "l1l2", icon: "◎" },
  { key: "drills", icon: "◇" },
  { key: "tracking", icon: "◈" },
  { key: "multiLang", icon: "◉" },
];

export function Features() {
  const t = useTranslations("Features");

  return (
    <section id="features" className={styles.section}>
      <div className={styles.inner}>
        <h2 className={styles.heading}>{t("heading")}</h2>
        <p className={styles.subheading}>{t("subheading")}</p>
        <div className={styles.grid}>
          {featureKeys.map((f) => (
            <Card key={f.key} variant="outlined">
              <div className={styles.feature}>
                <span className={styles.icon}>{f.icon}</span>
                <h3 className={styles.featureTitle}>{t(`${f.key}Title`)}</h3>
                <p className={styles.featureDesc}>{t(`${f.key}Desc`)}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
