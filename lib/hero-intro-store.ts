/**
 * Hero "intro" evresi için minimal harici store (bağımlılık yok).
 *
 * Hero, pinlenen scroll-scrub zaman çizelgesinin ilk ~%18'inde (ilk kareler)
 * merkezî MetallicPaint logosunu gösterir; scroll ile logo sönümlenir ve hero
 * yazısına yer açılır. Header bu evrede cam arka planını + logosunu gizleyip
 * yalnız navigasyonu gösterir. İki bileşenin tek kaynaktan senkron kalması için
 * ilerleme buradan yayınlanır.
 *
 * progress: 0 = intro başında (logo tam görünür) … 1 = intro bitti (hero yazısı).
 *
 * Varsayılan 0: sayfa her zaman en üstten açılır (SmoothScroll refresh'te
 * scrollTo(0) yapar), dolayısıyla ilk paint'te intro aktiftir. Böylece header
 * en üstte doğrudan "yalnız nav" halinde render olur (cam header flaşı olmaz).
 */
let progress = 0;
const listeners = new Set<() => void>();

export function setHeroIntroProgress(next: number) {
  const clamped = next < 0 ? 0 : next > 1 ? 1 : next;
  if (clamped === progress) return;
  progress = clamped;
  listeners.forEach((l) => l());
}

export function subscribeHeroIntro(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getHeroIntroProgress() {
  return progress;
}

/** SSR anlık görüntüsü — sunucuda (ve ilk client hydration'ında) intro aktif (0)
 *  kabul edilir; hero mount olunca gerçek scroll değerini yayınlar. */
export function getHeroIntroServerSnapshot() {
  return 0;
}
