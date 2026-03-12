import { signIn } from "@/auth";
import { Card, Button, Input } from "@/components/ui";
import Link from "next/link";
import styles from "./page.module.css";

export default function SignUpPage() {
  return (
    <div className={styles.container}>
      <Card variant="outlined">
        <div className={styles.form}>
          <h1 className={styles.title}>Start your journey</h1>
          <p className={styles.subtitle}>Free accent assessment — no credit card required.</p>
          <form
            action={async (formData) => {
              "use server";
              // TODO: Create user, then sign in
              await signIn("credentials", formData);
            }}
          >
            <div className={styles.fields}>
              <Input label="Name" name="name" type="text" placeholder="Your name" required />
              <Input label="Email" name="email" type="email" placeholder="you@example.com" required />
              <Input label="Password" name="password" type="password" placeholder="••••••••" required />
            </div>
            <Button type="submit" className={styles.submitBtn}>Create Account</Button>
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
            Already have an account? <Link href="/sign-in" className={styles.link}>Sign in</Link>
          </p>
        </div>
      </Card>
    </div>
  );
}
