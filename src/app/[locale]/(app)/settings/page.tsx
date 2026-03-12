import { useTranslations } from "next-intl";
import { Card, Input, Button } from "@/components/ui";
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher";
import { mockUser } from "@/lib/mock-data";
import styles from "./page.module.css";

export default function SettingsPage() {
  const t = useTranslations("Settings");

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t("title")}</h1>

      <Card variant="outlined">
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>{t("profile")}</h2>
          <div className={styles.fields}>
            <Input label={t("name")} defaultValue={mockUser.name} />
            <Input label={t("email")} type="email" defaultValue={mockUser.email} />
          </div>
        </div>
      </Card>

      <Card variant="outlined">
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>{t("languageSettings")}</h2>
          <div className={styles.fields}>
            <div className={styles.selectWrapper}>
              <label className={styles.label}>{t("nativeLanguage")}</label>
              <select className={styles.select} defaultValue={mockUser.nativeLanguage}>
                <option>Mandarin Chinese</option>
                <option>Spanish</option>
                <option>Arabic</option>
                <option>Russian</option>
                <option>German</option>
                <option>Japanese</option>
                <option>Korean</option>
                <option>Portuguese</option>
                <option>French</option>
                <option>Hindi</option>
              </select>
            </div>
            <div className={styles.selectWrapper}>
              <label className={styles.label}>{t("targetLanguage")}</label>
              <select className={styles.select} defaultValue={mockUser.targetLanguage}>
                <option>English</option>
                <option>German</option>
              </select>
            </div>
            <div className={styles.selectWrapper}>
              <label className={styles.label}>{t("uiLanguage")}</label>
              <LocaleSwitcher />
            </div>
          </div>
        </div>
      </Card>

      <Card variant="outlined">
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>{t("subscription")}</h2>
          <p className={styles.planStatus}>{t("freePlan")}</p>
          <Button variant="primary">{t("upgrade")}</Button>
        </div>
      </Card>
    </div>
  );
}
