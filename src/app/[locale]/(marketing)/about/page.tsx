import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui";
import styles from "./page.module.css";

export default async function AboutPage() {
  const t = await getTranslations("about");

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t("title")}</h1>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t("problemTitle")}</h2>
        <p className={styles.text}>{t("problemText")}</p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t("approachTitle")}</h2>
        <p className={styles.text}>{t("approachText")}</p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t("founderTitle")}</h2>
        <Card variant="outlined">
          <div className={styles.founder}>
            <h3 className={styles.founderName}>{t("founderName")}</h3>
            <p className={styles.founderRole}>{t("founderRole")}</p>
            <p className={styles.text}>{t("founderBio")}</p>
          </div>
        </Card>
      </section>
    </div>
  );
}
