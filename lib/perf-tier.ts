"use client";

import { useSyncExternalStore } from "react";
import { subscribeScroll } from "./scroll-clock";

/**
 * Cihaz performans seviyesi: "high" | "low".
 *
 * Pahalı efektler (backdrop-filter katmanları, SVG displacement camı, tam
 * ekran WebGL, blur tween'leri) bu seviyeye göre hafifletilir; içerik ve
 * hareketler aynı kalır.
 *
 * İki aşamalı karar:
 *  1. Statik sinyaller (ilk okumada): Save-Data, düşük RAM (≤ 4 GB),
 *     düşük çekirdek sayısı (≤ 4). Bunlardan biri varsa doğrudan "low".
 *  2. Çalışma zamanı ölçümü: kullanıcı kaydırırken kare aralıkları
 *     örneklenir; kaydırma sırasında medyan kare süresi ~45 fps'in altına
 *     düşerse seviye kalıcı olarak "low"a iner ve aboneler bilgilendirilir.
 *     (Kağıt üstünde güçlü görünen ama GPU'su zayıf cihazlar burada yakalanır.)
 *
 * Hata ayıklama: `?tier=low` / `?tier=high` URL parametresi kararı zorlar.
 */

export type PerfTier = "high" | "low";

let tier: PerfTier | null = null;
let forced = false;
const listeners = new Set<() => void>();

function detectStatic(): PerfTier {
  if (typeof window === "undefined") return "high";
  try {
    const q = new URLSearchParams(window.location.search).get("tier");
    if (q === "low" || q === "high") {
      forced = true;
      return q;
    }
  } catch {
    // no-op
  }
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  if (nav.connection?.saveData) return "low";
  if (typeof nav.deviceMemory === "number" && nav.deviceMemory <= 4) return "low";
  if (
    typeof nav.hardwareConcurrency === "number" &&
    nav.hardwareConcurrency > 0 &&
    nav.hardwareConcurrency <= 4
  ) {
    return "low";
  }
  return "high";
}

function setTier(next: PerfTier) {
  if (tier === next) return;
  tier = next;
  listeners.forEach((l) => l());
}

// ——— çalışma zamanı fps örneklemesi ———————————————————————————————
const SAMPLE_FRAMES = 90; // ~1.5 sn kaydırma @60 Hz
const SLOW_FRAME_MS = 22; // ~45 fps
const MAX_PROBES = 3;

let probing = false;
let probesDone = false;

function startProbe() {
  if (probesDone || forced || typeof window === "undefined") return;
  probing = true;
  let unsub: (() => void) | null = null;
  let lastScrollAt = 0;
  let lastFrame = 0;
  let rounds = 0;
  const deltas: number[] = [];

  const onFrame = (t: number) => {
    if (tier === "low" || document.hidden) {
      lastFrame = 0;
    } else if (t - lastScrollAt < 120) {
      // yalnız kullanıcı gerçekten kaydırırken ölç
      if (lastFrame) deltas.push(t - lastFrame);
      lastFrame = t;
    } else {
      lastFrame = 0;
    }

    if (deltas.length >= SAMPLE_FRAMES) {
      const sorted = deltas.slice().sort((a, b) => a - b);
      const median = sorted[sorted.length >> 1];
      deltas.length = 0;
      rounds++;
      if (median > SLOW_FRAME_MS) setTier("low");
      if (tier === "low" || rounds >= MAX_PROBES) {
        probing = false;
        probesDone = true;
        unsub?.();
        return;
      }
    }
    if (probing) requestAnimationFrame(onFrame);
  };

  unsub = subscribeScroll(() => {
    lastScrollAt = performance.now();
  });
  requestAnimationFrame(onFrame);
}

export function getPerfTier(): PerfTier {
  if (tier === null) {
    tier = detectStatic();
    if (tier === "high" && !probing) {
      // sayfa açılışının yükleme dalgasını ölçmeyelim
      window.setTimeout(startProbe, 2500);
    }
  }
  return tier;
}

function subscribeTier(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function onPerfTierChange(cb: (t: PerfTier) => void) {
  return subscribeTier(() => cb(getPerfTier()));
}

const getServerTier = (): PerfTier => "high";

/** React hook — hydration sırasında "high", sonra gerçek seviye. */
export function usePerfTier(): PerfTier {
  return useSyncExternalStore(subscribeTier, getPerfTier, getServerTier);
}

// ——— dokunmatik (kaba işaretçi) ————————————————————————————————
const COARSE_MQ = "(pointer: coarse)";

function subscribeCoarse(cb: () => void) {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mq = window.matchMedia(COARSE_MQ);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

export function isCoarsePointer(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia(COARSE_MQ).matches
  );
}

export function useIsCoarsePointer(): boolean {
  return useSyncExternalStore(subscribeCoarse, isCoarsePointer, () => false);
}

/** Samsung Internet — `backdrop-filter: url()` yolunda bozuk tile üretebiliyor. */
export function isSamsungInternet(): boolean {
  return typeof navigator !== "undefined" && /SamsungBrowser/i.test(navigator.userAgent);
}
