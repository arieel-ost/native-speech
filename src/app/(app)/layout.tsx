import { Sidebar } from "@/components/app/Sidebar";
import { Header } from "@/components/app/Header";
import styles from "./layout.module.css";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.layout}>
      <Sidebar />
      <div className={styles.main}>
        <Header />
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
}
