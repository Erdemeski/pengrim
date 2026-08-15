/**
 * Hero "intro" evresi için minimal harici store (bağımlılık yok).
 *
 * Hero, pinlenen scroll-scrub zaman çizelgesinin ilk ~%18'inde (ilk kareler)
 * merkezî statik logoyu gösterir; scroll ile logo sönümlenir ve hero
 * yazısına yer açılır. Header bu evrede cam arka planını + logosunu gizleyip
 * yalnız navigasyonu gösterir. İki bileşenin tek kaynaktan senkron kalması için
 * durum buradan yayınlanır.
 *
 * YAYINLANAN DEĞER BİR BOOLEAN, İLERLEME DEĞİL. Hero `setHeroIntroProgress`'i
 * her scrub karesinde (~60/sn) çağırıyor; tek tüketici olan header ise yalnızca
 * "intro aktif mi" bilgisini kullanıyor. Float yayınlandığında header ağacının
 * tamamı (GooeyNav + GlassSurface + Logo + toggle'lar) sayfanın en kritik
 * animasyonu boyunca her karede yeniden render oluyordu. Boolean'a çevrilince
 * tüm scrub boyunca yalnızca eşik geçişinde tek bir render kalıyor.
 *
 * Varsayılan `true`: sayfa her zaman en üstten açılır (SmoothScroll refresh'te
 * scrollTo(0) yapar), dolayısıyla ilk paint'te intro aktiftir. Böylece header
 * en üstte doğrudan "yalnız nav" halinde render olur (cam header flaşı olmaz).
 */

/** İlerlemenin bu değerin altında olduğu aralık "intro aktif" sayılır. */
const INTRO_ACTIVE_UNTIL = 0.7;

let active = true;
const listeners = new Set<() => void>();

/**
 * @param next 0 = intro başında (logo tam görünür) … 1 = intro bitti.
 * Dinleyiciler yalnızca eşik geçişinde uyarılır.
 */
export function setHeroIntroProgress(next: number) {
  const clamped = next < 0 ? 0 : next > 1 ? 1 : next;
  const nextActive = clamped < INTRO_ACTIVE_UNTIL;
  if (nextActive === active) return;
  active = nextActive;
  listeners.forEach((l) => l());
}

export function subscribeHeroIntro(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getHeroIntroActive() {
  return active;
}

/** SSR anlık görüntüsü — sunucuda (ve ilk client hydration'ında) intro aktif
 *  kabul edilir; hero mount olunca gerçek scroll değerini yayınlar. */
export function getHeroIntroServerSnapshot() {
  return true;
}
