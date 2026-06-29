"use client";

import { useEffect } from "react";
import { ReactLenis, useLenis } from "lenis/react";
import { useReducedMotion } from "motion/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "lenis/dist/lenis.css";

/**
 * Lenis kaydırmasını GSAP ScrollTrigger ile senkronlar; ayrıca her mount'ta
 * (refresh dahil) Lenis'in sanal scroll pozisyonunu en üste sıfırlar.
 */
function GsapSync() {
  const lenis = useLenis(() => {
    ScrollTrigger.update();
  });

  useEffect(() => {
    if (!lenis) return;
    const reset = () => {
      // immediate+force: animasyonsuz, kilitliyken bile en üste git
      lenis.scrollTo(0, { immediate: true, force: true });
      ScrollTrigger.refresh();
    };
    reset();
    // Lenis RAF döngüsü ilk kareyi geç ayarladığından bir kare sonra tekrar sabitle
    const raf = requestAnimationFrame(reset);
    return () => cancelAnimationFrame(raf);
  }, [lenis]);

  return null;
}

/**
 * Lenis tabanlı yumuşak kaydırma + anchor desteği.
 * prefers-reduced-motion açıkken Lenis devre dışı; doğal kaydırma kullanılır.
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
    <ReactLenis
      root
      options={{
        duration: 1.1,
        lerp: 0.1,
        smoothWheel: true,
        wheelMultiplier: 1,
        anchors: { offset: -72 },
      }}
    >
      <GsapSync />
      {children}
    </ReactLenis>
  );
}
