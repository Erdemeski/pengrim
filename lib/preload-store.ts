"use client";

import { useSyncExternalStore } from "react";

/**
 * Açılış ekranının (SiteLoader) izlediği yükleme görevleri + sahne evresi.
 *
 * Görevler modül yüklenirken STATİK olarak kayıtlı: SiteLoader ilerlemeyi
 * hero kendi görevlerini kaydetmeden önce okursa yalnız "font + load"
 * görevlerini görüp erkenden %100'e çıkardı. Ağırlıklar görevlerin beklenen
 * süresiyle orantılı (kare dizisi en uzunu).
 *
 * Evre:
 *   loading   → açılış ekranı görünür, scroll kilitli
 *   revealing → ekran sönümleniyor; hero'nun giriş animasyonları (ışık
 *               huzmeleri, LED şeridi) TAM bu anda başlar
 *   done      → ekran kaldırıldı, scroll serbest
 */

export type PreloadTask = "hero-frames" | "side-rays" | "fonts" | "window-load";
export type PreloadPhase = "loading" | "revealing" | "done";

const tasks: Record<PreloadTask, { weight: number; p: number }> = {
  "hero-frames": { weight: 6, p: 0 },
  "side-rays": { weight: 1, p: 0 },
  fonts: { weight: 1, p: 0 },
  "window-load": { weight: 2, p: 0 },
};

let phase: PreloadPhase = "loading";
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function setTaskProgress(id: PreloadTask, p: number) {
  const t = tasks[id];
  const next = p < 0 ? 0 : p > 1 ? 1 : p;
  // ilerleme geri gitmez (ör. cihaz döndürmede kare seti yeniden yüklenirken)
  if (next <= t.p) return;
  t.p = next;
}

export function completeTask(id: PreloadTask) {
  setTaskProgress(id, 1);
}

/** Ağırlıklı toplam ilerleme, 0..1. */
export function getPreloadProgress(): number {
  let sum = 0;
  let w = 0;
  for (const k in tasks) {
    const t = tasks[k as PreloadTask];
    sum += t.p * t.weight;
    w += t.weight;
  }
  return w ? sum / w : 1;
}

export function setPreloadPhase(next: PreloadPhase) {
  if (phase === next) return;
  phase = next;
  emit();
}

export function getPreloadPhase(): PreloadPhase {
  return phase;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** SSR'de ve hidrasyonda "loading": açılış ekranı ilk boyamadan itibaren örter. */
const serverPhase = (): PreloadPhase => "loading";

export function usePreloadPhase(): PreloadPhase {
  return useSyncExternalStore(subscribe, getPreloadPhase, serverPhase);
}
