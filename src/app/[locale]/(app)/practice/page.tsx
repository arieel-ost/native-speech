import { useTranslations } from "next-intl";
import { DrillGrid } from "@/components/practice/DrillGrid";
import styles from "./page.module.css";

export default function PracticePage() {
  const t = useTranslations("Practice");

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t("title")}</h1>
      <p className={styles.subtitle}>{t("subtitle")}</p>
      <DrillGrid />
    </div>
  );
}
