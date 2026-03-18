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
        <div className={styles.intro}>
          <h2 className={styles.heading}>{t("heading")}</h2>
          <p className={styles.subheading}>{t("subheading")}</p>
        </div>
        <div className={styles.grid}>
          {featureKeys.map((feature, index) => (
            <Card
              key={feature.key}
              variant={index === 0 ? "elevated" : "outlined"}
              className={`${styles.featureCard} ${index === 0 ? styles.featureCardLarge : ""}`}
            >
              <div className={styles.feature}>
                <div className={styles.meta}>
                  <span className={styles.index}>0{index + 1}</span>
                  <span className={styles.icon}>{feature.icon}</span>
                </div>
                <h3 className={styles.featureTitle}>{t(`${feature.key}Title`)}</h3>
                <p className={styles.featureDesc}>{t(`${feature.key}Desc`)}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
