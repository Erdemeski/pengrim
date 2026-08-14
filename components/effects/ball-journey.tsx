"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { useReducedMotion } from "motion/react";
import { SECTION_IDS } from "@/lib/constants";
import {
  BALL_PNG_FILL,
  clamp,
  computeBallAnchor,
  getBallAnchorGeom,
  offsetTopOf,
  smoothstep,
  smootherstep,
  subscribeBallAnchorGeom,
  type BallAnchorGeom,
} from "@/lib/ball-anchor";

/**
 * Envanter fotoğrafındaki futbol topunun, tam ekran fazının sonunda görselden
 * "kopup" iş akışı kartlarının **arkasında** dolaşan bağımsız bir nesneye
 * dönüşmesi. Üç faz var, üçü de `window.scrollY`'nin **saf fonksiyonu**:
 *
 *   Tutunma  scrollY < detachY   → top fotoğraftaki topun üstünde durur;
 *                                  kart tam ekrana yaklaşırken yumuşakça belirir
 *   Yolculuk 0 ≤ q ≤ 1           → sağ → (kartların arkasından) sol → (arkadan) sağ
 *   Park     q ≥ 1               → bölümün ALT SINIRINA sıfırlanır, sonra
 *                                  bölümle birlikte yukarı kayıp çıkar
 *
 * Hiçbir yerde "tetiklendi mi" state'i tutulmadığı için **scroll up otomatik
 * olarak tersini oynar**; ayrıca Lenis momentumu, sekme dönüşü veya
 * ScrollTrigger.refresh() konumu bozamaz.
 *
 * Katman düzeni (kritik): bileşen `<Section id="is-akisi">`in ilk çocuğu olarak
 * mount edilir ve `position: fixed` + `z-0` taşır.
 *   • Section arka planı bir ATA olduğundan topun altında kalır.
 *   • ScrollStack alt ağacı sonraki kardeş + `z-10` → top kartların ARKASINDA.
 *   • Envanter bölümü önceki kardeş → top tam ekran fotoğrafın ÜSTÜNDE.
 *   • SiteHeader `fixed z-50` → her zaman topun üstünde.
 * ScrollStack'in `transform: translateZ(0)` taşıyan sarmalayıcısı ata değil
 * kardeş olduğu için `fixed`in containing block'u viewport olarak kalır.
 */

/** Host kutusunun sabit CSS boyutu; gerçek çap `scale()` ile verilir (layout yok). */
const BOX = 320;

/** Topun ekran kenarına bırakacağı en küçük pay. */
const EDGE_PAD = 10;

/** Park yüksekliği (viewport oranı) — bölüm dibi gelene kadar burada asılı kalır. */
const PARK_Y = 0.72;

/** Yumuşak belirme penceresi — kartın açılma ilerlemesi (p) üzerinden. */
const FADE_IN0 = 0.72;
const FADE_IN1 = 0.94;

/**
 * Yeşile geçiş penceresi — yolculuk ilerlemesi (q) üzerinden. Top fotoğraftan
 * koptuğu (yani iş akışı bölümüne geçtiği) anda başlar, kartların sağında
 * yükselirken tamamlanır: kartların arkasından sola geçmeden önce top tümüyle
 * yeşildir. `q`'nun saf fonksiyonu olduğu için tersine scroll'da beyaza döner.
 */
const GREEN0 = 0;
const GREEN1 = 0.15;

/** Yolculuk boyunca uzaklaşma hissi: bitişte çap oranı + orta noktadaki çukur. */
const DEPTH = 0.82;
const DEPTH_DIP = 0.05;

/** Yol örnekleme çözünürlüğü (dönme tablosu için). */
const ROLL_SAMPLES = 96;

/**
 * Kart bandı: `how-it-works.tsx`'te ScrollStack `stackPosition="18%"` ile
 * pinleniyor ve kartlar `h-80` (320px), `baseScale` ile ~%90'a iniyor.
 * Sağ↔sol geçişleri bu bandın İÇİNDE olmak zorunda, yoksa top kartların
 * arkasından değil altından geçer.
 */
const BAND_TOP = 0.18;
const BAND_SCALE = 0.9;
const CARD_H_FALLBACK = 320;

/**
 * Yörünge. `sx` = yanal işaretli genlik (−1 sol uç, +1 sağ uç),
 * `by` = kart bandı içindeki oran (0 üst, 1 alt). İlk nokta ayrışma anındaki
 * gerçek konumdan gelir; ikinci nokta bilerek onunla aynı yükseklikte:
 * fotoğraf yukarı kaçarken top aşağıda kalır, "koptu" hissi buradan doğar.
 *
 * Toplam iki geçiş var: sağ → sol → sağ. Geçişler bandın içinde, sol taraftaki
 * salınım ise kartların dışında (görünür) gerçekleşir.
 */
const WAYPOINTS: ReadonlyArray<{ sx: number; by?: number; detachY?: true }> = [
  { sx: 0.88, detachY: true }, // sağda kalır — fotoğraftan ayrışma
  { sx: 0.98, by: 0.88 }, // kartların SAĞINDA yükselir (görünür)
  { sx: -0.98, by: 0.6 }, // kartların ARKASINDAN sola geçiş
  { sx: -0.74, by: 0.3 }, // solda hafif salınım (görünür)
  { sx: -1.0, by: 0.04 },
  { sx: 0.98, by: 0.42 }, // kartların ARKASINDAN sağa geçiş
];

/** Park noktası — sağ tarafta, bölüm dibinde. */
const PARK_SX = 0.86;

type Pt = { x: number; y: number };

/** Catmull-Rom: waypoint'lerden GEÇEN, C1 sürekli eğri → yumuşak geçişler. */
const catmull = (
  a: number,
  b: number,
  c: number,
  d: number,
  t: number
): number => {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * b +
      (-a + c) * t +
      (2 * a - 5 * b + 4 * c - d) * t2 +
      (-a + 3 * b - 3 * c + d) * t3)
  );
};

const samplePath = (pts: Pt[], t: number): Pt => {
  const n = pts.length - 1;
  const u = clamp(t, 0, 1) * n;
  const i = Math.min(Math.floor(u), n - 1);
  const f = u - i;
  const p0 = pts[Math.max(0, i - 1)];
  const p1 = pts[i];
  const p2 = pts[i + 1];
  const p3 = pts[Math.min(n, i + 2)];
  return {
    x: catmull(p0.x, p1.x, p2.x, p3.x, f),
    y: catmull(p0.y, p1.y, p2.y, p3.y, f),
  };
};

/** Yolculuk boyunca çap zarfı: uzaklaşma + ortada hafif çukur. */
const diameterAt = (d0: number, s: number): number =>
  d0 * (1 + (DEPTH - 1) * s - DEPTH_DIP * Math.sin(Math.PI * s));

/**
 * İşaretli yatay yol uzunluğundan kümülatif dönme tablosu: top gittiği yöne
 * doğru **fiziksel olarak** yuvarlanır (s mesafe → s / (π·d) tur). Tablo
 * (vw, vh)'nin saf fonksiyonu olduğundan tersine scroll'da birebir geri sarar.
 */
const buildRollTable = (pts: Pt[], d0: number): number[] => {
  const table = new Array<number>(ROLL_SAMPLES + 1);
  table[0] = 0;
  let prev = samplePath(pts, 0);
  let rot = 0;
  for (let i = 1; i <= ROLL_SAMPLES; i++) {
    const s = i / ROLL_SAMPLES;
    const p = samplePath(pts, s);
    const d = Math.max(1, diameterAt(d0, s));
    rot += ((p.x - prev.x) * 360) / (Math.PI * d);
    table[i] = rot;
    prev = p;
  }
  return table;
};

const sampleRoll = (table: number[], s: number): number => {
  const u = clamp(s, 0, 1) * ROLL_SAMPLES;
  const i = Math.min(Math.floor(u), ROLL_SAMPLES - 1);
  return table[i] + (table[i + 1] - table[i]) * (u - i);
};

/** Genlik çözümünde eğrinin uç değerlerini kaçırmamak için sık örnekleme. */
const FIT_SAMPLES = 400;

/**
 * Catmull-Rom waypoint'leri AŞAR, dolayısıyla yalnız waypoint konumlarına bakan
 * bir sınır topu ekran dışına taşırıyordu. Eğrinin x'i genliğe göre AFFINE
 * olduğundan (baz fonksiyonlar 1'e toplanır) amp=0 ve amp=1 için iki örnekleme
 * yeterli: aradan, top hiçbir noktada ekrandan taşmayacak en büyük genliği
 * kapalı formda çözüyoruz.
 */
const solveAmp = (
  build: (amp: number) => Pt[],
  d0: number,
  vw: number,
  desired: number
): number => {
  const at0 = build(0);
  const at1 = build(1);
  let maxAmp = desired;
  for (let i = 0; i <= FIT_SAMPLES; i++) {
    const s = i / FIT_SAMPLES;
    const a = samplePath(at0, s).x;
    const k = samplePath(at1, s).x - a;
    if (Math.abs(k) < 1e-6) continue;
    const pad = diameterAt(d0, s) / 2 + EDGE_PAD;
    const limit = k > 0 ? (vw - pad - a) / k : (pad - a) / k;
    if (limit < maxAmp) maxAmp = limit;
  }
  return Math.max(0.06, Math.min(desired, maxAmp * 0.995));
};

export function BallJourney() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const st = {
      enabled: false,
      geom: null as BallAnchorGeom | null,
      pts: [] as Pt[],
      roll: [] as number[],
      detachY: 0,
      endY: 0,
      secBottom: 0,
      parkX: 0,
      parkY: 0,
      parkR: 0,
      d0: 0,
      vw: 0,
      vh: 0,
      hidden: true,
      key: "",
    };
    let raf = 0;
    let roTimer = 0;
    let lastW = 0;
    let lastH = 0;

    const hide = () => {
      if (st.hidden) return;
      st.hidden = true;
      st.key = "";
      host.style.visibility = "hidden";
      host.style.opacity = "0";
      // Görünmezken tam boy bir compositor katmanını canlı tutma.
      host.style.willChange = "";
    };

    const write = (
      x: number,
      y: number,
      d: number,
      rot: number,
      opacity: number,
      green: number
    ) => {
      if (opacity <= 0.004 || y < -BOX || y > st.vh + BOX) {
        hide();
        return;
      }
      const k = d / BALL_PNG_FILL / BOX;
      // `green` de anahtara girmek ZORUNDA: konum/dönme bir an sabitken
      // (ör. park fazı) geçiş frame'i sessizce yutulurdu.
      const key =
        `${x.toFixed(1)}|${y.toFixed(1)}|` +
        `${k.toFixed(4)}|${rot.toFixed(1)}|${opacity.toFixed(3)}|` +
        `${green.toFixed(3)}`;
      if (key === st.key) return;
      st.key = key;

      host.style.transform =
        `translate3d(${(x - BOX / 2).toFixed(2)}px, ${(y - BOX / 2).toFixed(2)}px, 0)` +
        ` scale(${k.toFixed(5)}) rotate(${rot.toFixed(2)}deg)`;
      host.style.opacity = opacity.toFixed(3);
      host.style.setProperty("--ball-green", green.toFixed(3));
      if (st.hidden) {
        st.hidden = false;
        host.style.willChange = "transform, opacity";
        host.style.visibility = "visible";
      }
    };

    /**
     * Son çare emniyet kelepçesi. `ScrollExpandCard` kadrajı topa göre
     * hizaladığı (solveObjectPosition) için normalde hiç devreye girmez —
     * oradaki pay (≥24px) buradaki EDGE_PAD'den daha geniş.
     */
    const fit = (v: number, r: number, size: number): number =>
      size - r - EDGE_PAD < r + EDGE_PAD
        ? size / 2
        : clamp(v, r + EDGE_PAD, size - r - EDGE_PAD);

    const measure = () => {
      const g = getBallAnchorGeom();
      const vw = document.documentElement.clientWidth;
      const vh = window.innerHeight;
      const sec = document.getElementById(SECTION_IDS.how);

      st.enabled = !reduce && g.enabled && g.nw > 0 && !!sec;
      if (!st.enabled || !sec) {
        hide();
        return;
      }

      st.geom = g;
      st.vw = vw;
      st.vh = vh;
      st.secBottom = offsetTopOf(sec) + sec.offsetHeight;

      // Ayrışma: pin'in doyduğu an (T = −hold), yani tam ekran fazının sonu.
      st.detachY = g.top + g.hold;

      // Bağımsız top, fotoğraftaki topun TAM boyutunda yola çıkar — küçültme yok.
      const a0 = computeBallAnchor(g, st.detachY);
      st.d0 = a0.d;

      const r0 = st.d0 / 2;
      st.parkR = diameterAt(st.d0, 1) / 2;
      st.parkY = PARK_Y * vh;
      // Bölümün ALT SINIRINA sıfır: park edildiğinde topun alt kenarı bölümün
      // alt kenarıyla çakışır.
      st.endY = st.secBottom - st.parkY - st.parkR;

      // Yolculuk için makul bir scroll mesafesi yoksa efekti hiç kurma.
      if (st.endY - st.detachY < vh * 0.75) {
        st.enabled = false;
        hide();
        return;
      }

      // Kart bandı — sağ↔sol geçişleri bunun içinde olmalı.
      const cardEl = document.querySelector<HTMLElement>(".scroll-stack-card");
      const cardH = (cardEl?.offsetHeight || CARD_H_FALLBACK) * BAND_SCALE;
      const bandTop = BAND_TOP * vh;
      const band = (f: number) => bandTop + f * cardH;

      // P0 ölçümden TÜRETİLİR (yakalanmaz): q=0'da konum/çap süreklidir ve
      // tersine scroll'da birebir aynı noktaya döner.
      const p0 = { x: fit(a0.x, r0, vw), y: fit(a0.y, r0, vh) };

      const buildPts = (amp: number): Pt[] => {
        const pts: Pt[] = [p0];
        for (const w of WAYPOINTS) {
          pts.push({
            x: (0.5 + w.sx * amp) * vw,
            y: w.detachY ? p0.y : band(w.by ?? 0.5),
          });
        }
        pts.push({ x: (0.5 + PARK_SX * amp) * vw, y: st.parkY });
        return pts;
      };

      // Yanal genlik: kart kenarının belirgin biçimde dışına taşsın, ama top
      // eğrinin aşım noktalarında bile ekrandan çıkmasın.
      const cardHalf = Math.min(896, vw - 64) / 2 / vw;
      const amp = solveAmp(
        buildPts,
        st.d0,
        vw,
        Math.min(cardHalf + 0.115, 0.46)
      );

      st.pts = buildPts(amp);
      st.parkX = st.pts[st.pts.length - 1].x;
      st.roll = buildRollTable(st.pts, st.d0);
      st.key = "";
    };

    const apply = () => {
      if (!st.enabled || !st.geom) return;
      const y0 = window.scrollY;

      if (y0 < st.detachY) {
        // Tutunma: fotoğraftaki topun tam üstünde, tam boyutunda.
        const a = computeBallAnchor(st.geom, y0);
        const d = a.d;
        const r = d / 2;
        const x = fit(a.x, r, st.vw);
        const y = fit(a.y, r, st.vh);
        // Kartın görünen dikdörtgeninin dışına taşarsa sönümle — normalde
        // belirme penceresi bunu zaten garantiler, güvenlik ağı olarak durur.
        const inside =
          smoothstep(0, 40, a.clipBottom - y) *
          smoothstep(0, 40, y - a.clipTop) *
          smoothstep(0, 40, a.clipRight - x) *
          smoothstep(0, 40, x - a.clipLeft);
        // Envanterdeyken top BEYAZ: yeşil katman tamamen saydam.
        write(x, y, d, 0, smoothstep(FADE_IN0, FADE_IN1, a.open) * inside, 0);
        return;
      }

      const q = clamp((y0 - st.detachY) / (st.endY - st.detachY), 0, 1);
      if (q < 1) {
        // Yolculuk: uçlarda ivmesi sıfır olan yumuşatma → sıçramasız giriş/çıkış.
        const s = smootherstep(q);
        const p = samplePath(st.pts, s);
        // Yeşillik yolun DEĞİL, ham ilerlemenin fonksiyonu: yörünge
        // yumuşatmasından (smootherstep) bağımsız, kendi penceresinde akar.
        write(
          p.x,
          p.y,
          diameterAt(st.d0, s),
          sampleRoll(st.roll, s),
          1,
          smoothstep(GREEN0, GREEN1, q)
        );
        return;
      }

      // Park: bölümün alt sınırına sıfır. O noktaya gelene kadar viewport'a
      // asılı kalır, sonra bölümle birlikte yukarı kayıp ekrandan çıkar —
      // sonraki bölüme hiç geçmez.
      const y = Math.min(st.parkY, st.secBottom - y0 - st.parkR);
      write(st.parkX, y, st.parkR * 2, st.roll[ROLL_SAMPLES], 1, 1);
    };

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        apply();
      });
    };

    const remeasure = () => {
      measure();
      apply();
    };

    const onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      // Mobil URL çubuğu ölü bandı — ScrollExpandCard ile aynı eşik.
      if (w === lastW && Math.abs(h - lastH) <= 120) return;
      lastW = w;
      lastH = h;
      remeasure();
    };

    lastW = window.innerWidth;
    lastH = window.innerHeight;
    remeasure();

    // Bölümün yüksekliği (font/görsel yüklemesi) değişince park hesabı kayar.
    const ro = new ResizeObserver(() => {
      if (roTimer) return;
      roTimer = window.setTimeout(() => {
        roTimer = 0;
        remeasure();
      }, 120);
    });
    ro.observe(document.body);
    document.fonts?.ready.then(remeasure).catch(() => {});

    const unsubscribe = subscribeBallAnchorGeom(remeasure);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      if (roTimer) clearTimeout(roTimer);
      ro.disconnect();
      unsubscribe();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      host.style.visibility = "hidden";
      host.style.opacity = "0";
      host.style.transform = "";
    };
  }, [reduce]);

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-0 size-80 [filter:drop-shadow(0_18px_30px_rgb(0_0_0/0.45))]"
      style={{ opacity: 0, visibility: "hidden" }}
    >
      {/* `unoptimized`: kaynak zaten tam ölçüsünde ve KAYIPSIZ PNG. Next'in
          /_next/image katmanı q75 ile yeniden kodlayıp topun yumuşak
          gradyanlarını bozuyordu — ikinci bir sıkıştırma turu istemiyoruz. */}
      <Image
        src="/ball-768.png"
        alt=""
        width={BOX}
        height={BOX}
        loading="eager"
        unoptimized
        className="block size-full"
      />
      {/* İş akışı bölümünün yeşil topu. Alttaki katman HER ZAMAN opak kalır ve
          yalnız bu katman solar: iki silüet aynı olduğundan bileşke alfa geçiş
          boyunca hiç değişmez → host'taki drop-shadow titremez, %50'de kenarda
          hale/çift kontur oluşmaz. Host `fixed` olduğu için `absolute`ın
          containing block'u hazır, ayrıca `relative` gerekmiyor. */}
      <Image
        src="/ball-768-green.webp"
        alt=""
        width={BOX}
        height={BOX}
        loading="eager"
        /* Geçiş başlarken hazır olmalı (geç yüklenirse pop olur), ama ilk
           boyamanın kaynaklarıyla yarışmasın. */
        fetchPriority="low"
        unoptimized
        className="absolute inset-0 block size-full"
        style={{ opacity: "var(--ball-green, 0)" }}
      />
    </div>
  );
}
