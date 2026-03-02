import { signIn } from "@/auth";
import { Card, Button, Input } from "@/components/ui";
import Link from "next/link";
import styles from "./page.module.css";

export default function SignInPage() {
  return (
    <div className={styles.container}>
      <Card variant="outlined">
        <div className={styles.form}>
          <h1 className={styles.title}>Welcome back</h1>
          <form
            action={async (formData) => {
              "use server";
              await signIn("credentials", formData);
            }}
          >
            <div className={styles.fields}>
              <Input label="Email" name="email" type="email" placeholder="you@example.com" required />
              <Input label="Password" name="password" type="password" placeholder="••••••••" required />
            </div>
            <Button type="submit" className={styles.submitBtn}>Sign In</Button>
          </form>
          <div className={styles.divider}><span>or</span></div>
          <form
            action={async () => {
              "use server";
              await signIn("google");
            }}
          >
            <Button type="submit" variant="secondary" className={styles.submitBtn}>
              Continue with Google
            </Button>
          </form>
          <p className={styles.footer}>
            Don&apos;t have an account? <Link href="/sign-up" className={styles.link}>Sign up</Link>
          </p>
        </div>
      </Card>
    </div>
  );
}
