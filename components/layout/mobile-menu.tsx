"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLenis } from "lenis/react";
import { useTranslations } from "next-intl";
import { useReducedMotion } from "motion/react";
import { ArrowRight } from "lucide-react";
import StaggeredMenu, {
  type StaggeredMenuItem,
} from "@/components/StaggeredMenu";
import { NAV_ITEMS, SECTION_IDS } from "@/lib/constants";
import { useScrollTo } from "./use-scroll-to";
import { LanguageToggle } from "./language-toggle";
import { ThemeToggle } from "./theme-toggle";

/** Panel kapanış animasyonu (StaggeredMenu: 0.5s) + küçük pay. Kaydırma bundan
 *  önce başlarsa panel, kayan sayfanın üzerinde sürükleniyormuş gibi görünüyor. */
const CLOSE_ANIM_MS = 540;

/**
 * Mobil navigasyon: header içindeki "Menü/Kapat" toggle'ı + StaggeredMenu paneli.
 *
 * Yalnız `lg` altında görünür. Masaüstünde navigasyon `GooeyNav`, dil ve tema
 * ise header'daki kendi butonlarında; bu yüzden dil/tema kontrolleri burada
 * panelin altında bulunuyor — mobilde başka yerde yoklar.
 */
export function MobileMenu({
  onOpenChange,
}: {
  /** Header, panel açıkken kendi arka planını ve logosunu gizlemek için dinler. */
  onOpenChange?: (open: boolean) => void;
}) {
  const t = useTranslations("nav");
  const lenis = useLenis();
  const scrollTo = useScrollTo();
  const reduce = useReducedMotion();

  const [open, setOpen] = useState(false);
  const navTimerRef = useRef<number | null>(null);

  const items: StaggeredMenuItem[] = NAV_ITEMS.map((item) => ({
    label: t(item.key),
    ariaLabel: t(item.key),
    href: item.href,
  }));

  // Panel açıkken arka plan kaymasın (showcase-lightbox ile aynı kalıp).
  // `open` state'inin senkron kopyası. Yan etkileri (Lenis kilidi, header'a
  // haber verme) yalnızca gerçek bir değişimde tetiklemek için: hızlı arka
  // arkaya tıklamada `open` prop'u henüz güncellenmemiş olabiliyor ve Lenis
  // stop/start dengesi bozulup scroll kilidi yanlış tarafta kalabiliyordu.
  const openRef = useRef(false);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (openRef.current === next) return;
      openRef.current = next;
      setOpen(next);
      onOpenChange?.(next);
      if (!lenis) return;
      if (next) lenis.stop();
      else lenis.start();
    },
    [lenis, onOpenChange],
  );

  // Panel açıkken bileşen sökülürse Lenis kilitli kalmasın; bekleyen gezinme
  // zamanlayıcısı da temizlensin.
  useEffect(
    () => () => {
      lenis?.start();
      if (navTimerRef.current) window.clearTimeout(navTimerRef.current);
    },
    [lenis],
  );

  const navigate = useCallback(
    (href: string) => {
      handleOpenChange(false);
      if (navTimerRef.current) window.clearTimeout(navTimerRef.current);
      navTimerRef.current = window.setTimeout(
        () => scrollTo(href),
        reduce ? 0 : CLOSE_ANIM_MS,
      );
    },
    [handleOpenChange, reduce, scrollTo],
  );

  return (
    <StaggeredMenu
      items={items}
      onSelect={navigate}
      open={open}
      onOpenChange={handleOpenChange}
      position="right"
      accentColor="var(--brand-led)"
      // Üç katman. Uçlar aynı kaldı (turf → panel zemini); ortadaki YENİ bir
      // renk değil, o ikisinin arasındaki ara ton. Öncesinde iki katman vardı
      // ve ikincisi birebir `--popover`, yani panelin zemin rengiydi — panelden
      // ayırt edilemediği için kademeli giriş tek adım gibi okunuyordu.
      colors={[
        "var(--brand-turf)",
        "color-mix(in oklch, var(--brand-turf) 45%, var(--popover))",
        "var(--popover)",
      ]}
      labels={{ open: t("menu"), close: t("close") }}
      toggleClassName="lg:hidden px-2 py-2 text-foreground"
      panelFooter={
        <div className="flex flex-col gap-4">
          {/* Dil ve tema, topbar'daki ile aynı ghost ikon butonları. Panel
              sayfa temasının bağlamında olduğu için (header'ın `.dark`
              sarmalayıcısı dışında) kontrastları kendiliğinden doğru. */}
          <div
            data-sm-reveal
            className="flex items-center gap-1 border-t border-border/60 pt-4"
          >
            <LanguageToggle />
            <ThemeToggle />
          </div>

          {/* CTA menü öğeleriyle aynı akışı izler: kapat → animasyon bitsin → kaydır. */}
          <button
            data-sm-reveal
            type="button"
            onClick={() => navigate(`#${SECTION_IDS.contact}`)}
            className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("cta")}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      }
    />
  );
}
