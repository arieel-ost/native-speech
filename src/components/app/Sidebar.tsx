"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import styles from "./Sidebar.module.css";

export function Sidebar() {
  const pathname = usePathname();
  const t = useTranslations("sidebar");
  const tc = useTranslations("common");

  const navItems = [
    { href: "/dashboard" as const, labelKey: "dashboard" as const, icon: "◉" },
    { href: "/practice" as const, labelKey: "practice" as const, icon: "◇" },
    { href: "/progress" as const, labelKey: "progress" as const, icon: "◈" },
    { href: "/settings" as const, labelKey: "settings" as const, icon: "⚙" },
  ];

  return (
    <>
      {/* Desktop sidebar */}
      <aside className={styles.sidebar}>
        <Link href="/" className={styles.logo}>
          <span className={styles.logoMark}>◉</span>
          <span className={styles.logoText}>{tc("appName")}</span>
        </Link>
        <nav className={styles.nav}>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${pathname.startsWith(item.href) ? styles.active : ""}`}
            >
              <span className={styles.icon}>{item.icon}</span>
              <span>{t(item.labelKey)}</span>
            </Link>
          ))}
        </nav>
      </aside>
      {/* Mobile bottom tab bar */}
      <nav className={styles.tabBar}>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.tab} ${pathname.startsWith(item.href) ? styles.active : ""}`}
          >
            <span className={styles.tabIcon}>{item.icon}</span>
            <span className={styles.tabLabel}>{t(item.labelKey)}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
