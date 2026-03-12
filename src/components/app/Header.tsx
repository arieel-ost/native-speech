"use client";

import { useAuth } from "@/providers/AuthProvider";
import { useTranslations } from "next-intl";
import { Badge, Button } from "@/components/ui";
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher";
import { mockUser } from "@/lib/mock-data";
import styles from "./Header.module.css";

export function Header() {
  const { user, toggle } = useAuth();
  const t = useTranslations("Header");

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <h2 className={styles.greeting}>
          {t("greeting", { name: user?.name ?? t("guest") })}
        </h2>
      </div>
      <div className={styles.right}>
        <LocaleSwitcher />
        <Badge variant="accent">{t("score", { value: mockUser.overallScore })}</Badge>
        <Badge variant="success">{t("streak", { count: mockUser.streak })}</Badge>
        <Button variant="ghost" size="sm" onClick={toggle}>
          {user ? t("signOut") : t("signIn")}
        </Button>
      </div>
    </header>
  );
}
