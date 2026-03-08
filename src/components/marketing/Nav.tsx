"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";
import styles from "./Nav.module.css";

export function Nav() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className={styles.nav}>
      <Link href="/" className={styles.logo}>
        <span className={styles.logoMark}>◉</span>
        <span className={styles.logoText}>NativeSpeech</span>
      </Link>
      <div className={styles.links}>
        <Link href="/#features" className={styles.link}>Features</Link>
        <Link href="/pricing" className={styles.link}>Pricing</Link>
        <Link href="/about" className={styles.link}>About</Link>
      </div>
      <div className={styles.actions}>
        <Link href="/dashboard">
          <Button variant="secondary" size="sm">Try Demo</Button>
        </Link>
        <Link href="/sign-in">
          <Button variant="ghost" size="sm">Sign In</Button>
        </Link>
        <Link href="/sign-up" className={styles.ctaDesktop}>
          <Button variant="primary" size="sm">Get Started</Button>
        </Link>
        <button
          className={styles.menuBtn}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
        >
          {menuOpen ? "✕" : "☰"}
        </button>
      </div>
      {menuOpen && (
        <div className={styles.mobileMenu}>
          <Link href="/#features" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>Features</Link>
          <Link href="/pricing" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>Pricing</Link>
          <Link href="/about" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>About</Link>
          <Link href="/dashboard" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>Try Demo</Link>
          <Link href="/sign-up" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>Get Started</Link>
        </div>
      )}
    </nav>
  );
}
