"use client";

import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { useReducedMotion } from "motion/react";
import { useHydrated } from "@/lib/use-hydrated";
import { useIsCoarsePointer, usePerfTier } from "@/lib/perf-tier";

/** WebGL kodu ilk bundle'a girmesin; footer zaten sayfanın en sonunda. */
const Aurora = dynamic(() => import("@/components/Aurora"), { ssr: false });

/**
 * Footer'ın alt kenarından yükselen kısa aurora şeridi (React Bits Aurora,
 * direction="bottom"). Renkler marka turf → LED yeşili → turf; açık temada
 * bileşenin kendi pastel modu.
 *
 * Maliyet: kendi IntersectionObserver'ı ekran dışındayken döngüyü durduruyor.
 * Çizim tamponu 1× ile sınırlı (yumuşak gradyan, fark görünmez). Zayıf
 * cihazda WebGL yerine aynı tonda statik bir gradyan; hareket azaltmada da.
 */
export function FooterAurora() {
  const hydrated = useHydrated();
  const { resolvedTheme } = useTheme();
  const tier = usePerfTier();
  const coarse = useIsCoarsePointer();
  const reduce = useReducedMotion();
  // Tema sunucuda bilinmiyor (next-themes istemcide çözer). Hydration
  // bitmeden okunursa açık temada sunucu HTML'i (koyu) ile ilk istemci
  // render'ı (açık) farklı çıkıp hydration uyumsuzluğu veriyordu.
  const light = hydrated && resolvedTheme === "light";

  const staticGlow = (
    <div
      className="absolute inset-0"
      style={{
        background: light
          ? "radial-gradient(70% 100% at 50% 100%, oklch(0.8 0.12 150 / 0.45), transparent 70%)"
          : "radial-gradient(70% 100% at 50% 100%, oklch(0.62 0.15 150 / 0.35), transparent 70%)",
      }}
    />
  );

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-28 sm:h-36"
    >
      {!hydrated || tier === "low" || reduce ? (
        staticGlow
      ) : (
        <Aurora
          colorStops={light ? ["#0a7f4b", "#63d295", "#0a7f4b"] : ["#1b7a55", "#9ee84a", "#1b7a55"]}
          direction="bottom"
          amplitude={0.6}
          blend={0.5}
          height={0.45}
          speed={0.7}
          glow={0.5}
          brightness={0.9}
          opacity={light ? 0.9 : 0.75}
          lightMode={light}
          mouseInteraction={!coarse}
          dpr={1}
        />
      )}
    </div>
  );
}
