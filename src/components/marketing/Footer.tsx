import Link from "next/link";
import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <span className={styles.logo}>◉ NativeSpeech</span>
          <p className={styles.tagline}>Your AI-Powered Accent Coach</p>
        </div>
        <div className={styles.columns}>
          <div>
            <h4 className={styles.heading}>Product</h4>
            <Link href="/#features" className={styles.link}>Features</Link>
            <Link href="/pricing" className={styles.link}>Pricing</Link>
          </div>
          <div>
            <h4 className={styles.heading}>Company</h4>
            <Link href="/about" className={styles.link}>About</Link>
          </div>
          <div>
            <h4 className={styles.heading}>Legal</h4>
            <span className={styles.link}>Privacy</span>
            <span className={styles.link}>Terms</span>
          </div>
        </div>
      </div>
      <div className={styles.bottom}>
        <span>© 2026 NativeSpeechAI. All rights reserved.</span>
      </div>
    </footer>
  );
}
