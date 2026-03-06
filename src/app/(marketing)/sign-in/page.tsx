import { signIn } from "@/auth";
import { Card, Button } from "@/components/ui";
import styles from "./page.module.css";

export default function SignInPage() {
  return (
    <div className={styles.container}>
      <Card variant="outlined">
        <div className={styles.form}>
          <h1 className={styles.title}>Welcome back</h1>
          <form
            action={async () => {
              "use server";
              await signIn("credentials", { email: "demo@nativespeech.ai", password: "stub", redirectTo: "/dashboard" });
            }}
          >
            <Button type="submit" className={styles.submitBtn}>Continue as Demo User</Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
