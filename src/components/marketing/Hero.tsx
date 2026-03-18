import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";
import styles from "./Hero.module.css";

type DrillLink = {
  href: string;
  icon: string;
  label?: string;
  labelKey?: "freeAssessment";
  className?: "assessmentLink";
};

const drillLinks: DrillLink[] = [
  { href: "/onboarding", icon: "&#x1F399;", labelKey: "freeAssessment", className: "assessmentLink" },
  { href: "/practice/th-sounds", icon: "θ", label: "TH Sounds" },
  { href: "/practice/vowel-pairs", icon: "æ", label: "Vowel Pairs" },
  { href: "/practice/umlauts", icon: "ü", label: "Umlaute" },
  { href: "/practice/ch-sounds", icon: "ch", label: "CH-Laute" },
];

export function Hero() {
  const t = useTranslations("Hero");

  return (
    <section className={styles.hero}>
      <div className={styles.copy}>
        <span className={styles.kicker}>{t("demoLabel")}</span>
        <h1 className={styles.title}>
          {t("headline")}
          <br />
          <span className={styles.accent}>{t("accent")}</span>
        </h1>
        <p className={styles.subtitle}>{t("subtitle")}</p>
        <div className={styles.actions}>
          <Link href="/sign-up">
            <Button size="lg">{t("cta")}</Button>
          </Link>
          <Link href="/#features">
            <Button variant="secondary" size="lg">{t("howItWorks")}</Button>
          </Link>
        </div>
      </div>
      <div className={styles.visual}>
        <div className={styles.visualPanel}>
          <div className={styles.signalPanel}>
            <div className={styles.signalBadge}>{t("freeAssessment")}</div>
            <div className={styles.ringsWrap}>
              <svg viewBox="0 0 400 400" className={styles.rings}>
                {[160, 128, 96, 64, 32].map((radius, index) => (
                  <circle
                    key={radius}
                    cx="200"
                    cy="200"
                    r={radius}
                    fill="none"
                    stroke="var(--color-primary)"
                    strokeWidth="1"
                    opacity={0.12 + index * 0.1}
                  />
                ))}
              </svg>
              <div className={styles.signalCore}>
                <span className={styles.signalCoreText}>◉</span>
              </div>
            </div>
          </div>
          <div className={styles.demoSection}>
            <div className={styles.demoHeader}>
              <span className={styles.demoLabel}>{t("demoLabel")}</span>
              <Link href="/practice" className={styles.browseLink}>
                {t("browseAll")} →
              </Link>
            </div>
            <div className={styles.demoGrid}>
              {drillLinks.map((drill) => (
                <Link
                  key={drill.href}
                  href={drill.href}
                  className={`${styles.demoLink} ${drill.className ? styles[drill.className] : ""}`}
                >
                  <span className={styles.demoIcon} dangerouslySetInnerHTML={{ __html: drill.icon }} />
                  <span>{drill.labelKey ? t(drill.labelKey) : drill.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
