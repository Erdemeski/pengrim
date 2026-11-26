/**
 * Kararlı viewport ölçüsü.
 *
 * Mobil tarayıcılarda URL / araç çubuğu ilk kaydırmada gizlenip en üstte geri
 * geliyor ve `innerHeight` bu sırada değişiyor. Bir efekt yüksekliği çubuk
 * AÇIKKEN ölçüp sabitlerse, çubuk gizlenince altta boşluk kalıyordu (hero
 * kareleri, tam ekran envanter görseli, dalga arka planı).
 *
 * Çözüm: kaplama katmanları her zaman **büyük viewport**'a (`100lvh`, çubuklar
 * gizliyken görünen alan) göre boyutlanır. Bu değer çubuk açılıp kapanırken
 * DEĞİŞMEZ — ne ölçüm kayar ne de yeniden hesap gerekir. Okunması gereken
 * içerik ise CSS'te `svh` kutusunda tutulur (çubuk açıkken de görünür).
 *
 * `100lvh` desteklenmiyorsa (çok eski tarayıcı) prob `100vh`'ye düşer; mobil
 * tarayıcılarda `vh` zaten büyük viewport'a eşittir.
 */

type Viewport = { w: number; h: number };

let probe: HTMLDivElement | null = null;
let cached: Viewport | null = null;
const listeners = new Set<() => void>();
let listening = false;

function ensureProbe(): HTMLDivElement {
  if (probe && probe.isConnected) return probe;
  probe = document.createElement("div");
  probe.setAttribute("aria-hidden", "true");
  probe.style.cssText =
    "position:fixed;top:0;left:0;width:0;height:100vh;height:100lvh;visibility:hidden;pointer-events:none;";
  document.body.appendChild(probe);
  return probe;
}

function measure(): Viewport {
  const w = document.documentElement.clientWidth || window.innerWidth;
  const ph = ensureProbe().offsetHeight;
  // Prob okunamazsa (body henüz yok vb.) en büyük bilinen yükseklik.
  const h = Math.max(ph || 0, window.innerHeight);
  return { w, h };
}

function onResize() {
  const next = measure();
  if (cached && next.w === cached.w && next.h === cached.h) return;
  cached = next;
  listeners.forEach((l) => l());
}

/** Büyük viewport (lvh) yüksekliği + layout genişliği, px. */
export function getStableViewport(): Viewport {
  if (typeof window === "undefined") return { w: 1280, h: 800 };
  if (!cached) cached = measure();
  return cached;
}

/**
 * Yalnız genişlik veya büyük viewport yüksekliği GERÇEKTEN değiştiğinde
 * (döndürme, pencere boyutu) tetiklenir — URL çubuğu animasyonunda değil.
 */
export function subscribeViewport(cb: () => void) {
  listeners.add(cb);
  if (!listening && typeof window !== "undefined") {
    listening = true;
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
  }
  return () => {
    listeners.delete(cb);
  };
}
