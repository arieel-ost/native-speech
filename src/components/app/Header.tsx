"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { useTranslations } from "next-intl";
import { Badge, Button } from "@/components/ui";
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";
import { getProfile, getCurrentScore } from "@/lib/learner-store";
import styles from "./Header.module.css";

function calculateStreak(sessions: { timestamp: string }[]): number {
  if (sessions.length === 0) return 0;
  const dates = [...new Set(
    sessions.map((s) => new Date(s.timestamp).toDateString())
  )].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  let streak = 0;
  const today = new Date();
  let offset = 0;
  for (let i = 0; i < dates.length; i++) {
    const expected = new Date(today);
    expected.setDate(expected.getDate() - i - offset);
    if (dates[i] === expected.toDateString()) {
      streak++;
    } else if (i === 0) {
      offset = 1;
      expected.setDate(expected.getDate() - 1);
      if (dates[i] === expected.toDateString()) {
        streak++;
      } else {
        break;
      }
    } else {
      break;
    }
  }
  return streak;
}

export function Header() {
  const { user, toggle } = useAuth();
  const t = useTranslations("Header");
  const [score, setScore] = useState<number | null>(null);
  const [streak, setStreak] = useState<number | null>(null);

  useEffect(() => {
    const profile = getProfile();
    if (profile) {
      setScore(getCurrentScore(profile));
      setStreak(calculateStreak(profile.sessions));
    }
  }, []);

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <h2 className={styles.greeting}>
          {t("greeting", { name: user?.name ?? t("guest") })}
        </h2>
      </div>
      <div className={styles.right}>
        <ThemeSwitcher />
        <LocaleSwitcher />
        {score !== null && (
          <Badge variant="accent">{t("score", { value: score })}</Badge>
        )}
        {streak !== null && streak > 0 && (
          <Badge variant="success">{t("streak", { count: streak })}</Badge>
        )}
        <Button variant="ghost" size="sm" onClick={toggle}>
          {user ? t("signOut") : t("signIn")}
        </Button>
      </div>
    </header>
  );
}
