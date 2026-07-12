"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  motion,
  useReducedMotion,
  useScroll,
  useMotionValueEvent,
} from "motion/react";
import { useTranslations } from "next-intl";
import { ArrowRight, ChevronDown } from "lucide-react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Container } from "@/components/layout/container";
import { AnchorLink } from "@/components/layout/anchor-link";
import { LedRibbon } from "./led-ribbon";
import { buttonVariants } from "@/components/ui/button";
import { SECTION_IDS } from "@/lib/constants";
import { setHeroIntroProgress } from "@/lib/hero-intro-store";
import { cn } from "@/lib/utils";

gsap.registerPlugin(useGSAP, ScrollTrigger);

// WebGL sıvı-metal logo yalnızca istemcide (ssr:false) yüklenir.
const MetallicPaint = dynamic(() => import("@/components/MetallicPaint"), {
  ssr: false,
});

// public/hero-frames içindeki kare dizisi (herovideonew.mp4'ten 24fps çıkarıldı)
const HERO_FRAME_DIR = "/hero-frames";
const HERO_FRAME_COUNT = 130;
// İlk kare: sıkıştırılmış frame-0001.jpg yerine yüksek çözünürlüklü düzenlenmiş PNG.
const HERO_FIRST_FRAME = "/pengrim-first-frame-edited.png";
// Intro (merkezî logo) evresinin pinli zaman çizelgesindeki bitiş oranı.
const INTRO_END = 0.16;

/** Bir metni kelime <span>'lerine böler (ScrollReveal kelime-kelime efekti için). */
function splitWords(text: string, keyPrefix: string) {
  return text.split(/(\s+)/).map((chunk, i) =>
    /^\s+$/.test(chunk) ? (
      chunk
    ) : (
      <span key={`${keyPrefix}-${i}`} className="hero-word inline-block">
        {chunk}
      </span>
    ),
  );
}

export function Hero() {
  const t = useTranslations("hero");
  const reduce = useReducedMotion();

  // "Aşağı kaydır" göstergesi: yalnızca sayfa en üstteyken görünür, scroll
  // başlar başlamaz kaybolur, en üste dönülünce tekrar belirir.
  const [atTop, setAtTop] = useState(true);
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (y) => setAtTop(y < 10));

  // Merkezî logo: masaüstünde MetallicPaint (WebGL), dokunmatik/dar ekranda
  // maliyetsiz statik beyaz logo. mounted olana kadar iç render edilmez
  // (yanlış dal + gereksiz WebGL chunk yüklemesini önler).
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia("(max-width: 767px), (pointer: coarse)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const revealRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const logoWrapRef = useRef<HTMLDivElement>(null);

  const ribbonWords = [t("ribbon.a"), t("ribbon.b"), t("ribbon.c"), t("ribbon.d")];

  const eyebrowWords = useMemo(() => splitWords(t("eyebrow"), "e"), [t]);
  const headlineWords = useMemo(() => splitWords(t("headline"), "h"), [t]);
  const sublineWords = useMemo(() => splitWords(t("subline"), "s"), [t]);

  // Scroll-scrub: kare dizisini <canvas>'a çiziyoruz + başlık kelimeleri aynı
  // pinli zaman çizelgesinde (videoyla senkron) opaklık/blur ile beliriyor.
  useGSAP(
    () => {
      const canvas = canvasRef.current;
      const section = sectionRef.current;
      if (!canvas || !section) return;
      // alpha:false → her frame'de opak kare çizildiği için alfa karıştırma atlanır;
      // desynchronized:true → destekleyen tarayıcılarda scroll-tetiklemeli redraw
      // gecikmesini azaltır (compositor round-trip bypass ipucu).
      const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
      if (!ctx) return;

      // kareleri oluştur (henüz yüklemeye başlamadan) — `.src` atanana kadar
      // tarayıcı isteği başlatmaz.
      const images: HTMLImageElement[] = [];
      for (let i = 1; i <= HERO_FRAME_COUNT; i++) {
        images.push(new Image());
      }
      // kare kaynağı: 0. kare yüksek çözünürlüklü PNG, kalanlar JPG dizisi.
      const srcFor = (index: number) =>
        index === 0
          ? HERO_FIRST_FRAME
          : `${HERO_FRAME_DIR}/frame-${String(index + 1).padStart(4, "0")}.jpg`;

      let currentFrame = 0;

      // canvas'ı viewport'a kapatacak şekilde (object-cover mantığı) çiz
      const draw = (index: number) => {
        let i = Math.max(0, Math.min(HERO_FRAME_COUNT - 1, Math.round(index)));
        if (!images[i]?.complete || !images[i]?.naturalWidth) {
          let near = -1;
          for (let d = 1; d < HERO_FRAME_COUNT; d++) {
            if (images[i - d]?.complete && images[i - d]?.naturalWidth) {
              near = i - d;
              break;
            }
            if (images[i + d]?.complete && images[i + d]?.naturalWidth) {
              near = i + d;
              break;
            }
          }
          if (near === -1) return;
          i = near;
        }
        currentFrame = i;
        const img = images[i];
        const cw = canvas.width;
        const ch = canvas.height;
        const ir = img.naturalWidth / img.naturalHeight;
        const cr = cw / ch;
        let dw, dh, dx, dy;
        if (cr > ir) {
          dw = cw;
          dh = cw / ir;
          dx = 0;
          dy = (ch - dh) / 2;
        } else {
          dh = ch;
          dw = ch * ir;
          dy = 0;
          dx = (cw - dw) / 2;
        }
        ctx.drawImage(img, dx, dy, dw, dh);
      };

      const resize = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(canvas.clientWidth * dpr);
        canvas.height = Math.round(canvas.clientHeight * dpr);
        draw(currentFrame);
      };
      resize();
      window.addEventListener("resize", resize);

      // Kareleri kademeli yükle: sayfa açılışında 130 isteği (~10MB) tek seferde
      // ateşleyip kritik JS/font indirmeleriyle bant genişliği için yarışmak yerine,
      // scrub başlangıcını karşılayacak küçük bir pencereyi hemen, kalanını boşta
      // (idle) zaman içinde küçük gruplar halinde yükler. Toplam indirilen byte
      // değişmez — yalnızca zamanlama.
      const EAGER_WINDOW = 8;
      const BATCH_SIZE = 6;
      const scheduleIdle: (cb: () => void) => number =
        typeof window.requestIdleCallback === "function"
          ? (cb) => window.requestIdleCallback(cb, { timeout: 500 })
          : (cb) => window.setTimeout(cb, 120);
      const cancelIdle: (id: number) => void =
        typeof window.cancelIdleCallback === "function"
          ? window.cancelIdleCallback.bind(window)
          : window.clearTimeout.bind(window);

      let idleHandle: number | null = null;
      let cancelled = false;

      for (let i = 0; i < EAGER_WINDOW && i < HERO_FRAME_COUNT; i++) {
        images[i].src = srcFor(i);
      }

      let nextIndex = EAGER_WINDOW;
      const loadNextBatch = () => {
        if (cancelled) return;
        let loaded = 0;
        while (nextIndex < HERO_FRAME_COUNT && loaded < BATCH_SIZE) {
          images[nextIndex].src = srcFor(nextIndex);
          nextIndex++;
          loaded++;
        }
        if (nextIndex < HERO_FRAME_COUNT) {
          idleHandle = scheduleIdle(loadNextBatch);
        }
      };
      idleHandle = scheduleIdle(loadNextBatch);

      if (images[0].complete) draw(0);
      else images[0].addEventListener("load", () => draw(0), { once: true });

      // prefers-reduced-motion: scroll-jacking yok, kelimeler doğrudan görünür,
      // intro yok → header tam halinde kalsın.
      if (reduce) {
        setHeroIntroProgress(1);
        return () => {
          cancelled = true;
          if (idleHandle !== null) cancelIdle(idleHandle);
          window.removeEventListener("resize", resize);
        };
      }

      const words = Array.from(
        section.querySelectorAll<HTMLElement>(".hero-word"),
      );
      // FOUC olmadan başlangıç durumu (useGSAP layout-effect içinde çalışır)
      gsap.set(words, { opacity: 0, filter: "blur(10px)", y: 14 });
      gsap.set(ctaRef.current, { opacity: 0, y: 20 });

      const proxy = { frame: 0 };
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => "+=" + window.innerHeight * 3,
          pin: true,
          scrub: 0.5,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          // intro ilerlemesini yayınla (0=logo tam görünür … 1=intro bitti) →
          // header ile logo fade'i tek kaynaktan senkron.
          onUpdate: (self) =>
            setHeroIntroProgress(Math.min(1, self.progress / INTRO_END)),
        },
      });

      // scroll konumu → kare indeksi (tüm scroll mesafesine yayılır)
      tl.to(
        proxy,
        {
          frame: HERO_FRAME_COUNT - 1,
          duration: 1,
          ease: "none",
          onUpdate: () => draw(proxy.frame),
        },
        0,
      );

      // merkezî logo (ilk kareler) sönümlenerek hero yazısına yer açar
      if (logoWrapRef.current) {
        tl.to(
          logoWrapRef.current,
          {
            opacity: 0,
            scale: 0.94,
            filter: "blur(6px)",
            ease: "none",
            duration: INTRO_END,
          },
          0,
        );
      }

      // başlık bloğu hafif dönüşten düzelir (ScrollReveal baseRotation)
      tl.fromTo(
        revealRef.current,
        { rotate: 4, transformOrigin: "0% 50%" },
        { rotate: 0, ease: "none", duration: 0.5 },
        0.12,
      );

      // kelimeler scroll ile sırayla netleşir (opacity + blur), logo çekildikten
      // hemen sonra başlar → temiz devir-teslim
      tl.to(
        words,
        {
          opacity: 1,
          filter: "blur(0px)",
          y: 0,
          ease: "none",
          duration: 0.2,
          stagger: 0.035,
        },
        0.12,
      );

      // CTA butonları da scroll ile (kelimelerden sonra) belirir
      tl.to(
        ctaRef.current,
        { opacity: 1, y: 0, ease: "none", duration: 0.25 },
        0.6,
      );

      return () => {
        cancelled = true;
        if (idleHandle !== null) cancelIdle(idleHandle);
        window.removeEventListener("resize", resize);
      };
    },
    { scope: sectionRef, dependencies: [reduce] },
  );

  return (
    <section
      ref={sectionRef}
      id={SECTION_IDS.hero}
      className="relative h-dvh w-full overflow-hidden"
    >
      {/* kareler yüklenene kadar görünecek poster (yüksek çözünürlüklü ilk kare) */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${HERO_FIRST_FRAME})` }}
      />

      {/* Scroll ile sürülen hero kare dizisi — her ekranı/oryantasyonu tam kaplar */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="absolute inset-0 h-full w-full will-change-transform transform-gpu"
      />

      {/* okunabilirlik için karartma katmanı + alt bölüme yumuşak geçiş */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-linear-to-b from-black/55 via-black/20 to-background"
      />

      {/* içerik katmanı */}
      <div ref={contentRef} className="relative z-10 flex h-full flex-col">
        {/* SIGNATURE — merkezî sıvı-metal logo (yalnız intro, hareket açıkken) */}
        {!reduce && (
          <div
            ref={logoWrapRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 grid place-items-center will-change-[opacity,transform]"
          >
            <div className="aspect-square w-[min(110vw,800px)]">
              {mounted ? (
                isMobile ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src="/pengrim_beyaz.png"
                    alt=""
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <MetallicPaint
                    imageSrc="/pengrim_siyah.png"
                    seed={42}
                    scale={1}
                    patternSharpness={0.7}
                    noiseScale={0.4}
                    speed={0.15}
                    liquid={0.7}
                    mouseAnimation={false}
                    brightness={1.85}
                    contrast={0.9}
                    refraction={0.015}
                    blur={0.078}
                    chromaticSpread={0.8}
                    fresnel={1}
                    distortion={0.1}
                    contour={0.1}
                    lightColor="#ffffff"
                    darkColor="#ffffff"
                    tintColor="#b3edff"
                    angle={90}
                  />
                )
              ) : null}
            </div>
          </div>
        )}

        <div className="flex flex-1 items-center pt-28 pb-10 sm:pt-32">
          <Container>
            <div className="max-w-3xl">
              {/* eyebrow — scroll ile senkron belirir */}
              <span className="inline-flex items-center gap-2.5 font-mono text-[11px] font-medium uppercase tracking-[0.3em] text-muted-foreground sm:text-xs">
                <span
                  className="hero-word size-2 shrink-0 rounded-full bg-led"
                  aria-hidden="true"
                />
                {eyebrowWords}
              </span>

              {/* scroll ile senkron beliren başlık + alt satır */}
              <div ref={revealRef} className="mt-5">
                <h1 className="font-display text-4xl font-extrabold uppercase leading-[0.98] tracking-tight text-white sm:text-6xl md:text-7xl">
                  {headlineWords}
                </h1>
                <p className="mt-5 max-w-xl font-display text-lg font-semibold uppercase tracking-tight text-led sm:text-xl">
                  {sublineWords}
                </p>
              </div>

              {/* CTA — scroll ile belirir */}
              <div
                ref={ctaRef}
                className="hero-cta mt-9 flex flex-col gap-3 sm:flex-row sm:items-center"
              >
                <AnchorLink
                  href={`#${SECTION_IDS.contact}`}
                  className={cn(
                    buttonVariants(),
                    "group h-12 gap-2 rounded-xl px-6 text-base font-semibold shadow-[0_0_36px_-10px_var(--brand-turf)]",
                  )}
                >
                  {t("ctaPrimary")}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </AnchorLink>
                <AnchorLink
                  href={`#${SECTION_IDS.how}`}
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "h-12 rounded-xl px-6 text-base",
                  )}
                >
                  {t("ctaSecondary")}
                </AnchorLink>
              </div>
            </div>
          </Container>
        </div>

        {/* aşağı kaydır göstergesi — LED şeridinin hemen üstünde, yalnızca
            sayfa en üstteyken görünür, scroll ile kaybolup en üste dönülünce
            tekrar belirir */}
        <motion.div
          aria-hidden="true"
          className="pointer-events-none flex justify-center pb-3 sm:pb-4"
          animate={{ opacity: atTop ? 1 : 0, y: atTop ? 0 : 10 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <motion.span
            animate={reduce ? undefined : { y: [0, 8, 0] }}
            transition={
              reduce
                ? undefined
                : { duration: 1.6, repeat: Infinity, ease: "easeInOut" }
            }
          >
            <ChevronDown className="size-6 text-white/70" />
          </motion.span>
        </motion.div>

        {/* SIGNATURE şerit */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 20 }}
          animate={reduce ? false : { opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="pb-8 sm:pb-10"
        >
          <LedRibbon words={ribbonWords} />
        </motion.div>
      </div>
    </section>
  );
}
