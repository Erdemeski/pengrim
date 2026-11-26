"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import {
  completeTask,
  getPreloadProgress,
  setPreloadPhase,
  usePreloadPhase,
} from "@/lib/preload-store";

/**
 * Açılış ekranı — her girişte ve her yenilemede.
 *
 * Neden: hero'nun ışık huzmeleri (WebGL) ve LED şeridi ilk boyamadan birkaç
 * yüz ms sonra "geç gelmiş" gibi beliriyordu. Bu ekran hero'nun TÜM ağır
 * parçaları (kare dizisi, WebGL'in ilk karesi, fontlar, eager görseller)
 * hazır olana kadar örter; sonra tek bir geçişle siteyi açar ve hero'nun
 * giriş animasyonları tam o anda başlar (bkz. preload-store "revealing").
 *
 * Logo, hero'daki merkezî logoyla AYNI kutuda (genişlik min(86vw,760px),
 * küçük viewport'un ortası) duruyor; altındaki parıltı çizgileri de hero'daki
 * çizgilerin birebir kopyası. Ekran sönerken logo ve çizgiler, altındaki
 * özdeş hero logosunun üstünde kaybolur → dikiş görünmez.
 *
 * İlerleme görseli: sönük wordmark soldan sağa "yanar" (LED panonun
 * yanması). Çizim React render'ı değil, tek bir CSS değişkeni (`--p`)
 * üzerinden yapılır.
 *
 * Zamanlama: en az MIN_MS görünür (kullanıcı "hemen kapatma" dedi); %100'den
 * sonra HOLD_MS bekler; CAP_MS sert üst sınır — yavaş bağlantıda site asla
 * kilitli kalmaz, kalan kareler arka planda yüklenmeye devam eder.
 */

const MIN_MS = 2200;
const MIN_MS_REDUCED = 600;
const HOLD_MS = 450;
const CAP_MS = 10000;
const FADE_MS = 900;

const LOGO_W = "min(86vw, 760px)";
const LOGO_H = "calc(min(86vw, 760px) * 0.2235)";
const LOGO_MASK = {
  WebkitMaskImage: "url(/pengrim_beyaz.png)",
  maskImage: "url(/pengrim_beyaz.png)",
  WebkitMaskSize: "contain",
  maskSize: "contain",
  WebkitMaskRepeat: "no-repeat",
  maskRepeat: "no-repeat",
  WebkitMaskPosition: "center",
  maskPosition: "center",
} as const;

/** Kaydırma girdilerini yükleme boyunca yut (taşma stilini değiştirmeden). */
const SCROLL_KEYS = new Set([
  "ArrowDown",
  "ArrowUp",
  "PageDown",
  "PageUp",
  "Home",
  "End",
  " ",
]);

export function SiteLoader() {
  const t = useTranslations("loader");
  const reduce = useReducedMotion();
  const phase = usePreloadPhase();
  const rootRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  // Yalnız istemcide bilinebilen iki görev.
  useEffect(() => {
    const fontsDone = () => completeTask("fonts");
    if (document.fonts?.ready) document.fonts.ready.then(fontsDone, fontsDone);
    else fontsDone();

    const loadDone = () => completeTask("window-load");
    if (document.readyState === "complete") loadDone();
    else window.addEventListener("load", loadDone, { once: true });
    return () => window.removeEventListener("load", loadDone);
  }, []);

  // Scroll kilidi. `overflow` DEĞİŞTİRİLMİYOR: kaydırma çubuğu kaybolup geri
  // gelirse açılışta sayfa 8 px yana kayardı. Bunun yerine girdiler window'un
  // capture aşamasında yutulur (Lenis'in window dinleyicisine ulaşmadan).
  useEffect(() => {
    if (phase !== "loading") return;
    const block = (e: Event) => {
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();
    };
    const onKey = (e: KeyboardEvent) => {
      if (SCROLL_KEYS.has(e.key)) block(e);
    };
    const pin = () => {
      if (window.scrollY !== 0) window.scrollTo(0, 0);
    };
    const opts = { capture: true, passive: false } as const;
    window.addEventListener("wheel", block, opts);
    window.addEventListener("touchmove", block, opts);
    window.addEventListener("keydown", onKey, opts);
    window.addEventListener("scroll", pin, { passive: true });
    pin();
    return () => {
      window.removeEventListener("wheel", block, opts);
      window.removeEventListener("touchmove", block, opts);
      window.removeEventListener("keydown", onKey, opts);
      window.removeEventListener("scroll", pin);
    };
  }, [phase]);

  // İlerleme döngüsü — gerçek ilerlemeye yumuşakça yaklaşır, asla geri
  // gitmez ve MIN_MS dolmadan %100'e ulaşamaz.
  useEffect(() => {
    if (phase !== "loading") return;
    const root = rootRef.current;
    if (!root) return;
    const minMs = reduce ? MIN_MS_REDUCED : MIN_MS;
    const t0 = performance.now();
    let last = t0;
    let shown = 0;
    let doneAt = 0;
    let lastAria = -1;
    let raf = 0;

    const tick = (now: number) => {
      const elapsed = now - t0;
      const dt = Math.min(64, now - last);
      last = now;

      const target = elapsed >= CAP_MS ? 1 : getPreloadProgress();
      const goal = Math.min(target, Math.min(1, elapsed / minMs));
      // kare hızından bağımsız üstel yaklaşma
      shown += (goal - shown) * (1 - Math.pow(0.9, dt / 16.7));
      if (goal >= 1 && shown > 0.996) shown = 1;

      root.style.setProperty("--p", shown.toFixed(4));
      const pct = Math.round(shown * 100);
      if (barRef.current && pct - lastAria >= 5) {
        lastAria = pct;
        barRef.current.setAttribute("aria-valuenow", String(pct));
      }

      if (shown === 1) {
        if (!doneAt) doneAt = now;
        if (now - doneAt >= HOLD_MS) {
          barRef.current?.setAttribute("aria-valuenow", "100");
          setPreloadPhase("revealing");
          return;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, reduce]);

  // Sönümleme bitince ekranı kaldır.
  useEffect(() => {
    if (phase !== "revealing") return;
    const id = window.setTimeout(
      () => setPreloadPhase("done"),
      reduce ? 300 : FADE_MS,
    );
    return () => window.clearTimeout(id);
  }, [phase, reduce]);

  if (phase === "done") return null;

  const revealing = phase === "revealing";

  return (
    <div
      ref={rootRef}
      className="site-loader fixed inset-x-0 top-0 z-[2000] h-lvh"
      style={
        {
          "--p": 0,
          // Hero her temada koyu; açılış ekranı da öyle (açık temada
          // --brand-pitch neredeyse beyaz olduğu için token kullanılmıyor).
          background: "oklch(0.151 0.014 171)",
          opacity: revealing ? 0 : 1,
          transition: `opacity ${reduce ? 300 : FADE_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
          pointerEvents: revealing ? "none" : "auto",
          touchAction: "none",
        } as React.CSSProperties
      }
    >
      <div
        ref={barRef}
        role="progressbar"
        aria-label={t("label")}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={0}
        className="grid h-svh place-items-center"
      >
        <div className="flex flex-col items-center">
          <div className="relative" style={{ width: LOGO_W, height: LOGO_H }}>
            {/* sönük wordmark — yanmamış panolar */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/pengrim_beyaz.png"
              alt=""
              aria-hidden="true"
              className="absolute inset-0 size-full object-contain opacity-[0.16]"
            />
            {/* yanan kısım: wordmark maskesi içinde soldan sağa dolgu + öncü LED parıltısı */}
            <div aria-hidden="true" className="absolute inset-0" style={LOGO_MASK}>
              <div
                className="absolute inset-0 bg-white"
                style={{ clipPath: "inset(0 calc((1 - var(--p)) * 100%) 0 0)" }}
              />
              {!reduce && (
                <div
                  className="absolute inset-y-0 w-[16%] bg-linear-to-r from-transparent via-led to-transparent"
                  style={{
                    left: "calc(var(--p) * 100% - 8%)",
                    opacity: "calc(1 - var(--p) * var(--p) * var(--p) * var(--p))",
                  }}
                />
              )}
            </div>
          </div>

          {/* hero'daki logo altı parıltının birebir kopyası, ilerlemeyle ortadan açılır */}
          <div aria-hidden="true" className="relative mt-0 h-10 w-[min(72vw,600px)]">
            <div
              className="absolute inset-0 origin-center"
              style={{ transform: "scaleX(var(--p))" }}
            >
              <div className="absolute inset-x-[12%] top-0 h-px w-3/4 bg-linear-to-r from-transparent via-turf to-transparent" />
              <div className="absolute inset-x-[12%] top-0 h-0.5 w-3/4 bg-linear-to-r from-transparent via-turf to-transparent blur-sm" />
              <div className="absolute inset-x-[37%] top-0 h-px w-1/4 bg-linear-to-r from-transparent via-led to-transparent" />
              <div className="absolute inset-x-[37%] top-0 h-0.75 w-1/4 bg-linear-to-r from-transparent via-led to-transparent blur-sm" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
