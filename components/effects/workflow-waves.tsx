"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { useReducedMotion } from "motion/react";
import { useHydrated } from "@/lib/use-hydrated";
import { prewarm } from "@/lib/prewarm";
import { usePerfTier } from "@/lib/perf-tier";

/**
 * OGL + ~400 satırlık raymarch shader'ı ilk bundle'dan çıkarır. `ssr: false`
 * burada tamamen risksiz: `WorkflowWaves` zaten hydration'dan önce `null`
 * döndüğü için sunucu çıktısı değişmiyor.
 *
 * Chunk, sayfa açılır açılmaz boşta indiriliyor (aşağıdaki effect): kullanıcı
 * hero'nun 1.6vh'lik pin mesafesini geçip bu bölüme geldiğinde modül çoktan
 * önbellekte olur → pop-in yok.
 */
const GradientWaves = dynamic(() => import("@/components/GradientWaves"), {
  ssr: false,
});

/**
 * İş akışı bölümünün arka planındaki dalga katmanı.
 *
 * Yerleşim (istenen davranışın tamamı buradan çıkıyor):
 *   Dış kutu  `absolute inset-0`      → kutusu birebir <Section id="is-akisi">
 *   İç kutu   `sticky top-0 h-lvh`     → viewport'a yapışır, parent'ının (yani
 *                                        bölümün) ALT sınırında durur
 * Sonuç: bölüme scroll ile gelindiğinde ekranı doldurur, kartlar üzerinden
 * geçerken sabit kalır, bölüm bitince bölümle birlikte yukarı kayıp çıkar.
 * `lvh` (dvh değil): mobilde URL bar açılıp kapanırken boyut sabit, canvas resize thrash yok
 * önler.
 *
 * Sticky'nin çalışabilmesi için ATA ZİNCİRİNDE scroll container olmamalı;
 * bu yüzden globals.css'te `body`nin `overflow-x` değeri `hidden` yerine
 * `clip` (bkz. oradaki not).
 *
 * Katman düzeni (kritik): bileşen `<Section>`ın ilk çocuğu ve `-z-10` taşıyor;
 * Section `isolate` ile stacking context olduğu için katman bölümün kendi
 * arka planının ÜSTÜNE, başlık / top (z-0) / ScrollStack kartlarının (z-10)
 * ALTINA boyanır. Negatif z şart: heading <Container> konumlandırılmamış bir
 * eleman, pozisyonlu bir `z-0` katman onun üstünü kapatırdı.
 *
 * Burada `transform` / `filter` / `backdrop-filter` KULLANILMAZ — bunlar
 * `position: fixed` için containing block yaratır ve kardeş BallJourney'in
 * viewport referansını bozar (bkz. ball-journey.tsx katman sözleşmesi).
 * `mask-image` bu listede değil, güvenli.
 */

/** Marka token'larından türetilmiş hex çiftleri (GradientWaves oklch kabul etmiyor). */
const PALETTE = {
  dark: {
    horizonColor: "#0d1714", // ≈ --brand-pitch (dark)
    waveColor: "#1b7a55", // ≈ --brand-turf
    crestColor: "#9ee84a", // ≈ --brand-led
    opacity: 0.75,
    fogDepth: 15,
    brightness: 1.0,
  },
  /* Light'ta zemin neredeyse beyaz (--brand-pitch ≈ #f4faf5), o yüzden dalgalar
     zeminden KOYU olmak zorunda — dark'taki mantığın tersi.
     Belirginliği asıl belirleyen fogDepth: shader'da
     `alpha = clamp(fogDepth/dist, 0, 1) * opacity`, yani düşük fogDepth'te
     alanın çoğu daha şeffaflığa dönüşüyor. Light'ta bunu ~2 katına çıkarmak
     opacity'yi zorlamadan dalga alanını gerçekten dolduruyor.
     brightness < 1 ise rengi koyulaştırıp beyaz zemine karşı kontrastı artırır. */
  light: {
    horizonColor: "#9ed3b6", // yeşil pus — uzakta da okunacak kadar doygun
    waveColor: "#0a7f4b", // koyu turf, zemine karşı net
    crestColor: "#63d295", // orta yeşil tepe — beyaz DEĞİL, yoksa kaybolur
    opacity: 0.9,
    fogDepth: 28,
    brightness: 0.95,
  },
} as const;

export function WorkflowWaves() {
  const { resolvedTheme } = useTheme();
  const reduceMotion = useReducedMotion();
  const hydrated = useHydrated();
  // Zayıf cihaz: daha düşük çözünürlük + 30 fps. Seviye çalışma zamanında
  // düşerse `key` ile WebGL bağlamı yeni ayarlarla yeniden kurulur.
  const tier = usePerfTier();

  // Hareket azaltmada bileşen hiç mount edilmiyor → chunk'ı da indirme.
  useEffect(() => {
    if (reduceMotion) return;
    prewarm("gradient-waves", () => import("@/components/GradientWaves"));
  }, [reduceMotion]);

  // Hydration'dan önce render edilmez: tema (ve hareket tercihi) ancak
  // istemcide çözülüyor. Hareket azaltma tercihinde efekt hiç mount edilmez;
  // bölüm zaten bg-muted/40 ile boş kalmıyor.
  if (!hydrated || reduceMotion) return null;

  const palette = resolvedTheme === "light" ? PALETTE.light : PALETTE.dark;

  return (
    <div
      aria-hidden
      /* overflow-hidden YOK: sticky çocuğunun scroll container'ı olur ve
         yapışmayı tamamen öldürürdü. Kırpmaya gerek de yok — sticky çocuk
         parent kutusunu hiçbir zaman taşmıyor, GradientWaves'in kendi kökü
         zaten overflow-hidden taşıyor. mask-image scroll container yaratmaz.

         Mask yalnızca üstte, o da çok dar (%3): bölümün üst sınırında dalgalar
         bir anda başlamasın diye. Son durak `black` olduğu için renk aşağıya
         kadar sürüyor → ALT kenarda mask yok, geçiş keskin (bölümün
         `border-b`si ile hizalı biter). */
      className="pointer-events-none absolute inset-0 -z-10 [-webkit-mask-image:linear-gradient(to_bottom,transparent,black_3%)] [mask-image:linear-gradient(to_bottom,transparent,black_3%)]"
    >
      {/* lvh: URL çubuğu gizlenince de alt kenara kadar kaplar (svh kısa kalıyordu) ve çubuk animasyonunda boyut değişmez → canvas resize thrash yok. */}
      <div className="sticky top-0 h-lvh w-full">
        <GradientWaves
          key={tier}
          maxDpr={tier === "low" ? 0.75 : 1}
          maxFps={tier === "low" ? 30 : 0}
          horizonColor={palette.horizonColor}
          waveColor={palette.waveColor}
          crestColor={palette.crestColor}
          opacity={palette.opacity}
          fogDepth={palette.fogDepth}
          brightness={palette.brightness}
          speed={0.28}
          amplitude={2.8}
          waveScale={0.55}
          waveRatio={0.9}
          swell={32}
          turbulence={18}
          tilt={1.11}
          zoom={1.0}
          height={5.5}
          /* low (40 raymarch adımı) bilinçli: aynı anda ScrollStack her frame
             transform yazıyor, BallJourney rAF'ta ölçüm alıyor ve hero'da
             ikinci bir WebGL context (SideRays) duruyor. */
          detail="low"
          mouseInteraction={false}
          grain
          grainIntensity={0.04}
        />
      </div>
    </div>
  );
}
