"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";
import styles from "./Nav.module.css";

export function Nav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const t = useTranslations("Nav");

  return (
    <nav className={styles.nav}>
      <div className={styles.bar}>
        <Link href="/" className={styles.logo}>
          <span className={styles.logoMark}>◉</span>
          <span className={styles.logoText}>NativeSpeech</span>
        </Link>
        <div className={styles.links}>
          <Link href="/#features" className={styles.link}>{t("features")}</Link>
          <Link href="/pricing" className={styles.link}>{t("pricing")}</Link>
          <Link href="/about" className={styles.link}>{t("about")}</Link>
        </div>
        <div className={styles.actions}>
          <ThemeSwitcher />
          <LocaleSwitcher />
          <Link href="/onboarding">
            <Button variant="secondary" size="sm">{t("tryDemo")}</Button>
          </Link>
          <Link href="/sign-in">
            <Button variant="ghost" size="sm">{t("signIn")}</Button>
          </Link>
          <button
            className={styles.menuBtn}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={t("toggleMenu")}
            aria-expanded={menuOpen}
          >
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>
      {menuOpen && (
        <div className={styles.mobileMenu}>
          <Link href="/#features" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>{t("features")}</Link>
          <Link href="/pricing" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>{t("pricing")}</Link>
          <Link href="/about" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>{t("about")}</Link>
          <Link href="/onboarding" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>{t("tryDemo")}</Link>
        </div>
      )}
    </nav>
  );
}
