import { useTranslations } from "next-intl";
import { Card } from "@/components/ui";
import styles from "./Features.module.css";

export function Features() {
  const t = useTranslations("features");

  const features = [
    { titleKey: "l1l2Title" as const, descKey: "l1l2Desc" as const, icon: "◎" },
    { titleKey: "drillsTitle" as const, descKey: "drillsDesc" as const, icon: "◇" },
    { titleKey: "trackingTitle" as const, descKey: "trackingDesc" as const, icon: "◈" },
    { titleKey: "multiLangTitle" as const, descKey: "multiLangDesc" as const, icon: "◉" },
  ];

  return (
    <section id="features" className={styles.section}>
      <div className={styles.inner}>
        <h2 className={styles.heading}>{t("heading")}</h2>
        <p className={styles.subheading}>{t("subheading")}</p>
        <div className={styles.grid}>
          {features.map((f) => (
            <Card key={f.titleKey} variant="outlined">
              <div className={styles.feature}>
                <span className={styles.icon}>{f.icon}</span>
                <h3 className={styles.featureTitle}>{t(f.titleKey)}</h3>
                <p className={styles.featureDesc}>{t(f.descKey)}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
