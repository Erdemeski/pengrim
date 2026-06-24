"use client";

import { useEffect, useState } from "react";
import { useMotionValueEvent, useScroll } from "motion/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Container } from "./container";
import { Logo } from "./logo";
import { MobileNav } from "./mobile-nav";
import { ThemeToggle } from "./theme-toggle";
import { AnchorLink } from "./anchor-link";
import { NAV_ITEMS, SECTION_IDS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import GooeyNav from "@/components/GooeyNav";
import GlassSurface from "@/components/GlassSurface";

export function SiteHeader() {
  const t = useTranslations("nav");
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { scrollY } = useScroll();

  useEffect(() => setMounted(true), []);
  useMotionValueEvent(scrollY, "change", (y) => {
    setScrolled(y > 24);
  });

  const navItems = NAV_ITEMS.map((i) => ({ label: t(i.key), href: i.href }));
  const barHeight = scrolled ? 58 : 66;

  const content = (
    <div className="flex w-full items-center justify-between gap-3 px-1 sm:px-2">
      <Link href="/" aria-label="Pengrim" className="shrink-0">
        <Logo />
      </Link>

      <div className="hidden lg:block">
        <GooeyNav
          items={navItems}
          particleCount={10}
          animationTime={500}
          particleDistances={[80, 8]}
        />
      </div>

      <div className="flex items-center gap-1 sm:gap-1.5">
        <ThemeToggle />
        <AnchorLink
          href={`#${SECTION_IDS.contact}`}
          className={cn(
            buttonVariants(),
            "hidden h-9 rounded-lg px-4 text-sm font-semibold sm:inline-flex",
          )}
        >
          {t("cta")}
        </AnchorLink>
        <MobileNav />
      </div>
    </div>
  );

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-500",
        scrolled ? "py-2" : "py-3 sm:py-4",
      )}
    >
      <Container>
        {/* `dark`: içerik her iki temada açık metin/token kullanır */}
        <div
          className="dark relative text-foreground transition-all duration-500"
          style={{ height: barHeight }}
        >
          {/* okunabilirlik için cam efektinin altında koyu scrim */}
          <div className="absolute inset-0 rounded-2xl bg-[rgba(8,12,11,0.42)]" />

          {/* ReactBits GlassSurface — liquid glass refraction header arka planı.
              SSR'de stilleri deterministik olmadığı için yalnızca mount sonrası render edilir;
              öncesinde glass-dark fallback (hydration mismatch'i önler). */}
          {mounted ? (
            <GlassSurface
              width="100%"
              height={barHeight}
              borderRadius={16}
              className="!absolute inset-0"
            >
              {content}
            </GlassSurface>
          ) : (
            <div className="glass-dark absolute inset-0 flex items-center rounded-2xl">
              {content}
            </div>
          )}
        </div>
      </Container>
    </header>
  );
}
