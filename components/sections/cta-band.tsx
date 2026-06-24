import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { GlassCard } from "@/components/effects/glass-card";
import { AnchorLink } from "@/components/layout/anchor-link";
import { LedRibbon } from "./led-ribbon";
import { buttonVariants } from "@/components/ui/button";
import { SECTION_IDS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import Magnet from "@/components/Magnet";

export function CtaBand() {
  const t = useTranslations("cta");
  const th = useTranslations("hero");
  const ribbonWords = [
    th("ribbon.a"),
    th("ribbon.b"),
    th("ribbon.c"),
    th("ribbon.d"),
  ];

  return (
    <Section className="relative overflow-hidden">
      {/* eğimli signature şerit — bölüm ayıracı */}
      <div className="relative -mx-[12vw] mb-16 sm:mb-20">
        <LedRibbon words={ribbonWords} tilt reverse durationSec={22} />
      </div>

      <Container>
        <GlassCard
          strong
          className="relative overflow-hidden rounded-3xl px-6 py-12 text-center sm:px-12 sm:py-16"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_50%_0%,color-mix(in_oklch,var(--brand-turf)_18%,transparent),transparent_70%)]"
          />
          <div className="relative flex flex-col items-center gap-5">
            <span className="font-mono text-[11px] font-medium uppercase tracking-[0.3em] text-led sm:text-xs">
              {t("eyebrow")}
            </span>
            <h2 className="max-w-2xl text-balance font-display text-3xl font-extrabold uppercase leading-[0.95] tracking-tight sm:text-5xl">
              {t("title")}
            </h2>
            <p className="max-w-xl text-pretty text-muted-foreground sm:text-lg">
              {t("subtitle")}
            </p>
            <Magnet padding={90} magnetStrength={3.5}>
              <AnchorLink
                href={`#${SECTION_IDS.contact}`}
                className={cn(
                  buttonVariants(),
                  "group mt-2 h-12 gap-2 rounded-xl px-7 text-base font-semibold shadow-[0_0_36px_-10px_var(--brand-turf)]",
                )}
              >
                {t("button")}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </AnchorLink>
            </Magnet>
          </div>
        </GlassCard>
      </Container>
    </Section>
  );
}
