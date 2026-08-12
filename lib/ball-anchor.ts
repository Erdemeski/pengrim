/**
 * `inventory-feature.webp` içindeki futbol topunun ekrandaki konumunu,
 * `ScrollExpandCard`'ın kendi dönüşüm matematiğinden **yeniden türeten** saf
 * yardımcı + minimal store (bkz. `hero-intro-store.ts` deseni).
 *
 * Neden anlık değer değil de geometri yayınlanıyor?
 * `ScrollExpandCard` ve topu çizen `BallJourney` ayrı rAF döngülerinde çalışıyor.
 * Biri diğerinin yazdığı anlık x/y'yi okusaydı, dinleyici sırasına göre bir frame
 * gecikme oluşur ve top fotoğrafın üstünde titrerdi. Bunun yerine ScrollExpandCard
 * yalnız **ölçümde değişen** büyüklükleri yayınlar; BallJourney canlı
 * `window.scrollY` ile kendi hesabını yapar. Böylece iki bileşen arasında frame
 * bağımlılığı kalmaz ve `ScrollExpandCard.apply()` hiç değişmek zorunda kalmaz.
 *
 * Buradaki formüller `ScrollExpandCard.apply()` ile birebir aynı olmak
 * ZORUNDA — biri değişirse diğeri de değişmeli.
 */

/** Topun fotoğraf içindeki yeri — normalize (0..1), sharp ile kırpılıp ölçüldü. */
export const BALL_U = 0.778; // merkez x / görsel genişliği
export const BALL_V = 0.788; // merkez y / görsel yüksekliği
export const BALL_D = 0.08; // çap / görsel genişliği

/** only_ball.webp: topun çapı / dosya genişliği (alfa sınırlayıcı kutudan ölçüldü). */
export const BALL_PNG_FILL = 0.80078;

export type BallAnchorGeom = {
  /** ScrollExpandCard ölçüm yapabildi mi (reduced-motion / kısa span'de false). */
  enabled: boolean;
  /** Track'in sayfa üstüne uzaklığı (offsetTop zinciri). */
  top: number;
  /** viewportH − dinlenme kartı yüksekliği. */
  span: number;
  /** Tam ekranda sabit kalma mesafesi (sahte pin). */
  hold: number;
  /** Dinlenmedeki görsel yakınlaştırması. */
  zoom: number;
  /** Frame'in viewport'taki sol kenarı (trackCenterX − vw/2). */
  frameLeft: number;
  /** Dinlenmede kartın yanlarındaki clip payı. */
  side: number;
  vw: number;
  vh: number;
  /** Görselin doğal boyutu (object-cover eşlemesi için). */
  nw: number;
  nh: number;
  /** Görselin `object-position` oranı (0..1) — bkz. solveObjectPosition. */
  posX: number;
  posY: number;
};

export type BallAnchor = {
  /** Topun viewport'taki merkezi. */
  x: number;
  y: number;
  /** Topun viewport'taki çapı. */
  d: number;
  /** Kartın açılma ilerlemesi (0..1) — yumuşak belirmeyi bu sürer. */
  open: number;
  /** Kartın o an görünen dikdörtgeni (clip-path), viewport koordinatında. */
  clipTop: number;
  clipBottom: number;
  clipLeft: number;
  clipRight: number;
};

const DISABLED: BallAnchorGeom = {
  enabled: false,
  top: 0,
  span: 0,
  hold: 0,
  zoom: 1,
  frameLeft: 0,
  side: 0,
  vw: 0,
  vh: 0,
  nw: 0,
  nh: 0,
  posX: 0.5,
  posY: 0.5,
};

let geom: BallAnchorGeom = DISABLED;
const listeners = new Set<() => void>();

export function setBallAnchorGeom(next: BallAnchorGeom) {
  geom = next;
  listeners.forEach((l) => l());
}

export function clearBallAnchorGeom() {
  setBallAnchorGeom(DISABLED);
}

export function getBallAnchorGeom(): BallAnchorGeom {
  return geom;
}

export function subscribeBallAnchorGeom(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const clamp = (v: number, a: number, b: number): number =>
  v < a ? a : v > b ? b : v;

export const smoothstep = (edge0: number, edge1: number, x: number): number => {
  const t = clamp((x - edge0) / (edge1 - edge0 || 1e-6), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Uçlarda ivmesi de sıfır olan yumuşatma — yol başlangıç/bitişinde sıçrama olmasın. */
export const smootherstep = (x: number): number => {
  const t = clamp(x, 0, 1);
  return t * t * t * (t * (t * 6 - 15) + 10);
};

/** offsetParent zinciri: uygulanan CSS transform'lardan etkilenmez. */
export const offsetTopOf = (el: HTMLElement): number => {
  let y = 0;
  let node: HTMLElement | null = el;
  while (node) {
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return y;
};

/**
 * Tek eksende `object-position` oranı: top kadrajın içinde ve kenardan `margin`
 * kadar uzakta kalacak **en küçük** kaydırma. Kırpma yoksa ya da top zaten
 * rahatça görünüyorsa 0.5 döner — yani geniş ekranlarda kadraj hiç oynamaz.
 */
const axisPosition = (
  size: number,
  drawn: number,
  u: number,
  r: number,
  margin: number
): number => {
  const slack = size - drawn; // object-cover'da ≤ 0
  if (slack > -0.5) return 0.5; // bu eksende kırpma yok
  const centered = slack * 0.5 + u * drawn;
  const lo = margin + r;
  const hi = size - margin - r;

  let target: number;
  if (hi < lo) target = size / 2; // top boşluğa sığmıyor: ortala
  else if (centered > hi) target = hi;
  else if (centered < lo) target = lo;
  else return 0.5; // zaten görünür — kadrajı bozma

  return clamp((target - u * drawn) / slack, 0, 1);
};

/**
 * Görselin `object-position` oranı. Amaç: **her cihaz oranında** fotoğraftaki
 * top kadrajın içinde kalsın, böylece bağımsız top tam olarak onun üstünden,
 * onun boyutunda yola çıksın. Kaydırma minimum tutulur; masaüstü oranlarında
 * (top zaten görünür) sonuç 0.5/0.5 olur ve mevcut kadraj korunur.
 */
export function solveObjectPosition(
  vw: number,
  vh: number,
  nw: number,
  nh: number
): { px: number; py: number } {
  if (!nw || !nh) return { px: 0.5, py: 0.5 };
  const sc = Math.max(vw / nw, vh / nh);
  const dw = nw * sc;
  const dh = nh * sc;
  const r = (BALL_D * dw) / 2;
  return {
    px: axisPosition(vw, dw, BALL_U, r, Math.max(24, vw * 0.07)),
    py: axisPosition(vh, dh, BALL_V, r, Math.max(24, vh * 0.07)),
  };
}

/**
 * Verilen scroll konumunda topun ekrandaki yeri.
 * `ScrollExpandCard.apply()`'daki T/p/e/b/pin/z/dy zincirinin aynısı, üstüne
 * `object-cover` eşlemesi ve sarmalayıcının `scale(z) + translateY(dy)` dönüşümü.
 */
export function computeBallAnchor(
  g: BallAnchorGeom,
  scrollY: number
): BallAnchor {
  const T = g.top - scrollY;
  const p = clamp((g.span - T) / (g.span || 1e-6), 0, 1);
  const e = p * p * (3 - 2 * p);
  const b = clamp(T, 0, g.span);
  const pin = clamp(-T, 0, g.hold);
  const z = g.zoom - (g.zoom - 1) * e;
  const dy = -b / 2;
  const side = g.side * (1 - e);

  // object-cover: frame kutusu (vw × vh) içinde görselin kapladığı gerçek alan.
  const sc = Math.max(g.vw / (g.nw || 1), g.vh / (g.nh || 1));
  const dw = g.nw * sc;
  const dh = g.nh * sc;
  const ox = (g.vw - dw) * g.posX;
  const oy = (g.vh - dh) * g.posY;

  // Sarmalayıcı dönüşümü öncesi, frame-yerel konum.
  const bx = ox + BALL_U * dw;
  const by = oy + BALL_V * dh;

  // scale(z) merkez etrafında, ardından translateY(dy).
  const sx = g.vw / 2 + (bx - g.vw / 2) * z;
  const sy = g.vh / 2 + (by - g.vh / 2) * z + dy;

  // Frame'in viewport üstü = T + pin (absolute top-0 + translateY(pin)).
  const frameTop = T + pin;

  return {
    x: g.frameLeft + sx,
    y: frameTop + sy,
    d: BALL_D * dw * z,
    open: p,
    clipTop: frameTop,
    clipBottom: frameTop + g.vh - b,
    clipLeft: g.frameLeft + side,
    clipRight: g.frameLeft + g.vw - side,
  };
}
