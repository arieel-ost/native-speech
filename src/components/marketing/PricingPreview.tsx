import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button, Card } from "@/components/ui";
import styles from "./PricingPreview.module.css";

export function PricingPreview() {
  const t = useTranslations("pricingPreview");
  const tc = useTranslations("common");

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <h2 className={styles.heading}>{t("heading")}</h2>
        <div className={styles.grid}>
          <Card variant="outlined">
            <div className={styles.plan}>
              <h3 className={styles.planName}>{t("free")}</h3>
              <div className={styles.price}>{t("freePrice")}</div>
              <ul className={styles.features}>
                <li>{t("freeFeature1")}</li>
                <li>{t("freeFeature2")}</li>
                <li>{t("freeFeature3")}</li>
              </ul>
              <Link href="/sign-up"><Button variant="secondary" size="md">{tc("getStarted")}</Button></Link>
            </div>
          </Card>
          <Card variant="elevated">
            <div className={styles.plan}>
              <h3 className={styles.planName}>{t("premium")}</h3>
              <div className={styles.price}>{t("premiumPrice")}<span className={styles.period}>{t("premiumPeriod")}</span></div>
              <ul className={styles.features}>
                <li>{t("premiumFeature1")}</li>
                <li>{t("premiumFeature2")}</li>
                <li>{t("premiumFeature3")}</li>
                <li>{t("premiumFeature4")}</li>
              </ul>
              <Link href="/sign-up"><Button size="md">{t("startTrial")}</Button></Link>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
