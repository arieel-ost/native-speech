"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import styles from "./Sidebar.module.css";

const navItems = [
  { href: "/dashboard" as const, key: "dashboard" as const, icon: "◉" },
  { href: "/practice" as const, key: "practice" as const, icon: "◇" },
  { href: "/progress" as const, key: "progress" as const, icon: "◈" },
  { href: "/settings" as const, key: "settings" as const, icon: "⚙" },
];

export function Sidebar() {
  const pathname = usePathname();
  const t = useTranslations("Sidebar");

  return (
    <>
      {/* Desktop sidebar */}
      <aside className={styles.sidebar}>
        <Link href="/" className={styles.logo}>
          <span className={styles.logoMark}>◉</span>
          <span className={styles.logoText}>liltra</span>
        </Link>
        <nav className={styles.nav}>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${pathname.startsWith(item.href) ? styles.active : ""}`}
            >
              <span className={styles.icon}>{item.icon}</span>
              <span>{t(item.key)}</span>
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
            <span className={styles.tabLabel}>{t(item.key)}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
