import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";
import styles from "./Hero.module.css";

export function Hero() {
  const t = useTranslations("Hero");

  return (
    <section className={styles.hero}>
      <div className={styles.content}>
        <h1 className={styles.title}>
          {t("headline")}
          <br />
          <span className={styles.accent}>{t("accent")}</span>
        </h1>
        <p className={styles.subtitle}>
          {t("subtitle")}
        </p>
        <div className={styles.actions}>
          <Link href="/sign-up">
            <Button size="lg">{t("cta")}</Button>
          </Link>
          <Link href="/#features">
            <Button variant="secondary" size="lg">{t("howItWorks")}</Button>
          </Link>
        </div>
        <div className={styles.demoSection}>
          <span className={styles.demoLabel}>{t("demoLabel")}</span>
          <div className={styles.demoLinks}>
            <Link href="/onboarding" className={`${styles.demoLink} ${styles.assessmentLink}`}>
              <span className={styles.demoIcon}>&#x1F399;</span>
              {t("freeAssessment")}
            </Link>
            <Link href="/practice/th-sounds" className={styles.demoLink}>
              <span className={styles.demoIcon}>θ</span>
              TH Sounds
            </Link>
            <Link href="/practice/vowel-pairs" className={styles.demoLink}>
              <span className={styles.demoIcon}>æ</span>
              Vowel Pairs
            </Link>
            <Link href="/practice/umlauts" className={styles.demoLink}>
              <span className={styles.demoIcon}>ü</span>
              Umlaute
            </Link>
            <Link href="/practice/ch-sounds" className={styles.demoLink}>
              <span className={styles.demoIcon}>ch</span>
              CH-Laute
            </Link>
          </div>
          <Link href="/practice" className={styles.demoLink}>
            {t("browseAll")} &rarr;
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
