import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import styles from "./Footer.module.css";

export function Footer() {
  const t = useTranslations("Footer");

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <span className={styles.logo}>◉ NativeSpeech</span>
          <p className={styles.tagline}>{t("tagline")}</p>
        </div>
        <div className={styles.columns}>
          <div>
            <h4 className={styles.heading}>{t("product")}</h4>
            <Link href="/#features" className={styles.link}>{t("features")}</Link>
            <Link href="/pricing" className={styles.link}>{t("pricing")}</Link>
          </div>
          <div>
            <h4 className={styles.heading}>{t("company")}</h4>
            <Link href="/about" className={styles.link}>{t("about")}</Link>
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
