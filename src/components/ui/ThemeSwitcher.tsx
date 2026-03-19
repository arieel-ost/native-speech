"use client";

import { useTheme } from "@/providers/ThemeProvider";
import { themes, type Theme } from "@/lib/theme";
import styles from "./ThemeSwitcher.module.css";

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = themes.find((t) => t.slug === e.target.value);
    if (selected) setTheme(selected as Theme);
  };

  return (
    <select
      className={styles.select}
      value={theme.slug}
      onChange={handleChange}
      aria-label="Visual theme"
    >
      {themes.map((t) => (
        <option key={t.slug} value={t.slug}>
          {t.name}
        </option>
      ))}
    </select>
  );
}
