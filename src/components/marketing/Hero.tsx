import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";
import styles from "./Hero.module.css";

const mockPhonemes = [
  { symbol: "θ", name: "th", score: 38, rating: "needs_work" as const },
  { symbol: "æ", name: "short a", score: 55, rating: "acceptable" as const },
  { symbol: "ɹ", name: "r", score: 81, rating: "good" as const },
  { symbol: "ʊ", name: "short oo", score: 63, rating: "acceptable" as const },
];

function ScoreArc({ score }: { score: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  return (
    <div className={styles.scoreArc}>
      <svg viewBox="0 0 128 128" className={styles.arcSvg}>
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          stroke="rgba(246, 239, 231, 0.08)"
          strokeWidth="6"
        />
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          stroke="url(#scoreGradient)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${progress} ${circumference - progress}`}
          strokeDashoffset={circumference * 0.25}
          className={styles.arcProgress}
        />
        <defs>
          <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-accent)" />
            <stop offset="100%" stopColor="var(--color-primary)" />
          </linearGradient>
        </defs>
      </svg>
      <div className={styles.scoreValue}>
        <span className={styles.scoreNumber}>{score}</span>
        <span className={styles.scoreLabel}>/ 100</span>
      </div>
    </div>
  );
}

export function Hero() {
  const t = useTranslations("Hero");

  return (
    <section className={styles.hero}>
      <div className={styles.copy}>
        <h1 className={styles.title}>
          <span className={styles.titleLead}>{t("headline")}</span>
          <span className={styles.accent}>{t("accent")}</span>
        </h1>
        <p className={styles.definition}>{t("definition")}</p>
        <p className={styles.hook}>{t("hook")}</p>
        <p className={styles.subtitle}>{t("subtitle")}</p>
        <div className={styles.actions}>
          <Link href="/onboarding">
            <Button size="lg">{t("cta")}</Button>
          </Link>
          <span className={styles.timeBadge}>{t("badge")}</span>
        </div>
        <Link href="/practice" className={styles.browseLink}>
          {t("browseAll")} →
        </Link>
      </div>
      <div className={styles.visual}>
        <div className={styles.resultCard}>
          <div className={styles.resultBody}>
            <ScoreArc score={72} />
            <div className={styles.resultDetails}>
              <p className={styles.resultLabel}>{t("resultLabel")}</p>
              <div className={styles.phonemeList}>
                {mockPhonemes.map((p) => (
                  <div key={p.symbol} className={`${styles.phonemeChip} ${styles[p.rating]}`}>
                    <span className={styles.phonemeSymbol}>/{p.symbol}/</span>
                    <span className={styles.phonemeName}>{p.name}</span>
                    <span className={styles.phonemeBar}>
                      <span
                        className={styles.phonemeFill}
                        style={{ width: `${p.score}%` }}
                      />
                    </span>
                  </div>
                ))}
              </div>
              <p className={styles.resultCaption}>{t("resultCaption")}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
