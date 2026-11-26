"use client";

import { useEffect } from "react";
import { useLenis } from "lenis/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { usePreloadPhase } from "@/lib/preload-store";

/**
 * Hero'nun kare dizisi uzun bir pin mesafesine yayılıyor; kullanıcı onu
 * tekerlek/parmakla adım adım sürmek zorunda kalmasın diye:
 *
 *   • Hero bölgesindeyken (son kareye gelmeden) İLK aşağı hareket →
 *     kontrol alınır ve son kareye kadar yumuşak otomatik scroll yapılır.
 *   • Son karede ya da hero içindeyken yukarı hareket → en başa otomatik scroll.
 *
 * Wheel ve dokunma olayları Lenis'in `virtualScroll` kancasından yakalanır
 * (Lenis bunları kendi işlemeden önce bize sorar). Otomatik scroll `lock`
 * ile çalıştığı için süresince gelen her girdi engellenir; dokunmatikteki
 * doğal kaydırma da `preventDefault` ile durur. Klavye (↓ PageDown Space End
 * / ↑ PageUp Home Shift+Space) aynı mantığa bağlı.
 *
 * Dokunulmayanlar: menü/CTA bağlantıları gibi programatik scroll'lar
 * (virtualScroll tetiklenmez), kaydırma çubuğuyla sürükleme, açılış ekranı
 * süresi (o sırada girdiler zaten SiteLoader'da yutuluyor).
 */

const DURATION = 2.2;
const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

const DOWN_KEYS = new Set(["ArrowDown", "PageDown", "End"]);
const UP_KEYS = new Set(["ArrowUp", "PageUp", "Home"]);

type LenisWithOptions = { options: { virtualScroll?: unknown } };

/** Lenis seçeneği çalışma zamanında değiştirilir (Lenis her olayda yeniden okur). */
function setVirtualScroll(lenis: LenisWithOptions, fn: unknown) {
  lenis.options.virtualScroll = fn;
}

type VirtualScrollData = {
  deltaX: number;
  deltaY: number;
  event: WheelEvent | TouchEvent;
};

export function HeroAutoScroll() {
  const lenis = useLenis();
  const phase = usePreloadPhase();

  useEffect(() => {
    if (!lenis || phase === "loading") return;

    let animating = false;

    const heroEnd = () => ScrollTrigger.getById("hero")?.end ?? 0;

    const go = (target: number) => {
      animating = true;
      lenis.scrollTo(target, {
        duration: DURATION,
        easing: easeInOutCubic,
        lock: true,
        force: true,
        onComplete: () => {
          animating = false;
        },
      });
      // Güvenlik ağı: onComplete bir şekilde çağrılmazsa kilit takılı kalmasın.
      window.setTimeout(() => {
        animating = false;
      }, DURATION * 1000 + 400);
    };

    /** @returns otomatik scroll başlatıldı mı */
    const decide = (dir: number) => {
      const end = heroEnd();
      if (end <= 0) return false;
      const y = window.scrollY;
      if (dir > 0 && y < end - 2) {
        go(end);
        return true;
      }
      if (dir < 0 && y > 2 && y <= end + 4) {
        go(0);
        return true;
      }
      return false;
    };

    const prev = lenis.options.virtualScroll;
    setVirtualScroll(lenis, (data: VirtualScrollData) => {
      const { event } = data;
      if (animating) {
        if (event.cancelable) event.preventDefault();
        return false;
      }
      const dy = data.deltaY;
      if (Math.abs(dy) >= 1 && decide(Math.sign(dy))) {
        if (event.cancelable) event.preventDefault();
        return false;
      }
      return typeof prev === "function" ? prev(data) : true;
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) {
        return;
      }
      // Space odaklı bir butonu tetiklemeli, sayfayı değil.
      if (e.key === " " && el?.tagName === "BUTTON") return;
      let dir = 0;
      if (DOWN_KEYS.has(e.key) || (e.key === " " && !e.shiftKey)) dir = 1;
      else if (UP_KEYS.has(e.key) || (e.key === " " && e.shiftKey)) dir = -1;
      if (!dir) return;
      if (animating || decide(dir)) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      setVirtualScroll(lenis, prev);
      window.removeEventListener("keydown", onKey);
    };
  }, [lenis, phase]);

  return null;
}
