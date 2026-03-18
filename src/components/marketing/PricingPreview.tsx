import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button, Card } from "@/components/ui";
import { NotifyForm } from "./NotifyForm";
import styles from "./PricingPreview.module.css";

export function PricingPreview() {
  const t = useTranslations("PricingPreview");

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.intro}>
          <h2 className={styles.heading}>{t("heading")}</h2>
        </div>
        <div className={styles.grid}>
          <Card variant="outlined" className={styles.planCard}>
            <div className={styles.plan}>
              <h3 className={styles.planName}>{t("free")}</h3>
              <div className={styles.price}>{t("freePrice")}</div>
              <ul className={styles.features}>
                <li>{t("freeFeature1")}</li>
                <li>{t("freeFeature2")}</li>
                <li>{t("freeFeature3")}</li>
              </ul>
              <Link href="/onboarding" className={styles.action}>
                <Button variant="secondary" size="md">{t("freeBtn")}</Button>
              </Link>
            </div>
          </Card>
          <Card variant="elevated" className={`${styles.planCard} ${styles.featured}`}>
            <div className={styles.plan}>
              <h3 className={styles.planName}>
                {t("premium")}
                <span className={styles.comingSoon}>{t("comingSoon")}</span>
              </h3>
              <div className={styles.price}>
                {t("premiumPrice")}
                <span className={styles.period}>{t("premiumPeriod")}</span>
              </div>
              <ul className={styles.features}>
                <li>{t("premiumFeature1")}</li>
                <li>{t("premiumFeature2")}</li>
                <li>{t("premiumFeature3")}</li>
                <li>{t("premiumFeature4")}</li>
              </ul>
              <p className={styles.notifyLabel}>{t("notifyLabel")}</p>
              <NotifyForm />
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
