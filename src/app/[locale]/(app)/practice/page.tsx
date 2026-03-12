import { DrillGrid } from "@/components/practice/DrillGrid";
import styles from "./page.module.css";

export default function PracticePage() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Practice</h1>
      <p className={styles.subtitle}>Choose a drill to start practicing.</p>
      <DrillGrid />
    </div>
  );
}
