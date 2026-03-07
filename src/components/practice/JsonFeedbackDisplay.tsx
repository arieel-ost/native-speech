"use client";

import styles from "./JsonFeedbackDisplay.module.css";

export function JsonFeedbackDisplay({ data }: { data: Record<string, unknown> }) {
  return (
    <pre className={styles.json}>{JSON.stringify(data, null, 2)}</pre>
  );
}
