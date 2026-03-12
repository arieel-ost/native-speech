import { Card, Button } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import styles from "./page.module.css";

export default async function PricingPage() {
  const t = await getTranslations("Pricing");

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t("title")}</h1>
      <p className={styles.subtitle}>{t("subtitle")}</p>
      <div className={styles.grid}>
        <Card variant="outlined">
          <div className={styles.plan}>
            <h2 className={styles.planName}>{t("free")}</h2>
            <div className={styles.price}>{t("freePrice")}</div>
            <ul className={styles.features}>
              <li>{t("freeFeature1")}</li>
              <li>{t("freeFeature2")}</li>
              <li>{t("freeFeature3")}</li>
              <li>{t("freeFeature4")}</li>
            </ul>
            <Link href="/sign-up"><Button variant="secondary">{t("freeBtn")}</Button></Link>
          </div>
        </Card>
        <Card variant="elevated">
          <div className={styles.plan}>
            <h2 className={styles.planName}>{t("premium")}</h2>
            <div className={styles.price}>{t("premiumPrice")}<span className={styles.period}>{t("premiumPeriod")}</span></div>
            <ul className={styles.features}>
              <li>{t("premiumFeature1")}</li>
              <li>{t("premiumFeature2")}</li>
              <li>{t("premiumFeature3")}</li>
              <li>{t("premiumFeature4")}</li>
              <li>{t("premiumFeature5")}</li>
              <li>{t("premiumFeature6")}</li>
            </ul>
            <Link href="/sign-up"><Button>{t("premiumBtn")}</Button></Link>
          </div>
        </Card>
        <Card variant="outlined">
          <div className={styles.plan}>
            <h2 className={styles.planName}>{t("enterprise")}</h2>
            <div className={styles.price}>{t("enterprisePrice")}</div>
            <ul className={styles.features}>
              <li>{t("enterpriseFeature1")}</li>
              <li>{t("enterpriseFeature2")}</li>
              <li>{t("enterpriseFeature3")}</li>
              <li>{t("enterpriseFeature4")}</li>
              <li>{t("enterpriseFeature5")}</li>
            </ul>
            <Button variant="secondary">{t("enterpriseBtn")}</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
