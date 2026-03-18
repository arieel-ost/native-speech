import { setRequestLocale } from "next-intl/server";
import { Nav } from "@/components/marketing/Nav";
import { Footer } from "@/components/marketing/Footer";
import styles from "./layout.module.css";

export default async function MarketingLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className={styles.shell}>
      <Nav />
      <main className={styles.main}>{children}</main>
      <Footer />
    </div>
  );
}
