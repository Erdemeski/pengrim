"use client";

import { useEffect } from "react";
import { ReactLenis, useLenis } from "lenis/react";
import type { LenisOptions } from "lenis";
import { useReducedMotion } from "motion/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { attachLenisToScrollClock } from "@/lib/scroll-clock";
import "lenis/dist/lenis.css";

gsap.registerPlugin(ScrollTrigger);

// Mobilde URL çubuğu açılıp kapandıkça (yalnız yükseklik değişir) tüm
// ScrollTrigger'ları yeniden ölçme — pinli hero'da sıçramaya yol açıyordu.
ScrollTrigger.config({ ignoreMobileResize: true });

/**
 * Modül sabiti: satır içi nesne her render'da yeni referans olurdu.
 *
 * `autoRaf: false` → Lenis kendi rAF döngüsünü KURMAZ; aşağıda GSAP
 * ticker'ından sürülür. Böylece Lenis'in scroll yazımı, ScrollTrigger
 * güncellemesi, scrub tween'leri ve scroll saatinin aboneleri (top, kartlar)
 * tek bir tick'te, aynı scroll değeriyle çalışır.
 */
const LENIS_OPTIONS: LenisOptions = {
  autoRaf: false,
  duration: 1.1,
  lerp: 0.1,
  smoothWheel: true,
  wheelMultiplier: 1,
  anchors: { offset: -72 },
};

/**
 * Lenis'i GSAP ticker'ına ve ScrollTrigger'a bağlar; ayrıca her mount'ta
 * (refresh dahil) Lenis'in sanal scroll pozisyonunu en üste sıfırlar.
 */
function GsapSync() {
  const lenis = useLenis(() => {
    ScrollTrigger.update();
  });

  // Tek saat: Lenis GSAP ticker'ından sürülür.
  useEffect(() => {
    if (!lenis) return;
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    // Uzun bir kareden sonra GSAP zamanı "yutmasın": scroll ile senkron
    // efektler gerçek zamanla ilerlemeli.
    gsap.ticker.lagSmoothing(0);
    const detach = attachLenisToScrollClock(lenis);
    return () => {
      gsap.ticker.remove(tick);
      detach();
    };
  }, [lenis]);

  useEffect(() => {
    if (!lenis) return;
    const reset = () => {
      // immediate+force: animasyonsuz, kilitliyken bile en üste git
      lenis.scrollTo(0, { immediate: true, force: true });
      ScrollTrigger.refresh();
    };
    reset();
    // Lenis ilk kareyi geç ayarladığından bir kare sonra tekrar sabitle
    const raf = requestAnimationFrame(reset);
    return () => cancelAnimationFrame(raf);
  }, [lenis]);

  return null;
}

/**
 * Lenis tabanlı yumuşak kaydırma + anchor desteği.
 * prefers-reduced-motion açıkken Lenis devre dışı; doğal kaydırma kullanılır
 * (scroll saati bu durumda native `scroll` olayına düşer).
 */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();

  // Sayfa her yenilendiğinde en üstten başlasın (pinlenen hero'nun bozulmaması için
  // tarayıcı scroll geri-yüklemesini kapat ve başa sar).
  useEffect(() => {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
    window.scrollTo(0, 0);
  }, []);

  if (reduce) return <>{children}</>;

  return (
    <ReactLenis root options={LENIS_OPTIONS}>
      <GsapSync />
      {children}
    </ReactLenis>
  );
}
