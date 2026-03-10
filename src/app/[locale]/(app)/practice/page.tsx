import { getTranslations } from "next-intl/server";
import { DrillGrid } from "@/components/practice/DrillGrid";
import styles from "./page.module.css";

export default async function PracticePage() {
  const t = await getTranslations("practicePage");

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t("title")}</h1>
      <p className={styles.subtitle}>{t("subtitle")}</p>
      <DrillGrid />
    </div>
  );
}
