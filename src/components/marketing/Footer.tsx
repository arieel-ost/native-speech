import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import styles from "./Footer.module.css";

export function Footer() {
  const t = useTranslations("footer");
  const tc = useTranslations("common");
  const tn = useTranslations("nav");

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <span className={styles.logo}>◉ {tc("appName")}</span>
          <p className={styles.tagline}>{tc("tagline")}</p>
        </div>
        <div className={styles.columns}>
          <div>
            <h4 className={styles.heading}>{t("product")}</h4>
            <Link href="/#features" className={styles.link}>{tn("features")}</Link>
            <Link href="/pricing" className={styles.link}>{tn("pricing")}</Link>
          </div>
          <div>
            <h4 className={styles.heading}>{t("company")}</h4>
            <Link href="/about" className={styles.link}>{tn("about")}</Link>
          </div>
          <div>
            <h4 className={styles.heading}>{t("legal")}</h4>
            <span className={styles.link}>{t("privacy")}</span>
            <span className={styles.link}>{t("terms")}</span>
          </div>
        </div>
      </div>
      <div className={styles.bottom}>
        <span>{t("copyright")}</span>
      </div>
    </footer>
  );
}
