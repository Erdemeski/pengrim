"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { useMotionValueEvent, useScroll } from "motion/react";
import { useLenis } from "lenis/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Container } from "./container";
import { Logo } from "./logo";
import { MobileMenu } from "./mobile-menu";
import { ThemeToggle } from "./theme-toggle";
import { LanguageToggle } from "./language-toggle";
import { AnchorLink } from "./anchor-link";
import { NAV_ITEMS, SECTION_IDS } from "@/lib/constants";
import { useHydrated } from "@/lib/use-hydrated";
import {
  subscribeHeroIntro,
  getHeroIntroActive,
  getHeroIntroServerSnapshot,
} from "@/lib/hero-intro-store";
import { cn } from "@/lib/utils";
import GooeyNav from "@/components/GooeyNav";
import { prewarmEager } from "@/lib/prewarm";

/**
 * SVG `feDisplacementMap` filtresi + kendi ölçüm mantığı ilk bundle'dan çıkar.
 * `ssr: false` güvenli: bileşen zaten `mounted` kapısının arkasında ve o ana
 * kadar `.glass-dark` CSS fallback'i gösteriliyor — yani bir takas bugün de
 * yapılıyor, split yalnızca ne zaman olduğunu bir tık öteliyor.
 */
const GlassSurface = dynamic(() => import("@/components/GlassSurface"), {
  ssr: false,
});
prewarmEager("glass-surface", () => import("@/components/GlassSurface"));

export function SiteHeader() {
  const t = useTranslations("nav");
  const [scrolled, setScrolled] = useState(false);
  const mounted = useHydrated();
  // -1 = hiçbir bölüm aktif değil (hero ve istatistik bandında)
  const [activeIndex, setActiveIndex] = useState(-1);
  // Mobil menü paneli açıkken header'ın cam arka planı ve logosu gizlenir:
  // panel header'ın ALTINDAN (z-40 < z-50) geçtiği için aksi halde koyu cam
  // pil ve beyaz wordmark panelin üzerinde asılı kalıyor, açık temada da
  // beyaz-üstüne-beyaz olup kayboluyordu. Gizlenince geriye yalnız "Kapat"
  // toggle'ı kalıyor ve o da panelin zeminine göre renkleniyor.
  const [menuOpen, setMenuOpen] = useState(false);
  const { scrollY } = useScroll();
  const lenis = useLenis();

  // Hero intro evresi (merkezî metallic logo görünürken). introActive iken
  // header cam arka planı + logo + sağ küme gizlenir, yalnız navigasyon kalır.
  // Store bilerek boolean yayınlıyor: float olsaydı hero'nun her scrub karesi
  // bu ağacın tamamını yeniden render ettirirdi (bkz. hero-intro-store.ts).
  const introActive = useSyncExternalStore(
    subscribeHeroIntro,
    getHeroIntroActive,
    getHeroIntroServerSnapshot,
  );

  // logoya basınca sayfanın en üstüne yumuşak kaydır
  const scrollToTop = (e: React.MouseEvent) => {
    e.preventDefault();
    if (lenis) lenis.scrollTo(0);
    else window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useMotionValueEvent(scrollY, "change", (y) => {
    setScrolled(y > 24);
  });

  // scroll-spy: o an viewport ortasındaki bölüme göre header'daki ilgili
  // navigasyon öğesini aktif eder ("iş akışı"na gelince "iş akışı" aktif olur).
  useEffect(() => {
    const ids = NAV_ITEMS.map((i) => i.href.replace("#", ""));
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (!sections.length) return;

    const ratios = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            ratios.set(entry.target.id, entry.intersectionRatio);
          } else {
            ratios.delete(entry.target.id);
          }
        }
        let bestId: string | null = null;
        let best = -1;
        ratios.forEach((ratio, id) => {
          if (ratio > best) {
            best = ratio;
            bestId = id;
          }
        });
        // Orta bantta navigasyondaki bölümlerden hiçbiri yoksa (hero'ya ya da
        // istatistik bandına dönüldü) hiçbir sekme aktif görünmemeli.
        setActiveIndex(bestId ? ids.indexOf(bestId) : -1);
      },
      // viewport'un orta bandını gözlem alanı yap → tek bir aktif bölüm
      { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] },
    );

    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  const navItems = NAV_ITEMS.map((i) => ({ label: t(i.key), href: i.href }));
  const barHeight = scrolled ? 58 : 66;

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-[padding] duration-500",
        scrolled ? "py-2" : "py-3 sm:py-4",
      )}
    >
      <Container>
        {/* `dark`: içerik her iki temada açık metin/token kullanır */}
        <div
          className="dark relative text-foreground transition-[height] duration-500"
          style={{ height: barHeight }}
        >
          {/* ARKA PLAN katmanı — içerikten ayrı: intro sürerken sönümlenir
              (nav görünür kalır). SSR'de GlassSurface deterministik olmadığından
              yalnız mount sonrası; öncesinde glass-dark fallback. */}
          <div
            aria-hidden="true"
            className={cn(
              "absolute inset-0 transition-opacity duration-500",
              introActive || menuOpen ? "opacity-0" : "opacity-100",
            )}
          >
            {mounted ? (
              <GlassSurface
                width="100%"
                height={barHeight}
                borderRadius={50}
                forceDarkMode
                className="!absolute inset-0"
              />
            ) : (
              <div className="glass-dark absolute inset-0 rounded-full" />
            )}
          </div>

          {/* İÇERİK katmanı — her zaman üstte; nav intro'da da görünür */}
          <div className="relative z-10 flex h-full w-full items-center justify-between gap-3 px-2 sm:px-3">
            <Link
              href="/"
              aria-label="Pengrim"
              onClick={scrollToTop}
              className={cn(
                "shrink-0 transition-opacity duration-500",
                (introActive || menuOpen) && "pointer-events-none opacity-0",
              )}
            >
              <Logo />
            </Link>

            <div className="hidden lg:block">
              <GooeyNav
                items={navItems}
                activeIndex={activeIndex}
                initialActiveIndex={-1}
                particleCount={10}
                animationTime={500}
                particleDistances={[80, 8]}
              />
            </div>

            <div className="flex items-center gap-1 sm:gap-1.5">
              {/* masaüstü kontrolleri — intro'da gizli ("yalnız navigasyon").
                  `lg` altında gizli: mobilde dil ve tema seçimi StaggeredMenu
                  panelinin içinde (tek yerde, daha okunaklı kontrollerle). */}
              <div
                className={cn(
                  "hidden items-center gap-1 transition-opacity duration-500 sm:gap-1.5 lg:flex",
                  introActive && "pointer-events-none opacity-0",
                )}
              >
                <LanguageToggle />
                <ThemeToggle />
                <AnchorLink
                  href={`#${SECTION_IDS.contact}`}
                  className={cn(
                    buttonVariants(),
                    "h-9 rounded-lg px-4 text-sm font-semibold",
                  )}
                >
                  {t("cta")}
                </AnchorLink>
              </div>
              {/* mobil menü — intro'da da erişilebilir kalır */}
              <MobileMenu onOpenChange={setMenuOpen} />
            </div>
          </div>
        </div>
      </Container>
    </header>
  );
}
