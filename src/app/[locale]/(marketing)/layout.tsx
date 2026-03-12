import { setRequestLocale } from "next-intl/server";
import { Nav } from "@/components/marketing/Nav";
import { Footer } from "@/components/marketing/Footer";

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
    <>
      <Nav />
      <main>{children}</main>
      <Footer />
    </>
  );
}
