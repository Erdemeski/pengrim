"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties, ReactNode } from "react";
import Image from "next/image";
import { useReducedMotion } from "motion/react";
import {
  BALL_BOX,
  BALL_FADE_IN0,
  BALL_FADE_IN1,
  BALL_PNG_FILL,
  ballFrameLayout,
  clearBallAnchorGeom,
  setBallAnchorGeom,
  solveObjectPosition,
} from "@/lib/ball-anchor";
import { subscribeScroll } from "@/lib/scroll-clock";
import { getStableViewport, subscribeViewport } from "@/lib/viewport";

/**
 * React Bits `ScrollExpand`in kart-çapalı uyarlaması.
 *
 * Stok bileşen 100vh'lik bir sahnenin ortasında duran bir çerçeve varsayar; bento
 * grid'inin son satırında bu, kartın etrafında bir ekran boyu boşluk bırakırdı.
 * Burada çerçeve **kartın kendi kutusuna** çapalanır ve dört fazda açılır:
 *
 *   A dinlenme  T > span         → sıradan bento kartı (304px)
 *   B açılma    0 < T ≤ span     → alt kenar viewport tabanına yapışık, kart büyür
 *   C sabit     −hold ≤ T ≤ 0    → tam ekran, translateY ile sahte pin
 *   D bırakma   T < −hold        → görsel yukarı kayar, sonraki bölüm gelir
 *
 * (T = track'in viewport üstüne uzaklığı, span = viewportH − kartH.)
 *
 * Kritik iki nokta:
 *  1. Alt inset **canlı T**'den hesaplanır; easing/lerp uygulanmaz. Aksi halde hızlı
 *     scroll'da alt kenar geride kalır ve kartın altında boş şerit görünür.
 *  2. Scrim/border, clip dikdörtgeniyle birebir örtüşen ayrı bir katmanda (`win`)
 *     durur: gradyan tam-viewport çerçeveye uygulansa dinlenmede sadece en şeffaf
 *     ucu görünür, `clip-path: inset()` ise çerçevedeki border'ı tamamen yutar.
 *
 * Ek olarak (scroll senkronu):
 *  - Güncellemeler sayfanın tek scroll saatinden (`lib/scroll-clock`) gelir;
 *    BallJourney ile aynı karede, aynı scrollY ile çalışır.
 *  - Clip'in alt kenarı viewport tabanının biraz ALTINA taşırılır
 *    (`BOTTOM_OVERSCAN`). Dokunmatik scroll compositor'da JS'ten bir kare önde
 *    gittiğinde eskiden altta boş şerit görünüyordu; artık o şerit ekran
 *    dışında kalıyor. Görsel bu bölgeyi zaten kaplıyor (bkz. apply()).
 *  - `ballAnchor` açıkken tutunma fazındaki top, fotoğraf sarmalayıcısıyla
 *    AYNI transform'u taşıyan bir katmanda çizilir → fotoğrafa kilitli.
 *
 * Ölçüm yapılmadan (SSR / JS kapalı) ve prefers-reduced-motion'da CSS değişkenlerinin
 * fallback değerleri statik kartı üretir — hidrasyon uyuşmazlığı ya da boş blok yok.
 */

/** Alt kenar taşırma payı (px) — bkz. üstteki not. */
const BOTTOM_OVERSCAN = 96;

const clamp = (v: number, a: number, b: number): number =>
  v < a ? a : v > b ? b : v;

const smoothstep = (edge0: number, edge1: number, x: number): number => {
  const t = clamp((x - edge0) / (edge1 - edge0 || 1e-6), 0, 1);
  return t * t * (3 - 2 * t);
};

/** offsetParent zinciri: transform'lardan etkilenmez, geri besleme döngüsü kurmaz. */
const offsetTopOf = (el: HTMLElement): number => {
  let y = 0;
  let node: HTMLElement | null = el;
  while (node) {
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return y;
};

export interface ScrollExpandCardProps {
  src: string;
  alt?: string;
  title: string;
  desc: string;
  /** Sunucudan eleman olarak gelir (<IconChip><Icon /></IconChip>). */
  icon?: ReactNode;
  /** Kartın altındaki küçük "kaydır" ipucu. */
  hint?: string;
  /** Tam ekrana ulaşınca beliren tek satırlık ifade (aria-hidden). */
  caption?: ReactNode;
  className?: string;
  /** Dinlenme yüksekliği (px) — komşu bento hücresinden ölçülemezse kullanılır. */
  restHeight?: number;
  /** Tam ekranda sabit kalma mesafesi, viewport yüksekliğinin katı olarak. */
  holdRatio?: number;
  /** Dinlenmedeki görsel yakınlaştırması; açıldıkça 1'e döner. */
  zoom?: number;
  imageQuality?: number;
  /**
   * Görseldeki futbol topunu "çapa" olarak kullanır. İki şey yapar:
   *  1. Ölçüm geometrisini `lib/ball-anchor` store'una yayınlar; `BallJourney`
   *     topun ekran konumunu buradan türetir.
   *  2. `object-position`'ı, top HER cihaz oranında kadrajda kalacak en küçük
   *     kaydırmayla ayarlar — aksi halde dar/portre ekranlarda cover görselin
   *     sağını kırpıyor ve top hiç görünmüyor.
   * Bileşen başka yerde de kullanılabildiği için varsayılan kapalı: store tek
   * sahipli kalsın ve diğer kullanımların kadrajı bozulmasın.
   */
  ballAnchor?: boolean;
}

export default function ScrollExpandCard({
  src,
  alt = "",
  title,
  desc,
  icon,
  hint,
  caption,
  className = "",
  restHeight = 304,
  holdRatio = 0.28,
  zoom = 1.12,
  imageQuality = 85,
  ballAnchor = false,
}: ScrollExpandCardProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const winRef = useRef<HTMLDivElement | null>(null);
  /** Görselin doğal boyutu — object-cover eşlemesi buna dayanır, sabit yazılmaz. */
  const naturalRef = useRef({ w: 0, h: 0 });
  const remeasureRef = useRef<(() => void) | null>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const track = trackRef.current;
    const frame = frameRef.current;
    const win = winRef.current;
    if (!track || !frame || !win) return;

    const s = {
      top: 0,
      span: 0,
      side: 0,
      frameLeft: 0,
      hold: 0,
      radius: 20,
      enabled: false,
    };
    let lastKey = "";
    let roTimer = 0;

    // Yalnız kendi yazdığımız özellikleri geri al — React'in style prop'u kalsın.
    const VARS = [
      "--se-vw",
      "--se-h",
      "--se-b",
      "--se-x",
      "--se-rad",
      "--se-radb",
      "--se-pin",
      "--se-dy",
      "--se-z",
      "--se-rest-o",
      "--se-cap-o",
      "--se-op",
      "--se-wb",
      "--se-ball-x",
      "--se-ball-y",
      "--se-ball-k",
      "--se-ball-o",
    ];
    const clear = () => {
      track.style.height = "";
      for (const v of VARS) frame.style.removeProperty(v);
      frame.style.willChange = "";
      lastKey = "";
    };

    const measure = () => {
      const vw = document.documentElement.clientWidth;
      // Büyük viewport: URL çubuğu gizlenince de tam ekran görsel alta oturur.
      const H = getStableViewport().h;

      // Komşu hücrenin gerçek yüksekliği: bento satırı içeriğe göre esneyebilir.
      const prev = track.previousElementSibling as HTMLElement | null;
      const C = Math.max(
        restHeight,
        prev ? Math.round(prev.getBoundingClientRect().height) : 0
      );

      s.span = H - C;
      s.enabled = !reduce && s.span >= 160;

      if (!s.enabled) {
        clear();
        if (ballAnchor) clearBallAnchorGeom();
        return;
      }

      // --se-rad yazılmadan önce oku: dinlenme yarıçapı --radius-2xl'den gelir.
      frame.style.removeProperty("--se-rad");
      s.radius = parseFloat(getComputedStyle(win).borderTopLeftRadius) || 20;

      s.hold = Math.round(H * holdRatio);
      track.style.height = `${H + s.hold}px`;
      s.top = offsetTopOf(track);
      const rect = track.getBoundingClientRect();
      s.side = Math.max(0, (vw - rect.width) / 2);
      // Frame `left:50%` + `translateX(-50%)` ile track merkezine oturur; kendi
      // genişliği vw olduğundan viewport'taki sol kenarı buradan çıkar. Yatay
      // konum scroll'dan bağımsız olduğu için ölçümde cache'lenebilir.
      s.frameLeft = rect.left + rect.width / 2 - vw / 2;

      frame.style.setProperty("--se-vw", `${vw}px`);
      frame.style.setProperty("--se-h", `${H}px`);
      lastKey = "";

      if (ballAnchor) {
        // onLoad kaçmış olabilir (önbellek/bfcache): doğal boyutu DOM'dan da dene.
        if (!naturalRef.current.w) {
          const img = frame.querySelector("img");
          if (img && img.naturalWidth > 0) {
            naturalRef.current = { w: img.naturalWidth, h: img.naturalHeight };
          }
        }
        const n = naturalRef.current;
        if (n.w > 0 && n.h > 0) {
          // Kadrajı topa göre hizala; --se-op'u görsel `object-position` olarak
          // okuyor. Geniş ekranlarda sonuç 50%/50% → kadraj hiç oynamaz.
          const { px, py } = solveObjectPosition(vw, H, n.w, n.h);
          frame.style.setProperty(
            "--se-op",
            `${(px * 100).toFixed(3)}% ${(py * 100).toFixed(3)}%`
          );
          // Fotoğrafın içindeki top: frame-yerel konum + ölçek (scroll'dan bağımsız).
          const bl = ballFrameLayout(vw, H, n.w, n.h, px, py);
          frame.style.setProperty("--se-ball-x", `${(bl.x - BALL_BOX / 2).toFixed(2)}px`);
          frame.style.setProperty("--se-ball-y", `${(bl.y - BALL_BOX / 2).toFixed(2)}px`);
          frame.style.setProperty(
            "--se-ball-k",
            (bl.d / BALL_PNG_FILL / BALL_BOX).toFixed(5)
          );
          setBallAnchorGeom({
            enabled: true,
            top: s.top,
            span: s.span,
            hold: s.hold,
            zoom,
            frameLeft: s.frameLeft,
            side: s.side,
            vw,
            vh: H,
            nw: n.w,
            nh: n.h,
            posX: px,
            posY: py,
          });
        } else {
          // Görsel henüz yüklenmedi; onLoad yeniden ölçüp yayınlayacak.
          clearBallAnchorGeom();
        }
      }
    };

    const apply = (scrollY: number) => {
      if (!s.enabled) return;

      const T = s.top - scrollY;
      const p = clamp((s.span - T) / s.span, 0, 1);
      const e = p * p * (3 - 2 * p);

      // Alt kenar: easing YOK — viewport tabanına yapışık kalmalı.
      const b = clamp(T, 0, s.span);
      const side = s.side * (1 - e);
      const rad = s.radius * (1 - e);
      const radb = rad * (1 - smoothstep(0, 0.06, p));
      const pin = clamp(-T, 0, s.hold);
      // Katman promosyonu yalnız hareket varken: dinlenmede ve bırakıldıktan
      // sonra tam ekran boyutunda bir compositor katmanını canlı tutmayalım.
      const live = p > 0.001 && T > -s.hold;
      // Clip alt kenarı: viewport tabanının en fazla BOTTOM_OVERSCAN altına
      // taşar. b/2 ile sınırlı çünkü görsel (translateY(−b/2) + scale ≥ 1)
      // viewport tabanının en az b/2 altına kadar uzanıyor — taşırılan bölge
      // her zaman görselle dolu.
      const bc = b - Math.min(BOTTOM_OVERSCAN, b / 2);
      // Fotoğraftaki top: kart tam ekrana yaklaşırken belirir, ayrışma anında
      // (T = −hold) BallJourney'in sabit topuna devreder.
      const ballO =
        ballAnchor && T > -s.hold ? smoothstep(BALL_FADE_IN0, BALL_FADE_IN1, p) : 0;

      const key =
        `${b.toFixed(1)}|${side.toFixed(1)}|${rad.toFixed(2)}|` +
        `${radb.toFixed(2)}|${pin.toFixed(1)}|${p.toFixed(3)}|${ballO.toFixed(3)}`;
      if (key === lastKey) return;
      lastKey = key;

      frame.style.setProperty("--se-b", `${bc}px`);
      frame.style.setProperty("--se-wb", `${b}px`);
      frame.style.setProperty("--se-x", `${side}px`);
      frame.style.setProperty("--se-rad", `${rad}px`);
      frame.style.setProperty("--se-radb", `${radb}px`);
      frame.style.setProperty("--se-pin", `${pin}px`);
      // Görseli görünen banda tam ortalar: band merkezi (H − b) / 2.
      frame.style.setProperty("--se-dy", `${-b / 2}px`);
      frame.style.setProperty(
        "--se-z",
        `${zoom - (zoom - 1) * e}`
      );
      frame.style.setProperty(
        "--se-rest-o",
        `${1 - smoothstep(0.04, 0.36, p)}`
      );
      frame.style.setProperty("--se-cap-o", `${smoothstep(0.72, 1, p)}`);
      frame.style.setProperty("--se-ball-o", ballO.toFixed(3));
      frame.style.willChange = live ? "clip-path, transform" : "";
    };

    const onResize = () => {
      measure();
      apply(window.scrollY);
    };
    measure();
    apply(window.scrollY);

    // Üstteki içerik (font/görsel yüklemesi) yer değiştirdiğinde yeniden ölç.
    // Yazdığı yükseklik yalnız innerHeight'a bağlı olduğundan tek geçişte
    // yakınsar; ResizeObserver döngüsü kurulmaz.
    const remeasure = () => {
      measure();
      apply(window.scrollY);
    };
    remeasureRef.current = remeasure;
    const ro = new ResizeObserver(() => {
      if (roTimer) return;
      roTimer = window.setTimeout(() => {
        roTimer = 0;
        remeasure();
      }, 120);
    });
    ro.observe(document.body);
    document.fonts?.ready.then(remeasure).catch(() => {});

    const unsubScroll = subscribeScroll(apply);
    // Yalnız gerçek boyut değişiminde (URL çubuğu animasyonunda değil).
    const unsubViewport = subscribeViewport(onResize);

    return () => {
      if (roTimer) clearTimeout(roTimer);
      ro.disconnect();
      unsubScroll();
      unsubViewport();
      remeasureRef.current = null;
      if (ballAnchor) clearBallAnchorGeom();
      clear();
    };
  }, [reduce, restHeight, holdRatio, zoom, ballAnchor]);

  const frameStyle: CSSProperties = {
    width: "var(--se-vw, 100%)",
    height: "var(--se-h, auto)",
    transform: "translate3d(-50%, var(--se-pin, 0px), 0)",
    clipPath:
      "inset(0px var(--se-x, 0px) var(--se-b, 0px) var(--se-x, 0px)" +
      " round var(--se-rad, var(--radius-2xl)) var(--se-rad, var(--radius-2xl))" +
      " var(--se-radb, var(--radius-2xl)) var(--se-radb, var(--radius-2xl)))",
  };

  return (
    <div ref={trackRef} className={`relative min-h-76 ${className}`.trim()}>
      <div
        ref={frameRef}
        className="absolute bottom-0 left-1/2 top-0"
        style={frameStyle}
      >
        <div
          className="absolute inset-0"
          style={{
            transform:
              "translate3d(0, var(--se-dy, 0px), 0) scale(var(--se-z, 1))",
          }}
        >
          <Image
            src={src}
            alt={alt}
            fill
            sizes="100vw"
            quality={imageQuality}
            /* --se-op yalnız ballAnchor açıkken yazılır; yoksa fallback 50%/50%
               ile davranış eskisiyle birebir aynı kalır. */
            className="object-cover [object-position:var(--se-op,50%_50%)]"
            onLoad={(e) => {
              const img = e.currentTarget;
              naturalRef.current = {
                w: img.naturalWidth,
                h: img.naturalHeight,
              };
              remeasureRef.current?.();
            }}
          />
        </div>

        {/* Clip dikdörtgeniyle birebir örtüşen katman: scrim + border + kart metni */}
        <div
          ref={winRef}
          className="absolute top-0 flex flex-col justify-end gap-3 border border-border/60 bg-linear-to-t from-background/78 via-background/30 to-transparent p-6 sm:p-7 dark:from-background/88 dark:via-background/45"
          style={{
            left: "var(--se-x, 0px)",
            right: "var(--se-x, 0px)",
            bottom: "var(--se-wb, 0px)",
            borderRadius: "var(--se-rad, var(--radius-2xl))",
            opacity: "var(--se-rest-o, 1)",
          }}
        >
          {icon}
          <h3 className="text-lg font-semibold tracking-tight text-foreground">
            {title}
          </h3>
          <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
            {desc}
          </p>
          {hint ? (
            <span
              aria-hidden="true"
              className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground/80"
            >
              <span className="size-1.5 rounded-full bg-led" />
              {hint}
            </span>
          ) : null}
        </div>

        {/* Tam ekran alt yazı — metnin tek erişilebilir kaynağı yukarıdaki katman */}
        {caption ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-end bg-linear-to-t from-black/65 via-black/15 to-transparent"
            style={{ opacity: "var(--se-cap-o, 0)" }}
          >
            <p className="mx-auto w-full max-w-7xl text-balance px-5 pb-14 font-display text-2xl font-semibold leading-tight tracking-tight text-floodlight [text-shadow:0_2px_20px_rgb(0_0_0/0.55)] sm:px-8 sm:pb-16 sm:text-4xl">
              {caption}
            </p>
          </div>
        ) : null}

        {/* Tutunma fazındaki top — görsel sarmalayıcısıyla birebir aynı
            transform; alt yazı katmanının ÜSTÜNDE (BallJourney'in sabit topu
            da onun üstünde, devirde parlaklık sıçraması olmasın). */}
        {ballAnchor ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              transform:
                "translate3d(0, var(--se-dy, 0px), 0) scale(var(--se-z, 1))",
              opacity: "var(--se-ball-o, 0)",
            }}
          >
            <Image
              src="/ball-768.png"
              alt=""
              width={BALL_BOX}
              height={BALL_BOX}
              unoptimized
              className="absolute block [filter:drop-shadow(0_18px_30px_rgb(0_0_0/0.45))]"
              style={{
                left: "var(--se-ball-x, 0px)",
                top: "var(--se-ball-y, 0px)",
                width: BALL_BOX,
                height: BALL_BOX,
                transform: "scale(var(--se-ball-k, 0))",
              }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
