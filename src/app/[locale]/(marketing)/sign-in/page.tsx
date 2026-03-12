import { signIn } from "@/auth";
import { Card, Button, Input } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import styles from "./page.module.css";

export default async function SignInPage() {
  const t = await getTranslations("SignIn");

  return (
    <div className={styles.container}>
      <Card variant="outlined">
        <div className={styles.form}>
          <h1 className={styles.title}>{t("title")}</h1>
          <form
            action={async (formData) => {
              "use server";
              await signIn("credentials", formData);
            }}
          >
            <div className={styles.fields}>
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
          <form
            action={async () => {
              "use server";
              await signIn("credentials", { email: "demo@nativespeech.ai", password: "" });
            }}
          >
            <Button type="submit" variant="secondary" className={styles.submitBtn}>
              {t("demo")}
            </Button>
          </form>
          <p className={styles.footer}>
            {t("noAccount")} <Link href="/sign-up" className={styles.link}>{t("signUpLink")}</Link>
          </p>
        </div>
      </Card>
    </div>
  );
}
