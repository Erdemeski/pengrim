import { setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/components/layout/site-header";
import { Hero } from "@/components/sections/hero";
import { TrustStats } from "@/components/sections/trust-stats";
import { Inventory } from "@/components/sections/inventory";
import { HowItWorks } from "@/components/sections/how-it-works";
import { Reach } from "@/components/sections/reach";
import { Showcase } from "@/components/sections/showcase";
import { Contact } from "@/components/sections/contact";

type Props = { params: Promise<{ locale: string }> };

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <TrustStats />
        <Inventory />
        <HowItWorks />
        <Reach />
        <Showcase />
      </main>
      {/* İletişim bölümü aynı zamanda sitenin footer'ı */}
      <Contact />
    </>
  );
}
