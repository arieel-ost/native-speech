import Link from "next/link";
import { Button } from "@/components/ui";
import styles from "./Hero.module.css";

export function Hero() {
  return (
    <section className={styles.hero}>
      <div className={styles.content}>
        <h1 className={styles.title}>
          Your accent has a pattern.
          <br />
          <span className={styles.accent}>We decode it.</span>
        </h1>
        <p className={styles.subtitle}>
          AI-powered coaching that diagnoses exactly why you mispronounce sounds
          based on your native language — then builds personalized drills to fix them.
        </p>
        <div className={styles.actions}>
          <Link href="/sign-up">
            <Button size="lg">Start Free Assessment</Button>
          </Link>
          <Link href="/#features">
            <Button variant="secondary" size="lg">See How It Works</Button>
          </Link>
        </div>
      </div>
      <div className={styles.visual}>
        {/* Concentric circle visualization — Resonant Geometry motif */}
        <svg viewBox="0 0 400 400" className={styles.rings}>
          {[160, 130, 100, 70, 40].map((r, i) => (
            <circle
              key={r}
              cx="200"
              cy="200"
              r={r}
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth="1"
              opacity={0.15 + i * 0.1}
            />
          ))}
          <circle cx="200" cy="200" r="6" fill="var(--color-accent)" />
        </svg>
      </div>
    </section>
  );
}
