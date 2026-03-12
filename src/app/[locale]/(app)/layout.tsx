import { setRequestLocale } from "next-intl/server";
import { Sidebar } from "@/components/app/Sidebar";
import { Header } from "@/components/app/Header";
import styles from "./layout.module.css";

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

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
