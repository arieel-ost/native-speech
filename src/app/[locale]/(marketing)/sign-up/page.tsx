import { signIn } from "@/auth";
import { getTranslations } from "next-intl/server";
import { Card, Button, Input } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import styles from "./page.module.css";

export default async function SignUpPage() {
  const t = await getTranslations("signUpPage");
  const tc = await getTranslations("common");

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
              <Input label={tc("name")} name="name" type="text" placeholder={t("namePlaceholder")} required />
              <Input label={tc("email")} name="email" type="email" placeholder={t("emailPlaceholder")} required />
              <Input label={tc("password")} name="password" type="password" placeholder={t("passwordPlaceholder")} required />
            </div>
            <Button type="submit" className={styles.submitBtn}>{t("createAccount")}</Button>
          </form>
          <div className={styles.divider}><span>{tc("or")}</span></div>
          <form
            action={async () => {
              "use server";
              await signIn("google");
            }}
          >
            <Button type="submit" variant="secondary" className={styles.submitBtn}>
              {t("continueGoogle")}
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
