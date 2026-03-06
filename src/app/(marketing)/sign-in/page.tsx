"use client";

import { useRouter } from "next/navigation";
import { Card, Button } from "@/components/ui";
import styles from "./page.module.css";

export default function SignInPage() {
  const router = useRouter();

  return (
    <div className={styles.container}>
      <Card variant="outlined">
        <div className={styles.form}>
          <h1 className={styles.title}>Welcome back</h1>
          <Button
            className={styles.submitBtn}
            onClick={() => router.push("/dashboard")}
          >
            Continue as Demo User
          </Button>
        </div>
      </Card>
    </div>
  );
}
