"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { ArrowRight, PlayCircle } from "lucide-react";
import { Container } from "@/components/layout/container";
import { AnchorLink } from "@/components/layout/anchor-link";
import { LedRibbon } from "./led-ribbon";
import { HeroBackdrop } from "./hero-backdrop";
import { buttonVariants } from "@/components/ui/button";
import { SECTION_IDS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import LightRays from "@/components/LightRays";
import SplitText from "@/components/SplitText";
import GradientText from "@/components/GradientText";
import RotatingText from "@/components/RotatingText";
import ShinyText from "@/components/ShinyText";
import Magnet from "@/components/Magnet";

export function Hero() {
  const t = useTranslations("hero");
  const reduce = useReducedMotion();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px), (pointer: coarse)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";
  const ribbonWords = [t("ribbon.a"), t("ribbon.b"), t("ribbon.c"), t("ribbon.d")];

  const titleClass =
    "font-display text-4xl font-extrabold uppercase leading-[0.95] tracking-tight sm:text-6xl md:text-7xl lg:text-[5.5rem]";

  return (
    <section
      id={SECTION_IDS.hero}
      className="relative flex min-h-dvh flex-col overflow-hidden"
    >
      <HeroBackdrop />

      {/* Floodlight ışınları (yalnızca koyu tema + hareket açık + masaüstü — WebGL canvas mobilde ağır kasmaya yol açıyor) */}
      {isDark && !reduce && !isMobile ? (
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-70">
          <LightRays
            raysOrigin="top-center"
            raysColor="#9bff7a"
            raysSpeed={0.9}
            lightSpread={1.1}
            rayLength={1.4}
            followMouse
            mouseInfluence={0.12}
            noiseAmount={0.08}
            distortion={0.03}
            className="h-full w-full"
          />
        </div>
      ) : null}

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
    </section>
  );
}
