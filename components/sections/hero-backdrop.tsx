"use client";

import { useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";

/**
 * Stadyum gecesi arka planı: floodlight ışıması + perspektifli saha gridi
 * + film grgranı. Scroll'da hafif parallax. İleride 3D model için slot hazır.
 */
export function HeroBackdrop() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const glowY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 140]);
  const pitchY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -50]);
  const pitchOpacity = useTransform(scrollYProgress, [0, 0.85], [1, 0.25]);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      {/* gece zemini */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_-10%,oklch(0.2_0.03_168)_0%,transparent_55%),radial-gradient(90%_60%_at_85%_0%,color-mix(in_oklch,var(--brand-led)_10%,transparent),transparent_60%)]" />

      {/* floodlight parıltıları */}
      <motion.div
        style={{ y: glowY }}
        className="absolute -top-48 left-1/4 size-[36rem] rounded-full bg-[radial-gradient(circle,color-mix(in_oklch,var(--brand-turf)_28%,transparent),transparent_70%)] blur-3xl"
      />
      <motion.div
        style={{ y: glowY }}
        className="absolute -top-32 right-1/5 size-[28rem] rounded-full bg-[radial-gradient(circle,color-mix(in_oklch,var(--brand-led)_16%,transparent),transparent_70%)] blur-3xl"
      />

      {/* perspektifli saha gridi */}
      <motion.div
        style={{ y: pitchY, opacity: pitchOpacity, perspective: "640px" }}
        className="absolute inset-x-0 bottom-0 h-[58%]"
      >
        <div
          className="absolute inset-0 origin-bottom"
          style={{
            transform: "rotateX(74deg)",
            backgroundImage:
              "linear-gradient(to right, color-mix(in oklch, var(--brand-turf) 26%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklch, var(--brand-turf) 22%, transparent) 1px, transparent 1px)",
            backgroundSize: "70px 70px",
            WebkitMaskImage: "linear-gradient(to top, #000 5%, transparent 75%)",
            maskImage: "linear-gradient(to top, #000 5%, transparent 75%)",
          }}
        />
      </motion.div>

      {/* film granı */}
      <div className="bg-noise absolute inset-0 opacity-[0.05] mix-blend-overlay" />

      {/* alt karartma → bölümlere geçiş */}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-background" />

      {/* 3D MODEL SLOTU — react-three-fiber Canvas buraya gelecek (model sağlandığında) */}
      <div
        data-hero-3d-slot
        className="absolute right-[5%] top-1/2 hidden size-[34rem] -translate-y-1/2 lg:block"
      />
    </div>
  );
}
