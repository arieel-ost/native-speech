import Link from "next/link";
import { Button } from "@/components/ui";
import styles from "./Nav.module.css";

export function Nav() {
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
        <Link href="/sign-in">
          <Button variant="ghost" size="sm">Sign In</Button>
        </Link>
        <Link href="/sign-up">
          <Button variant="primary" size="sm">Get Started</Button>
        </Link>
      </div>
    </nav>
  );
}
