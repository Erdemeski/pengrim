"use client";

import { useRef } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { ArrowRight, PlayCircle } from "lucide-react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Container } from "@/components/layout/container";
import { AnchorLink } from "@/components/layout/anchor-link";
import { LedRibbon } from "./led-ribbon";
import { buttonVariants } from "@/components/ui/button";
import { SECTION_IDS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import SplitText from "@/components/SplitText";
import GradientText from "@/components/GradientText";
import ShinyText from "@/components/ShinyText";

gsap.registerPlugin(useGSAP, ScrollTrigger);

// public/hero-frames içindeki kare dizisi (videodan 24fps çıkarıldı)
const HERO_FRAME_DIR = "/hero-frames";
const HERO_FRAME_COUNT = 121;

export function Hero() {
  const t = useTranslations("hero");
  const reduce = useReducedMotion();

  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const ribbonWords = [t("ribbon.a"), t("ribbon.b"), t("ribbon.c"), t("ribbon.d")];

  const titleClass =
    "font-display text-4xl font-extrabold uppercase leading-[0.95] tracking-tight sm:text-6xl md:text-7xl lg:text-[5.5rem]";

  // Scroll-scrub: video elementini seek etmek mobilde takılıyor; bunun yerine
  // videodan çıkarılmış kare dizisini <canvas> üzerine çiziyoruz (anında decode).
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
        // henüz yüklenmemiş kareyi en yakın yüklenmiş kareyle değiştir
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

      // ilk kare yüklenince çiz
      if (images[0].complete) draw(0);
      else images[0].addEventListener("load", () => draw(0), { once: true });

      // prefers-reduced-motion: scroll-jacking yok — yalnızca ilk kare sabit durur.
      if (reduce) {
        return () => window.removeEventListener("resize", resize);
      }

      const proxy = { frame: 0 };
      gsap
        .timeline({
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: () => "+=" + window.innerHeight * 3,
            pin: true,
            scrub: 0.5,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        })
        // scroll konumu → kare indeksi (tüm scroll mesafesine yayılır)
        .to(
          proxy,
          {
            frame: HERO_FRAME_COUNT - 1,
            duration: 1,
            ease: "none",
            onUpdate: () => draw(proxy.frame),
          },
          0,
        )
        // içerik scroll'un son kısmında yumuşakça kaybolur
        .to(
          contentRef.current,
          { autoAlpha: 0, y: -40, duration: 0.4, ease: "none" },
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
            <div className="max-w-4xl">
              {/* eyebrow */}
              <motion.div
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={reduce ? false : { opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="inline-flex items-center gap-2.5"
              >
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-led opacity-60" />
                  <span className="relative inline-flex size-2 rounded-full bg-led" />
                </span>
                <ShinyText
                  text={t("eyebrow")}
                  speed={4}
                  color="var(--muted-foreground)"
                  shineColor="var(--brand-led)"
                  className="font-mono text-[11px] font-medium uppercase tracking-[0.3em] sm:text-xs"
                />
              </motion.div>

              {/* başlık */}
              <h1 className={cn("mt-5", titleClass)}>
                {reduce ? (
                  <span className="block">{t("titleTop")}</span>
                ) : (
                  <span className="block">
                    <SplitText
                      text={t("titleTop")}
                      tag="span"
                      splitType="chars"
                      delay={28}
                      duration={0.9}
                      textAlign="left"
                      className="inline-block"
                    />
                  </span>
                )}
                <GradientText
                  colors={[
                    "var(--brand-turf)",
                    "var(--brand-led)",
                    "var(--brand-turf)",
                  ]}
                  animationSpeed={7}
                  className="block"
                >
                  {t("titleHighlight")}
                </GradientText>
                {reduce ? (
                  <span className="block">{t("titleBottom")}</span>
                ) : (
                  <span className="block">
                    <SplitText
                      text={t("titleBottom")}
                      tag="span"
                      splitType="chars"
                      delay={28}
                      duration={0.9}
                      textAlign="left"
                      className="inline-block"
                    />
                  </span>
                )}
              </h1>

              {/* açıklama */}
              <motion.p
                initial={reduce ? false : { opacity: 0, y: 16 }}
                animate={reduce ? false : { opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.6 }}
                className="mt-6 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg"
              >
                {t("subtitle")}
              </motion.p>

              {/* CTA */}
              <motion.div
                initial={reduce ? false : { opacity: 0, y: 16 }}
                animate={reduce ? false : { opacity: 1, y: 0 }}
                transition={{ delay: 0.72, duration: 0.6 }}
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
                    "h-12 gap-2 rounded-xl px-6 text-base",
                  )}
                >
                  <PlayCircle className="size-4 text-led" />
                  {t("ctaSecondary")}
                </AnchorLink>
              </motion.div>
            </div>
          </Container>
        </div>

        {/* SIGNATURE şerit */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 20 }}
          animate={reduce ? false : { opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="pb-8 sm:pb-10"
        >
          <LedRibbon words={ribbonWords} />
        </motion.div>
      </div>
    </section>
  );
}
