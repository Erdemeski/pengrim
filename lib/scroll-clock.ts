/**
 * Sayfanın TEK scroll saati.
 *
 * Neden var: önceden Lenis kendi rAF döngüsünde, GSAP kendi ticker'ında,
 * BallJourney / ScrollExpandCard / ScrollStack ise her biri ayrı bir
 * `scroll` olayı + rAF ile çalışıyordu. Lenis kaydırmayı kendi rAF'ında
 * yazarken bu bileşenler bir önceki karenin `scrollY`'sini çiziyordu →
 * bir karelik gecikme. Düşük fps'te kare başına scroll farkı büyüdüğü için
 * top ve kartlar "yanlış konumda, yanlış ivmeyle" titriyordu.
 *
 * Artık:
 *  - Lenis açıkken (SmoothScroll) abone fonksiyonları Lenis'in `scroll`
 *    olayından, yani Lenis scroll'u yazdığı AYNI tick'te çağrılır. Lenis de
 *    GSAP ticker'ından sürüldüğü için ScrollTrigger ile aynı karedeyiz.
 *    (Dokunmatikte Lenis native scroll'u dinleyip yine aynı olayı yayar.)
 *  - Lenis yokken (prefers-reduced-motion) pasif native `scroll` dinlenir;
 *    Chromium/WebKit scroll olayını zaten kare başına bir kez, rAF'tan hemen
 *    önce gönderir — ek rAF gecikmesi eklenmez.
 *
 * Aboneler kayıt sırasıyla, aynı `scrollY` değeriyle çağrılır.
 */

type ScrollFn = (scrollY: number) => void;

type LenisLike = {
  on: (event: "scroll", cb: () => void) => () => void;
};

const subs = new Set<ScrollFn>();
let detachSource: (() => void) | null = null;
let lenisAttached = false;

const emit = () => {
  const y = window.scrollY;
  subs.forEach((fn) => fn(y));
};

function attachNative() {
  if (typeof window === "undefined" || detachSource) return;
  window.addEventListener("scroll", emit, { passive: true });
  detachSource = () => window.removeEventListener("scroll", emit);
}

/** SmoothScroll Lenis örneği hazır olduğunda çağırır. */
export function attachLenisToScrollClock(lenis: LenisLike) {
  detachSource?.();
  const off = lenis.on("scroll", emit);
  lenisAttached = true;
  detachSource = () => {
    off();
    lenisAttached = false;
  };
  return () => {
    if (!lenisAttached) return;
    detachSource?.();
    detachSource = null;
    if (subs.size) attachNative();
  };
}

/** Scroll saatine abone ol. Dönen fonksiyon aboneliği iptal eder. */
export function subscribeScroll(fn: ScrollFn) {
  subs.add(fn);
  if (!detachSource) attachNative();
  return () => {
    subs.delete(fn);
  };
}
