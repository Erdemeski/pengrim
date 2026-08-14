"use client";

// React Bits "DriftWall"in yerel uyarlaması. Upstream'e göre sapmalar:
//  1) Maske tek eksenli: sağ/sol kenar maskesiz (pencereyi tam kaplar), üst
//     çizgisiz gradyan giriş, alt sert kesim. Upstream radial+intersect maskesi
//     dört kenarı birden soldururdu.
//  2) `paused` prop — lightbox açıkken duvar donar, aksi halde kapanış
//     animasyonu karonun kaymış konumuna denk gelmez.
//  3) `onItemSelect` + tıklama/klavye — upstream karolarda yalnızca href vardı.
//  4) Karolar `next/image` ile render edilir (ham <img> yerine); kaynak
//     görseller optimize edilmemiş MB'larca bitmap.
//  5) Sütunlar round-robin yerine kaydırmalı dilim alır; 10 görsel + 7 sütunda
//     round-robin tek fotoğrafı dikey tekrar eden sütunlar üretiyordu.

import Image from "next/image";
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useReducedMotion } from "motion/react";

export interface DriftWallItem {
  image: string;
  /** Karonun erişilebilir adı (eylemi de anlatır). */
  title?: string;
  /** Görselin alt metni; verilmezse title'a düşer. */
  alt?: string;
  href?: string;
}

export interface DriftWallProps {
  items: DriftWallItem[];
  columns?: number;
  /** Sütun başına gösterilecek benzersiz karo sayısı (dikey tekrar periyodu). */
  itemsPerColumn?: number;
  tileWidth?: number;
  tileHeight?: number;
  gap?: number;
  radius?: number;
  tilt?: number;
  turn?: number;
  roll?: number;
  perspective?: number;
  depth?: number;
  speed?: number;
  direction?: "up" | "down";
  variance?: number;
  parallax?: number;
  pauseOnHover?: boolean;
  /** Dışarıdan tam durdurma (lightbox açıkken). */
  paused?: boolean;
  lift?: number;
  /** Üst gradyanın tam opaklığa ulaştığı yükseklik (CSS uzunluğu, ör. "38%"). */
  topFade?: string;
  /** Alt gradyanın başladığı yükseklik, alttan ölçülür (ör. "30%"). */
  bottomFade?: string;
  dim?: number;
  /** Dinlenme halindeki tint opaklığı (0–1). */
  tintOpacity?: number;
  grayscale?: boolean;
  overlayColor?: string;
  /** next/image `sizes` — karo genişliğine göre wrapper'dan gelir. */
  sizes?: string;
  onItemSelect?: (item: DriftWallItem, rect: DOMRect) => void;
  className?: string;
  style?: CSSProperties;
}

interface ColumnMeta {
  copyHeight: number;
  copies: number;
}

const cx = (...parts: (string | false | undefined)[]) =>
  parts.filter(Boolean).join(" ");

const columnFactor = (index: number, variance: number): number => {
  const pseudo = ((index * 0.6180339887 + 0.35) % 1) * 2 - 1;
  return 1 + variance * pseudo;
};

// Sınıf dizileri prop'lardan bağımsız — her render'da yeniden kurulmaları için
// bir sebep yok, modül düzeyine alındı.
const TILE_CLASS = cx(
  "group/tile relative block flex-none cursor-pointer outline-none",
  "w-full h-[calc(var(--dw-tile-h)+var(--dw-gap))] [transform-style:preserve-3d]",
);
const INNER_CLASS = cx(
  "pointer-events-none absolute inset-[calc(var(--dw-gap)/2)] block overflow-hidden bg-[#0b0b12]",
  "rounded-[var(--dw-radius)] opacity-[var(--dw-dim)] [transform:translateZ(0)]",
  "transition-[transform,opacity,box-shadow] duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
  "group-[.is-active]/tile:opacity-100 group-[.is-active]/tile:[transform:translateZ(var(--dw-lift))]",
  "group-[.is-active]/tile:shadow-[0_24px_60px_-18px_rgba(0,0,0,0.7)]",
  "group-focus-visible/tile:opacity-100 group-focus-visible/tile:[transform:translateZ(var(--dw-lift))]",
  "group-focus-visible/tile:shadow-[0_24px_60px_-18px_rgba(0,0,0,0.7),0_0_0_2px_var(--brand-led)]",
);
const IMG_CLASS = cx(
  "block h-full w-full select-none object-cover",
  "[filter:grayscale(var(--dw-gray))_saturate(0.92)]",
  "transition-[filter] duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
  "group-[.is-active]/tile:[filter:grayscale(0)_saturate(1.05)] group-focus-visible/tile:[filter:grayscale(0)_saturate(1.05)]",
);
const OVERLAY_CLASS = cx(
  "pointer-events-none absolute inset-0 bg-[var(--dw-overlay)] opacity-[var(--dw-tint)]",
  "transition-opacity duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
  "group-[.is-active]/tile:opacity-0 group-focus-visible/tile:opacity-0",
);

interface DriftTileProps {
  id: string;
  item: DriftWallItem;
  itemIndex: number;
  colIndex: number;
  isActive: boolean;
  sizes: string;
  interactive: boolean;
  onActivate: (id: string, colIndex: number) => void;
  onSoftRelease: () => void;
  onRelease: () => void;
  onKeySelect: (item: DriftWallItem, e: ReactKeyboardEvent<HTMLDivElement>) => void;
}

/**
 * Sapma (8): upstream karoları ana bileşen içinde satır içi üretiyordu; bu
 * yüzden tek bir `activeId` değişimi listedeki bütün karoları (ölçülen: 75)
 * yeniden render ediyordu. Hover salınımıyla birleşince saniyede binlerce
 * bileşen render'ı oluşup kare hızını çökertiyordu. Karo memo'lu bir alt
 * bileşene alındı: artık yalnızca aktifliği değişen karolar render edilir.
 * Üretilen DOM ve CSS birebir aynıdır.
 */
const DriftTile = memo(function DriftTile({
  id,
  item,
  itemIndex,
  colIndex,
  isActive,
  sizes,
  interactive,
  onActivate,
  onSoftRelease,
  onRelease,
  onKeySelect,
}: DriftTileProps) {
  const inner = (
    <span className={INNER_CLASS}>
      {/* eager: karolar 3B dönüştürülmüş bir düzlemin içinde olduğu için
          tarayıcının lazy-load kesişim testi geç/hiç tetiklenmiyor ve
          fotoğraflar duvar kayarken tek tek beliriyordu. Benzersiz URL
          sayısı görsel sayısı kadar (w≈384, ~15 KB), tekrarlar önbellekten. */}
      <Image
        src={item.image}
        alt={item.alt ?? item.title ?? ""}
        fill
        sizes={sizes}
        quality={75}
        loading="eager"
        draggable={false}
        className={IMG_CLASS}
      />
      <span className={OVERLAY_CLASS} aria-hidden="true" />
    </span>
  );

  const commonProps = {
    className: cx(TILE_CLASS, isActive && "is-active"),
    "data-tile-id": id,
    "data-col": colIndex,
    // Basış konteynerde ele alınıyor; hangi görsel olduğu buradan okunuyor.
    "data-item-idx": itemIndex,
    onFocus: () => onActivate(id, colIndex),
    onBlur: onRelease,
    onPointerEnter: () => onActivate(id, colIndex),
    // Görsel aktiflik histerezisli bırakılır; sütun kilidi burada bırakılmaz.
    onPointerLeave: onSoftRelease,
  };

  if (item.href) {
    return (
      <a href={item.href} target="_blank" rel="noreferrer noopener" {...commonProps}>
        {inner}
      </a>
    );
  }

  return (
    <div
      tabIndex={0}
      role="button"
      aria-label={item.title ?? "tile"}
      onKeyDown={
        interactive
          ? (e: ReactKeyboardEvent<HTMLDivElement>) => onKeySelect(item, e)
          : undefined
      }
      {...commonProps}
    >
      {inner}
    </div>
  );
});

const DriftWall = ({
  items,
  columns = 5,
  itemsPerColumn = 5,
  tileWidth = 200,
  tileHeight = 113,
  gap = 18,
  radius = 14,
  tilt = 16,
  turn = -14,
  roll = 0,
  perspective = 1200,
  depth = 120,
  speed = 42,
  direction = "up",
  variance = 0.45,
  parallax = 0.6,
  pauseOnHover = false,
  paused = false,
  lift = 64,
  topFade = "38%",
  bottomFade = "30%",
  dim = 0.55,
  tintOpacity = 0.42,
  grayscale = false,
  overlayColor = "#060010",
  sizes = "300px",
  onItemSelect,
  className = "",
  style,
}: DriftWallProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const planeRef = useRef<HTMLDivElement>(null);
  const trackRefs = useRef<(HTMLDivElement | null)[]>([]);
  const rafRef = useRef<number | null>(null);

  const offsetsRef = useRef<number[]>([]);
  const velocitiesRef = useRef<number[]>([]);
  const hoveredColRef = useRef<number>(-1);
  const wallHoveredRef = useRef<boolean>(false);
  const pointerRef = useRef({ x: 0, y: 0 });
  const pointerDampedRef = useRef({ x: 0, y: 0 });
  const lastTsRef = useRef<number | null>(null);
  const pausedRef = useRef(paused);
  const releaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [containerHeight, setContainerHeight] = useState(600);
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeIdRef = useRef<string | null>(null);

  // Upstream kendi matchMedia aboneliğini kuruyordu; proje zaten motion'a
  // bağımlı olduğu için onun hook'u kullanılıyor.
  const reduced = useReducedMotion() ?? false;

  // Dış durdurma bayrağını RAF döngüsüne ref üzerinden geçir — prop'u
  // bağımlılığa koymak döngüyü yeniden kurup dt'yi sıfırlardı.
  useEffect(() => {
    pausedRef.current = paused;
    if (!paused) return;
    pointerRef.current = { x: 0, y: 0 };
    hoveredColRef.current = -1;
    activeIdRef.current = null;
    if (releaseTimerRef.current !== null) {
      clearTimeout(releaseTimerRef.current);
      releaseTimerRef.current = null;
    }
  }, [paused]);

  // Durdurulmuşken hiçbir karo "aktif" görünmemeli; state'i efektte
  // temizlemek yerine render'da türetiliyor.
  const currentActiveId = paused ? null : activeId;

  // Sapma (5): her sütun listeden kaydırmalı bir dilim alır. Round-robin,
  // sütun sayısı görsel sayısına yaklaştığında tek fotoğrafı dikey tekrar eden
  // sütunlar üretiyordu.
  const columnItems = useMemo<DriftWallItem[][]>(() => {
    if (!items.length) return [];
    const perCol = Math.max(1, Math.min(itemsPerColumn, items.length));
    // items.length ile aralarında asal olmayan bir adım sütunları birbirinin
    // kopyası yapardı; 3 ve 1 kombinasyonu pratikte yeterince ayrıştırıyor.
    const stride = items.length % 3 === 0 ? 1 : 3;
    return Array.from({ length: columns }, (_, c) =>
      Array.from(
        { length: perCol },
        (_, k) => items[(c * stride + k) % items.length],
      ),
    );
  }, [items, columns, itemsPerColumn]);

  // Sapma (9): upstream `copies = max(2, ceil(h*1.6/copyHeight)+1)` kullanıyordu
  // ve bu geometrik olarak yanlış. Düzlem translate(-50%,-50%) ile ortalandığı
  // için görünür bant izin ORTASINDA; ofset [0, copyHeight) aralığında yukarı
  // kaydıkça altta içerik biter. Kapsama koşulu:
  //     H - copyHeight >= H/2 + V/2   ⇒   copies >= 2 + V/copyHeight
  // (H = copies*copyHeight, V = düzlem-yerel görünür yükseklik). Upstream
  // formülü bazı yükseklik/viewport bileşimlerinde 2 üretip duvarda delik
  // açıyordu — daha önce şikâyet edilen "bazı fotoğraflar gözükmüyor" sorunu.
  const columnMeta = useMemo<ColumnMeta[]>(() => {
    const unit = tileHeight + gap;
    return columnItems.map((col) => {
      const copyHeight = Math.max(unit, col.length * unit);
      const copies = Math.max(
        3,
        Math.ceil(containerHeight / copyHeight) + 2,
      );
      return { copyHeight, copies };
    });
  }, [columnItems, tileHeight, gap, containerHeight]);

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      setContainerHeight(entry.contentRect.height || 600);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Sapma (10): upstream RAF döngüsünü mount'ta başlatıp hiç durdurmuyordu.
  // Duvar dinamik olarak sayfanın altında olduğu için kullanıcı hero'dayken
  // bile her karede düzlem + sütun transformları yazılıyor ve 3B sahne (maske
  // altında, karo başına ayrı render yüzeyiyle) yeniden kompozit ediliyordu —
  // yani duvarın maliyeti sayfanın tamamı boyunca ödeniyordu. Artık yalnızca
  // görünür alana yaklaştığında çalışıyor.
  const [onScreen, setOnScreen] = useState(false);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setOnScreen(entry.isIntersecting),
      { rootMargin: "200px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const baseVelocities = useMemo<number[]>(() => {
    const dirSign = direction === "up" ? 1 : -1;
    return columnItems.map((_, c) => {
      const altSign = c % 2 === 0 ? 1 : -1;
      return speed * columnFactor(c, variance) * dirSign * altSign;
    });
  }, [columnItems, speed, direction, variance]);

  // Boyamadan önce: başlangıç ofsetleri hem hesaplanır hem DOM'a yazılır.
  // Upstream yalnızca ref'i dolduruyordu; ilk transform RAF'ta geldiği için
  // sütunlar bir kare kaymamış görünüyordu.
  useLayoutEffect(() => {
    offsetsRef.current = columnMeta.map(
      (meta, c) => meta.copyHeight * ((c * 0.37) % 1),
    );
    velocitiesRef.current = columnItems.map(() => 0);
    trackRefs.current.forEach((el, c) => {
      if (el) el.style.transform = `translate3d(0, ${-(offsetsRef.current[c] ?? 0)}px, 0)`;
    });
  }, [columnMeta, columnItems]);

  const applyPlaneTransform = useCallback(
    (px: number, py: number) => {
      const plane = planeRef.current;
      if (!plane) return;
      plane.style.transform =
        `translate(-50%, -50%) scale(1.18) ` +
        `rotateX(${tilt + py}deg) rotateY(${turn + px}deg) rotateZ(${roll}deg) ` +
        `translateZ(${-depth}px)`;
    },
    [tilt, turn, roll, depth],
  );

  // Dinlenme transformunu ilk boyamadan önce uygula: aksi halde düzlem, ilk
  // RAF karesine kadar translate(-50%,-50%) olmadan konumlanıp göze çarpan bir
  // sıçrama yapıyordu.
  useLayoutEffect(() => {
    applyPlaneTransform(pointerDampedRef.current.x, pointerDampedRef.current.y);
  }, [applyPlaneTransform]);

  useEffect(() => {
    if (!onScreen) return;
    const animate = (ts: number) => {
      if (lastTsRef.current === null) lastTsRef.current = ts;
      const dt = Math.min(0.05, Math.max(0, ts - lastTsRef.current) / 1000);
      lastTsRef.current = ts;

      const maxTilt = parallax * 8;
      const targetX = pointerRef.current.x * maxTilt;
      const targetY = -pointerRef.current.y * maxTilt;
      const damp = 1 - Math.exp(-dt / 0.12);
      pointerDampedRef.current.x += (targetX - pointerDampedRef.current.x) * damp;
      pointerDampedRef.current.y += (targetY - pointerDampedRef.current.y) * damp;
      applyPlaneTransform(pointerDampedRef.current.x, pointerDampedRef.current.y);

      if (!reduced) {
        for (let c = 0; c < trackRefs.current.length; c++) {
          const meta = columnMeta[c];
          if (!meta) continue;
          const stopped =
            pausedRef.current || (wallHoveredRef.current && pauseOnHover);
          const factor = stopped || hoveredColRef.current === c ? 0 : 1;
          const target = (baseVelocities[c] ?? 0) * factor;

          const ease = 1 - Math.exp(-dt / (target === 0 ? 0.16 : 0.28));
          velocitiesRef.current[c] += (target - velocitiesRef.current[c]) * ease;
          let next = (offsetsRef.current[c] ?? 0) + velocitiesRef.current[c] * dt;
          next = ((next % meta.copyHeight) + meta.copyHeight) % meta.copyHeight;
          offsetsRef.current[c] = next;

          const el = trackRefs.current[c];
          if (el) el.style.transform = `translate3d(0, ${-next}px, 0)`;
        }
      } else {
        for (let c = 0; c < trackRefs.current.length; c++) {
          const el = trackRefs.current[c];
          const meta = columnMeta[c];
          if (el && meta)
            el.style.transform = `translate3d(0, ${-(offsetsRef.current[c] ?? 0)}px, 0)`;
        }
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastTsRef.current = null;
    };
  }, [
    onScreen,
    baseVelocities,
    columnMeta,
    pauseOnHover,
    parallax,
    reduced,
    applyPlaneTransform,
  ]);

  // Sapma (7): upstream'de karo `pointerleave`'i sütun kilidini de bırakıyordu.
  // Bu kapalı bir geri besleme döngüsü yaratıyordu: sütun duruşa geçerken hâlâ
  // hareketli olduğu için karo sınırı imlecin altından kayıyor → pointerleave →
  // sütun yeniden hızlanıyor → pointerenter → tekrar yavaşlıyor... Sütun
  // hızlan/yavaşla arasında salınıp kaldırma efektini titretiyor ve pointerdown
  // anında hedefi kaçırıyordu.
  //
  // Artık iki kavram ayrı:
  //   • hoveredColRef (hareket kilidi) yalnızca BAŞKA bir sütuna geçilince ya
  //     da imleç duvarı terk edince değişir. Bir kez duran sütun, imleç
  //     duvardayken kendiliğinden hızlanamaz → döngü imkânsız.
  //   • activeId (görsel kaldırma) histerezisli: temizlik ~120 ms ertelenir,
  //     araya giren herhangi bir pointerenter iptal eder.
  const cancelPendingRelease = useCallback(() => {
    if (releaseTimerRef.current === null) return;
    clearTimeout(releaseTimerRef.current);
    releaseTimerRef.current = null;
  }, []);

  const activate = useCallback(
    (id: string, index: number): void => {
      cancelPendingRelease();
      activeIdRef.current = id;
      hoveredColRef.current = index;
      setActiveId(id);
    },
    [cancelPendingRelease],
  );

  /** Yalnızca görsel aktifliği bırakır; sütun kilidi durur. */
  const softRelease = useCallback(() => {
    cancelPendingRelease();
    releaseTimerRef.current = setTimeout(() => {
      releaseTimerRef.current = null;
      activeIdRef.current = null;
      setActiveId(null);
    }, 120);
  }, [cancelPendingRelease]);

  /** Hem görsel aktifliği hem sütun kilidini anında bırakır. */
  const release = useCallback((): void => {
    cancelPendingRelease();
    activeIdRef.current = null;
    hoveredColRef.current = -1;
    setActiveId(null);
  }, [cancelPendingRelease]);

  useEffect(() => cancelPendingRelease, [cancelPendingRelease]);

  // Sapma (6): upstream burada her pointermove'da document.elementFromPoint
  // çağırıyordu. preserve-3d + will-change'li kompozit katmanlarda bu isabet
  // testi güvenilir değil (aynı noktada bazen karo, bazen iz/düzlem dönüyor);
  // hover algılanamayınca sütun durmuyor, karo parmağın altından kayıyor ve
  // tıklama düşüyordu. Hover artık karoların kendi pointerenter'ıyla
  // yakalanıyor; bu handler yalnızca parallax hesaplıyor.
  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (pausedRef.current || parallax <= 0 || reduced) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      pointerRef.current = {
        x: (e.clientX - rect.left) / rect.width - 0.5,
        y: (e.clientY - rect.top) / rect.height - 0.5,
      };
    },
    [parallax, reduced],
  );

  const handlePointerLeaveWall = useCallback((): void => {
    wallHoveredRef.current = false;
    pointerRef.current = { x: 0, y: 0 };
    release();
  }, [release]);

  // Sapma (3): karonun ekrandaki kutusunu ölçüp yukarı bildir. Ölçüm iç
  // <span> üzerinden alınır — dış karo `gap` payını da kapsıyor.
  const tileRect = (tileEl: HTMLElement): DOMRect =>
    ((tileEl.firstElementChild as HTMLElement | null) ?? tileEl).getBoundingClientRect();

  // ——— Basış hattı ———
  // Sapma (11): basış artık karolarda değil, KONTEYNERDE ele alınıyor.
  //
  // İki ayrı sorunu birden kapatıyor:
  //  1) preserve-3d + will-change katmanlarının içinde tarayıcının isabet testi
  //     kararsız — aynı (x,y) noktasında bazen karo, bazen iz/düzlem dönüyor.
  //     İsabet karoyu ıskaladığında karonun pointerdown'ı hiç tetiklenmiyor,
  //     kullanıcı "bazen algılamıyor" diyordu. Konteyner düz 2B bir eleman;
  //     onun isabeti güvenilir. Hangi karoya basıldığı koordinattan çözülüyor.
  //  2) Dokunmatikte tarayıcı en ufak harekette kaydırma niyeti varsayıp
  //     pointercancel gönderiyor ve basış siliniyordu. Artık kayıt hemen
  //     silinmiyor; kısa bir süre "iptal edilmiş" tutuluyor ki hemen ardından
  //     gelen `click` onu kurtarabilsin.
  const pressRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
    at: number;
    item: DriftWallItem;
    rect: DOMRect;
    cancelledAt: number | null;
  } | null>(null);
  const lastSelectAtRef = useRef(0);

  /** Ekran noktasından karoyu çözer. */
  const resolveTileAt = useCallback(
    (x: number, y: number): HTMLElement | null => {
      const root = containerRef.current;
      if (!root) return null;
      // Konteynerin dışı elenmeli: düzlem duvardan çok daha geniş ve
      // `overflow: hidden` ile kırpılıyor, ama karoların getBoundingClientRect
      // değerleri kırpılmıyor. Bu kontrol olmadan geometrik yedek yol, banttan
      // taşmış (görünmeyen) bir karoyu eşleştirip duvarın dışına yapılan
      // tıklamada önizleme açıyordu.
      const bounds = root.getBoundingClientRect();
      if (x < bounds.left || x > bounds.right) return null;
      if (y < bounds.top || y > bounds.bottom) return null;
      // 1) Tarayıcının isabet yığını — en üstteki değil, yığının tamamı.
      const stack = document.elementsFromPoint(x, y);
      for (const el of stack) {
        const tile = (el as HTMLElement).closest?.(
          "[data-tile-id]",
        ) as HTMLElement | null;
        if (tile && root.contains(tile)) return tile;
      }
      // 2) Saf geometri — 3B isabet testinden tamamen bağımsız yedek yol.
      //    Kapsayan karolar arasından merkezi en yakın olan seçilir.
      let best: HTMLElement | null = null;
      let bestDist = Infinity;
      for (const el of root.querySelectorAll<HTMLElement>("[data-tile-id]")) {
        const r = el.getBoundingClientRect();
        if (x < r.left || x > r.right || y < r.top || y > r.bottom) continue;
        const d = Math.hypot(
          x - (r.left + r.width / 2),
          y - (r.top + r.height / 2),
        );
        if (d < bestDist) {
          bestDist = d;
          best = el;
        }
      }
      return best;
    },
    [],
  );

  /** Karo elemanından hangi görsel olduğunu bulur (data-item-idx üzerinden). */
  const itemForTile = useCallback(
    (tile: HTMLElement): DriftWallItem | null => {
      const idx = Number(tile.dataset.itemIdx);
      return Number.isInteger(idx) ? (items[idx] ?? null) : null;
    },
    [items],
  );

  const commitSelect = useCallback(
    (item: DriftWallItem, rect: DOMRect) => {
      const now = performance.now();
      // Aynı basış hem pointer hem click yolundan gelirse iki kez açılmasın.
      if (now - lastSelectAtRef.current < 500) return;
      lastSelectAtRef.current = now;
      onItemSelect?.(item, rect);
    },
    [onItemSelect],
  );

  const handleWallPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!onItemSelect) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      const tile = resolveTileAt(e.clientX, e.clientY);
      const item = tile ? itemForTile(tile) : null;
      if (!tile || !item) {
        pressRef.current = null;
        return;
      }
      // Yakalama konteynerde: karo kayarken bile pointerup buraya gelir.
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // desteklenmiyorsa eşik + click yedeği yine çalışır
      }
      pressRef.current = {
        pointerId: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        at: performance.now(),
        item,
        rect: tileRect(tile),
        cancelledAt: null,
      };
    },
    [onItemSelect, resolveTileAt, itemForTile],
  );

  const handleWallPointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const press = pressRef.current;
      const el = e.currentTarget;
      if (el.hasPointerCapture?.(e.pointerId)) el.releasePointerCapture(e.pointerId);
      if (!press || press.pointerId !== e.pointerId) return;
      pressRef.current = null;
      if (press.cancelledAt !== null) return;
      // Parmak, farenin aksine temiz bir dokunuşta bile birkaç piksel oynar.
      const slop = e.pointerType === "mouse" ? 10 : 16;
      const moved = Math.hypot(e.clientX - press.x, e.clientY - press.y);
      if (moved > slop) return;
      if (performance.now() - press.at > 800) return;
      commitSelect(press.item, press.rect);
    },
    [commitSelect],
  );

  const handleWallPointerCancel = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const press = pressRef.current;
      if (!press || press.pointerId !== e.pointerId) return;
      // Silme: ardından gelebilecek `click` bu kaydı kullanacak.
      press.cancelledAt = performance.now();
    },
    [],
  );

  /**
   * Yedek yol. Tarayıcının kendi dokunma sezgisi bizimkinden toleranslı ve
   * pointercancel'dan sonra bile `click` üretebiliyor. Karo kaydığı için
   * tarayıcının `click` hedefi iz/düzlem oluyor — bu yüzden hedefe değil,
   * koordinata bakıyoruz.
   */
  const handleWallClick = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      if (!onItemSelect) return;
      if (performance.now() - lastSelectAtRef.current < 400) return;
      const press = pressRef.current;
      pressRef.current = null;
      if (press && press.cancelledAt !== null) {
        const moved = Math.hypot(e.clientX - press.x, e.clientY - press.y);
        if (moved <= 16) {
          commitSelect(press.item, press.rect);
          return;
        }
      }
      const tile = resolveTileAt(e.clientX, e.clientY);
      const item = tile ? itemForTile(tile) : null;
      if (tile && item) commitSelect(item, tileRect(tile));
    },
    [onItemSelect, resolveTileAt, itemForTile, commitSelect],
  );

  const handleTileKeySelect = useCallback(
    (item: DriftWallItem, e: ReactKeyboardEvent<HTMLDivElement>) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      onItemSelect?.(item, tileRect(e.currentTarget));
    },
    [onItemSelect],
  );

  // Sapma (1): tek eksenli maske. Üst ve alt kenar gradyanla açılıp kapanır
  // (çizgisiz), sağ/sol maskelenmez — pencere kenarına dayanır.
  const maskStyle = useMemo(
    () =>
      "linear-gradient(to bottom," +
      " transparent 0%, rgba(0,0,0,0.28) 10%," +
      " #000 var(--dw-top-fade)," +
      " #000 calc(100% - var(--dw-bottom-fade)), rgba(0,0,0,0.28) 92%," +
      " transparent 100%)",
    [],
  );

  const cssVars = useMemo<CSSProperties>(
    () =>
      ({
        "--dw-tile-w": `${tileWidth}px`,
        "--dw-tile-h": `${tileHeight}px`,
        "--dw-gap": `${gap}px`,
        "--dw-radius": `${radius}px`,
        "--dw-lift": `${lift}px`,
        "--dw-dim": dim,
        "--dw-gray": grayscale ? 1 : 0,
        "--dw-overlay": overlayColor,
        "--dw-tint": tintOpacity,
        "--dw-top-fade": topFade,
        "--dw-bottom-fade": bottomFade,
        perspective: `${perspective}px`,
        perspectiveOrigin: "50% 50%",
        WebkitMaskImage: maskStyle,
        maskImage: maskStyle,
        ...style,
      }) as CSSProperties,
    [
      tileWidth,
      tileHeight,
      gap,
      radius,
      lift,
      dim,
      grayscale,
      overlayColor,
      tintOpacity,
      topFade,
      bottomFade,
      perspective,
      maskStyle,
      style,
    ],
  );

  return (
    <div
      ref={containerRef}
      // touch-action: manipulation → çift dokunuş-yakınlaştırma gecikmesini ve
      // ona bağlı dokunuş kaybını kaldırır, sayfa kaydırmasını engellemez.
      className={cx(
        "relative h-full w-full touch-manipulation overflow-hidden",
        className,
      )}
      style={cssVars}
      onPointerMove={handlePointerMove}
      onPointerEnter={() => {
        wallHoveredRef.current = true;
      }}
      onPointerLeave={handlePointerLeaveWall}
      onPointerDown={handleWallPointerDown}
      onPointerUp={handleWallPointerUp}
      onPointerCancel={handleWallPointerCancel}
      onClick={handleWallClick}
      role="group"
      aria-label="Drifting wall of tiles"
    >
      <div
        ref={planeRef}
        className="absolute left-1/2 top-1/2 flex cursor-pointer flex-row [transform-style:preserve-3d] [transform-origin:50%_50%] will-change-transform"
      >
        {columnItems.map((col, c) => {
          const meta = columnMeta[c];
          if (!meta) return null;
          const copies = Array.from({ length: meta.copies });
          return (
            <div
              className="relative w-[calc(var(--dw-tile-w)+var(--dw-gap))] [transform-style:preserve-3d]"
              key={`col-${c}`}
            >
              <div
                className="flex flex-col [transform-style:preserve-3d] will-change-transform"
                ref={(el) => {
                  trackRefs.current[c] = el;
                }}
              >
                {copies.map((_, copyIndex) =>
                  col.map((item, slot) => {
                    const id = `${c}-${copyIndex}-${slot}`;
                    return (
                      <DriftTile
                        key={id}
                        id={id}
                        item={item}
                        itemIndex={items.indexOf(item)}
                        colIndex={c}
                        isActive={currentActiveId === id}
                        sizes={sizes}
                        interactive={Boolean(onItemSelect)}
                        onActivate={activate}
                        onSoftRelease={softRelease}
                        onRelease={release}
                        onKeySelect={handleTileKeySelect}
                      />
                    );
                  }),
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DriftWall;
