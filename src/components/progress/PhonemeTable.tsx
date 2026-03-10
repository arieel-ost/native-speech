import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui";
import { mockPhonemeProgress } from "@/lib/mock-data";
import styles from "./PhonemeTable.module.css";

const trendVariants = { improving: "success", declining: "error", stable: "default" } as const;

export function PhonemeTable() {
  const t = useTranslations("phonemeTable");

  const trendLabels = {
    improving: `↑ ${t("improving")}`,
    declining: `↓ ${t("declining")}`,
    stable: `→ ${t("stable")}`,
  };

  return (
    <div>
      <h3 className={styles.heading}>{t("heading")}</h3>
      <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>{t("phoneme")}</th>
            <th>{t("name")}</th>
            <th>{t("accuracy")}</th>
            <th>{t("practice")}</th>
            <th>{t("trend")}</th>
          </tr>
        </thead>
        <tbody>
          {mockPhonemeProgress.map((p) => (
            <tr key={p.phoneme}>
              <td className={styles.phoneme}>{p.phoneme}</td>
              <td>{p.name}</td>
              <td>
                <div className={styles.bar}>
                  <div className={styles.barFill} style={{ width: `${p.accuracy}%` }} />
                  <span className={styles.barLabel}>{p.accuracy}%</span>
                </div>
              </td>
              <td className={styles.count}>{p.practiceCount}x</td>
              <td><Badge variant={trendVariants[p.trend]}>{trendLabels[p.trend]}</Badge></td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
