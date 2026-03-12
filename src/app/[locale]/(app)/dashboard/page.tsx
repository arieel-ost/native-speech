"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";
import { ScoreOverview } from "@/components/dashboard/ScoreOverview";
import { RecentSessions } from "@/components/dashboard/RecentSessions";
import { WeakSpots } from "@/components/dashboard/WeakSpots";
import { getProfile, getPhonemeProgress, getCurrentScore } from "@/lib/learner-store";
import styles from "./page.module.css";

function calculateStreak(sessions: { timestamp: string }[]): number {
  if (sessions.length === 0) return 0;
  const dates = [...new Set(
    sessions.map((s) => new Date(s.timestamp).toDateString())
  )].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  let streak = 0;
  const today = new Date();
  for (let i = 0; i < dates.length; i++) {
    const expected = new Date(today);
    expected.setDate(expected.getDate() - i);
    if (dates[i] === expected.toDateString()) {
      streak++;
    } else if (i === 0) {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      if (dates[i] === yesterday.toDateString()) {
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

export default function DashboardPage() {
  const t = useTranslations("Dashboard");
  const profile = getProfile();

  if (!profile) {
    return (
      <div className={styles.page}>
        <div className={styles.emptyState}>
          <h2>{t("noProfileTitle")}</h2>
          <p>{t("noProfileDescription")}</p>
          <Link href="/onboarding">
            <Button size="lg">{t("takeAssessment")}</Button>
          </Link>
        </div>
      </div>
    );
  }

  const score = getCurrentScore(profile);
  const phonemes = getPhonemeProgress(profile);
  const streak = calculateStreak(profile.sessions);

  return (
    <div className={styles.page}>
      <ScoreOverview
        score={score}
        sessionCount={profile.sessions.length}
        streak={streak}
      />
      <Link href="/practice">
        <Button size="lg">{t("startPractice")}</Button>
      </Link>
      <div className={styles.grid}>
        <WeakSpots phonemes={phonemes} />
        <RecentSessions sessions={profile.sessions} />
      </div>
    </div>
  );
}
