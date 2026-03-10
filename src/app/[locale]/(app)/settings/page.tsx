import { getTranslations } from "next-intl/server";
import { Card, Input, Button } from "@/components/ui";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { mockUser } from "@/lib/mock-data";
import styles from "./page.module.css";

export default async function SettingsPage() {
  const t = await getTranslations("settings");
  const tc = await getTranslations("common");

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t("title")}</h1>

      <Card variant="outlined">
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>{t("profile")}</h2>
          <div className={styles.fields}>
            <Input label={tc("name")} defaultValue={mockUser.name} />
            <Input label={tc("email")} type="email" defaultValue={mockUser.email} />
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
              <label className={styles.label}>{t("interfaceLanguage")}</label>
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      </Card>

      <Card variant="outlined">
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>{t("subscription")}</h2>
          <p className={styles.planStatus}>{t("freePlan")}</p>
          <Button variant="primary">{t("upgradePremium")}</Button>
        </div>
      </Card>
    </div>
  );
}
