"use client";

import { useLenis } from "lenis/react";
import { useCallback } from "react";

/**
 * Anchor (#id) hedeflerine Lenis ile yumuşak kaydırma.
 * Lenis yoksa (reduced-motion) tarayıcının doğal kaydırmasına düşer.
 */
export function useScrollTo() {
  const lenis = useLenis();

  return useCallback(
    (hash: string) => {
      const id = hash.startsWith("#") ? hash : `#${hash}`;
      const el = document.querySelector<HTMLElement>(id);
      if (!el) return;
      if (lenis) {
        lenis.scrollTo(el, { offset: -72 });
      } else {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      // erişilebilirlik: hedefe odak taşı
      el.setAttribute("tabindex", "-1");
      el.focus({ preventScroll: true });
    },
    [lenis],
  );
}
