"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * Footer'ın üst kenarındaki orta saha çizgisi + orta yuvarlak.
 *
 * Vitrin duvarı "saha" ise footer orta saha: yatay hat duvarın alt kenarına
 * oturur, yuvarlağın yalnız alt yarısı görünür. Bölümün tek hareketi bu —
 * görünür olunca çizgiler bir kez çizilir (hareket azaltmada doğrudan görünür).
 *
 * viewBox 1200×400; yuvarlak yatayda ortada, merkezi üst kenarda.
 * `preserveAspectRatio="xMidYMin slice"` dar ekranda kenarları kırpar,
 * yuvarlağın oranı bozulmaz.
 */
export function PitchMarkings() {
  const reduce = useReducedMotion();
  const draw = reduce
    ? {}
    : {
        initial: { pathLength: 0 },
        whileInView: { pathLength: 1 },
        viewport: { once: true, margin: "0px 0px -20% 0px" },
      };

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1200 400"
      preserveAspectRatio="xMidYMin slice"
      className="pointer-events-none absolute inset-x-0 top-0 h-[min(62vw,420px)] w-full text-turf"
      fill="none"
      stroke="currentColor"
    >
      <motion.path
        d="M0 1 H1200"
        strokeWidth={1.5}
        strokeOpacity={0.45}
        {...draw}
        transition={{ duration: 1.2, ease: [0.65, 0, 0.35, 1] }}
      />
      {/* üst yarısı viewBox dışında kalır; çizim sağdan başlayıp alttan dolanır */}
      <motion.circle
        cx={600}
        cy={1}
        r={250}
        strokeWidth={1.5}
        strokeOpacity={0.28}
        {...draw}
        transition={{ duration: 1.6, delay: 0.25, ease: [0.65, 0, 0.35, 1] }}
      />
      <circle cx={600} cy={1} r={5} fill="currentColor" fillOpacity={0.5} stroke="none" />
    </svg>
  );
}
