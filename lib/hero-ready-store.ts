/**
 * Hero'nun scrub'a hazır olup olmadığını yayınlayan minimal store
 * (`hero-intro-store.ts` ile aynı desen, bağımlılık yok).
 *
 * "Hazır" = poster karesi canvas'a boyandı VE ilk yükleme penceresindeki
 * kareler geldi. Yani kullanıcı aşağı kaydırmaya başladığında scrub'ın
 * takılmadan ilerleyeceği nokta.
 *
 * Tek tüketici `FirstVisitGate`; hazır olmayı 400 ms içinde göremezse kısa bir
 * kapı gösterir. Bu yüzden değer TEK YÖNLÜ: bir kez true olunca geri dönmez
 * (kare seti cihaz döndürmede yeniden yüklense bile kapı tekrar açılmamalı).
 */

let ready = false;
const listeners = new Set<() => void>();

export function setHeroReady() {
  if (ready) return;
  ready = true;
  listeners.forEach((l) => l());
}

export function subscribeHeroReady(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getHeroReady() {
  return ready;
}

/** SSR: hazır kabul edilir — kapı yalnızca istemcide, ölçülen gecikmeye göre açılır. */
export function getHeroReadyServerSnapshot() {
  return true;
}
