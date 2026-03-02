import { auth, signOut } from "@/auth";
import { Badge, Button } from "@/components/ui";
import { mockUser } from "@/lib/mock-data";
import styles from "./Header.module.css";

export async function Header() {
  const session = await auth();

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <h2 className={styles.greeting}>
          Hi, {session?.user?.name ?? mockUser.name}
        </h2>
      </div>
      <div className={styles.right}>
        <Badge variant="accent">Score: {mockUser.overallScore}</Badge>
        <Badge variant="success">{mockUser.streak} day streak</Badge>
        <form
          action={async () => {
            "use server";
            await signOut();
          }}
        >
          <Button variant="ghost" size="sm" type="submit">Sign Out</Button>
        </form>
      </div>
    </header>
  );
}
