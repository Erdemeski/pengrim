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
import RotatingText from "@/components/RotatingText";
import ShinyText from "@/components/ShinyText";
import Magnet from "@/components/Magnet";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export function Hero() {
  const t = useTranslations("hero");
  const reduce = useReducedMotion();

  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const ribbonWords = [t("ribbon.a"), t("ribbon.b"), t("ribbon.c"), t("ribbon.d")];

  const titleClass =
    "font-display text-4xl font-extrabold uppercase leading-[0.95] tracking-tight sm:text-6xl md:text-7xl lg:text-[5.5rem]";

  // Scroll ile videoyu kare kare süren ScrollTrigger kurulumu.
  useGSAP(
    () => {
      const video = videoRef.current;
      const section = sectionRef.current;
      if (!video || !section) return;

      // prefers-reduced-motion: scroll-jacking yok — video sade şekilde döngüde oynar.
      if (reduce) {
        video.loop = true;
        video.play().catch(() => {});
        return;
      }

      // iOS: programatik currentTime atlamasını açmak için kısa bir play→pause.
      video.play().then(() => video.pause()).catch(() => {});

      const build = () => {
        const duration = video.duration || 5;
        gsap
          .timeline({
            scrollTrigger: {
              trigger: section,
              start: "top top",
              end: () => "+=" + window.innerHeight * 3,
              pin: true,
              scrub: 1,
              anticipatePin: 1,
              invalidateOnRefresh: true,
            },
          })
          // scroll konumu → videonun karesi (tüm scroll mesafesine yayılır)
          .to(video, { currentTime: duration, duration: 1, ease: "none" }, 0)
          // içerik scroll'un son kısmında yumuşakça kaybolur
          .to(
            contentRef.current,
            { autoAlpha: 0, y: -40, duration: 0.4, ease: "none" },
            0.6,
          );
      };

      if (video.readyState >= 1) build();
      else video.addEventListener("loadedmetadata", build, { once: true });
    },
    { scope: sectionRef, dependencies: [reduce] },
  );

  return (
    <section
      ref={sectionRef}
      id={SECTION_IDS.hero}
      className="relative h-dvh w-full overflow-hidden"
    >
      {/* Scroll ile sürülen hero videosu — her ekranı/oryantasyonu object-cover ile tam kaplar */}
      <video
        ref={videoRef}
        muted
        playsInline
        preload="auto"
        poster="/hero-poster.jpg"
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
      >
        <source src="/herovideo-scrub.mp4" type="video/mp4" />
      </video>

      {/* okunabilirlik için karartma katmanı + alt bölüme yumuşak geçiş */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/20 to-background"
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

              {/* dönen alt-başlık */}
              <motion.div
                initial={reduce ? false : { opacity: 0 }}
                animate={reduce ? false : { opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                className="mt-5 flex flex-wrap items-center gap-2 font-display text-lg font-semibold uppercase tracking-tight sm:text-xl"
              >
                <span className="text-muted-foreground">{t("rotatingPrefix")}</span>
                <RotatingText
                  texts={[t("rotating.a"), t("rotating.b"), t("rotating.c")]}
                  rotationInterval={2200}
                  staggerDuration={0.02}
                  staggerFrom="first"
                  mainClassName="inline-flex overflow-hidden rounded-lg bg-primary px-2.5 py-0.5 text-primary-foreground"
                  splitLevelClassName="overflow-hidden"
                  transition={{ type: "spring", damping: 28, stiffness: 320 }}
                />
              </motion.div>

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
                <Magnet padding={80} magnetStrength={4} disabled={!!reduce}>
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
                </Magnet>
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
