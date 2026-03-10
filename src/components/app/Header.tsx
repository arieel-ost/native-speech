"use client";

import { useTranslations } from "next-intl";
import { useAuth } from "@/providers/AuthProvider";
import { Badge, Button } from "@/components/ui";
import { mockUser } from "@/lib/mock-data";
import styles from "./Header.module.css";

export function Header() {
  const { user, toggle } = useAuth();
  const t = useTranslations("header");
  const tc = useTranslations("common");

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <h2 className={styles.greeting}>
          {t("greeting", { name: user?.name ?? tc("guest") })}
        </h2>
      </div>
      <div className={styles.right}>
        <Badge variant="accent">{tc("score")}: {mockUser.overallScore}</Badge>
        <Badge variant="success">{tc("dayStreak", { count: mockUser.streak })}</Badge>
        <Button variant="ghost" size="sm" onClick={toggle}>
          {user ? tc("signOut") : tc("signIn")}
        </Button>
      </div>
    </header>
  );
}
