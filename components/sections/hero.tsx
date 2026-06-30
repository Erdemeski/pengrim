"use client";

import { useMemo, useRef } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Container } from "@/components/layout/container";
import { AnchorLink } from "@/components/layout/anchor-link";
import { LedRibbon } from "./led-ribbon";
import { buttonVariants } from "@/components/ui/button";
import { SECTION_IDS } from "@/lib/constants";
import { cn } from "@/lib/utils";

gsap.registerPlugin(useGSAP, ScrollTrigger);

// public/hero-frames içindeki kare dizisi (herovideonew.mp4'ten 24fps çıkarıldı)
const HERO_FRAME_DIR = "/hero-frames";
const HERO_FRAME_COUNT = 130;

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

  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const revealRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

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
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // kareleri yükle
      const images: HTMLImageElement[] = [];
      for (let i = 1; i <= HERO_FRAME_COUNT; i++) {
        const img = new Image();
        img.src = `${HERO_FRAME_DIR}/frame-${String(i).padStart(4, "0")}.jpg`;
        images.push(img);
      }

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

      if (images[0].complete) draw(0);
      else images[0].addEventListener("load", () => draw(0), { once: true });

      // prefers-reduced-motion: scroll-jacking yok, kelimeler doğrudan görünür.
      if (reduce) {
        return () => window.removeEventListener("resize", resize);
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

      // başlık bloğu hafif dönüşten düzelir (ScrollReveal baseRotation)
      tl.fromTo(
        revealRef.current,
        { rotate: 4, transformOrigin: "0% 50%" },
        { rotate: 0, ease: "none", duration: 0.5 },
        0,
      );

      // kelimeler scroll ile sırayla netleşir (opacity + blur), videoyla senkron
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
        0.05,
      );

      // CTA butonları da scroll ile (kelimelerden sonra) belirir
      tl.to(
        ctaRef.current,
        { opacity: 1, y: 0, ease: "none", duration: 0.25 },
        0.6,
      );

      return () => window.removeEventListener("resize", resize);
    },
    { scope: sectionRef, dependencies: [reduce] },
  );

  return (
    <section
      ref={sectionRef}
      id={SECTION_IDS.hero}
      className="relative h-dvh w-full overflow-hidden"
    >
      {/* kareler yüklenene kadar görünecek poster (object-cover) */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url(/hero-poster.jpg)" }}
      />

      {/* Scroll ile sürülen hero kare dizisi — her ekranı/oryantasyonu tam kaplar */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
      />

      {/* okunabilirlik için karartma katmanı + alt bölüme yumuşak geçiş */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-linear-to-b from-black/55 via-black/20 to-background"
      />

      {/* içerik katmanı */}
      <div ref={contentRef} className="relative z-10 flex h-full flex-col">
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
                className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center"
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
