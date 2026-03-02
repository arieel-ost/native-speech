import { Badge } from "@/components/ui";
import { mockPhonemeProgress } from "@/lib/mock-data";
import styles from "./PhonemeTable.module.css";

const trendVariants = { improving: "success", declining: "error", stable: "default" } as const;
const trendLabels = { improving: "↑ Improving", declining: "↓ Declining", stable: "→ Stable" };

export function PhonemeTable() {
  return (
    <div>
      <h3 className={styles.heading}>Per-Phoneme Breakdown</h3>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Phoneme</th>
            <th>Name</th>
            <th>Accuracy</th>
            <th>Practice</th>
            <th>Trend</th>
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
  );
}
