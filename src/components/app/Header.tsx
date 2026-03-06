"use client";

import { useSession } from "next-auth/react";
import { useAuthToggle } from "@/providers/AuthProvider";
import { Badge, Button } from "@/components/ui";
import { mockUser } from "@/lib/mock-data";
import styles from "./Header.module.css";

export function Header() {
  const { data: session } = useSession();
  const { loggedIn, toggle } = useAuthToggle();

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <h2 className={styles.greeting}>
          Hi, {session?.user?.name ?? "Guest"}
        </h2>
      </div>
      <div className={styles.right}>
        <Badge variant="accent">Score: {mockUser.overallScore}</Badge>
        <Badge variant="success">{mockUser.streak} day streak</Badge>
        <Button variant="ghost" size="sm" onClick={toggle}>
          {loggedIn ? "Sign Out" : "Sign In"}
        </Button>
      </div>
    </header>
  );
}
