"use client";

import { ReactLenis, useLenis } from "lenis/react";
import { useReducedMotion } from "motion/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "lenis/dist/lenis.css";

/** Lenis kaydırmasını GSAP ScrollTrigger ile senkronlar (ScrollReveal vb. için). */
function GsapSync() {
  useLenis(() => {
    ScrollTrigger.update();
  });
  return null;
}

/**
 * Lenis tabanlı yumuşak kaydırma + anchor desteği.
 * prefers-reduced-motion açıkken Lenis devre dışı; doğal kaydırma kullanılır.
 */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();

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
