"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties, ReactNode } from "react";
import Image from "next/image";
import { useReducedMotion } from "motion/react";
import {
  clearBallAnchorGeom,
  setBallAnchorGeom,
  solveObjectPosition,
} from "@/lib/ball-anchor";

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
 * Ölçüm yapılmadan (SSR / JS kapalı) ve prefers-reduced-motion'da CSS değişkenlerinin
 * fallback değerleri statik kartı üretir — hidrasyon uyuşmazlığı ya da boş blok yok.
 */

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
    let lastW = 0;
    let lastH = 0;
    let raf = 0;
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
    ];
    const clear = () => {
      track.style.height = "";
      for (const v of VARS) frame.style.removeProperty(v);
      frame.style.willChange = "";
      lastKey = "";
    };

    const measure = () => {
      const vw = document.documentElement.clientWidth;
      const H = window.innerHeight;

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

    const apply = () => {
      if (!s.enabled) return;

      const T = s.top - window.scrollY;
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
      const live = p > 0.001 && pin < s.hold;

      const key =
        `${b.toFixed(1)}|${side.toFixed(1)}|${rad.toFixed(2)}|` +
        `${radb.toFixed(2)}|${pin.toFixed(1)}|${p.toFixed(3)}`;
      if (key === lastKey) return;
      lastKey = key;

      frame.style.setProperty("--se-b", `${b}px`);
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
      frame.style.willChange = live ? "clip-path, transform" : "";
    };

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        apply();
      });
    };

    const onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      // Mobil URL çubuğu açılıp kapanırken yeniden ölçme — scroll sıçrar.
      if (w === lastW && Math.abs(h - lastH) <= 120) return;
      lastW = w;
      lastH = h;
      measure();
      apply();
    };

    lastW = window.innerWidth;
    lastH = window.innerHeight;
    measure();
    apply();

    // Üstteki içerik (font/görsel yüklemesi) yer değiştirdiğinde yeniden ölç.
    // Yazdığı yükseklik yalnız innerHeight'a bağlı olduğundan tek geçişte
    // yakınsar; ResizeObserver döngüsü kurulmaz.
    const remeasure = () => {
      measure();
      apply();
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

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      if (roTimer) clearTimeout(roTimer);
      ro.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
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
            bottom: "var(--se-b, 0px)",
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
      </div>
    </div>
  );
}
