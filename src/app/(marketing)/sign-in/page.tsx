"use client";

import { signIn } from "next-auth/react";
import { Card, Button } from "@/components/ui";
import styles from "./page.module.css";

export default function SignInPage() {
  return (
    <div className={styles.container}>
      <Card variant="outlined">
        <div className={styles.form}>
          <h1 className={styles.title}>Welcome back</h1>
          <Button
            className={styles.submitBtn}
            onClick={() =>
              signIn("credentials", {
                email: "demo@nativespeech.ai",
                password: "stub",
                callbackUrl: "/dashboard",
              })
            }
          >
            Continue as Demo User
          </Button>
        </div>
      </Card>
    </div>
  );
}
