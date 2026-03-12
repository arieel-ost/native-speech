import { signIn } from "@/auth";
import { Card, Button, Input } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import styles from "./page.module.css";

export default async function SignUpPage() {
  const t = await getTranslations("SignUp");

  return (
    <div className={styles.container}>
      <Card variant="outlined">
        <div className={styles.form}>
          <h1 className={styles.title}>{t("title")}</h1>
          <p className={styles.subtitle}>{t("subtitle")}</p>
          <form
            action={async (formData) => {
              "use server";
              // TODO: Create user, then sign in
              await signIn("credentials", formData);
            }}
          >
            <div className={styles.fields}>
              <Input label={t("name")} name="name" type="text" placeholder={t("namePlaceholder")} required />
              <Input label={t("email")} name="email" type="email" placeholder={t("emailPlaceholder")} required />
              <Input label={t("password")} name="password" type="password" placeholder={t("passwordPlaceholder")} required />
            </div>
            <Button type="submit" className={styles.submitBtn}>{t("submit")}</Button>
          </form>
          <div className={styles.divider}><span>{t("or")}</span></div>
          <form
            action={async () => {
              "use server";
              await signIn("google");
            }}
          >
            <Button type="submit" variant="secondary" className={styles.submitBtn}>
              {t("google")}
            </Button>
          </form>
          <p className={styles.footer}>
            {t("hasAccount")} <Link href="/sign-in" className={styles.link}>{t("signInLink")}</Link>
          </p>
        </div>
      </Card>
    </div>
  );
}
