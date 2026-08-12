import { useTranslations } from "next-intl";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { SectionHeading } from "@/components/layout/section-heading";
import { STEPS, SECTION_IDS } from "@/lib/constants";
import { ICONS } from "@/lib/icons";
import { IconChip } from "@/components/ui/icon-chip";
import ScrollStack, { ScrollStackItem } from "@/components/ScrollStack";
import { BallJourney } from "@/components/effects/ball-journey";

export function HowItWorks() {
  const t = useTranslations("how");
  const ts = useTranslations("how.steps");

  return (
    <Section
      id={SECTION_IDS.how}
      className="border-y border-border/40 bg-muted/40"
    >
      {/* Envanter fotoğrafından kopan top. Section'ın İLK çocuğu olması şart:
          bölüm arka planının üstünde, ScrollStack kartlarının arkasında kalır. */}
      <BallJourney />

      <Container>
        <SectionHeading
          eyebrow={t("eyebrow")}
          title={t("title")}
          subtitle={t("subtitle")}
        />
      </Container>

      <Container className="mt-6">
        <ScrollStack
          /* z-10: topun (z-0) kartların arkasında kalması boyama sırasına
             bırakılmaz, açıkça sabitlenir. */
          className="relative z-10"
          useWindowScroll
          itemDistance={120}
          itemScale={0.025}
          itemStackDistance={26}
          stackPosition="18%"
          baseScale={0.86}
        >
          {STEPS.map((step, i) => {
            const Icon = ICONS[step.icon];
            return (
              <ScrollStackItem
                key={step.key}
                itemClassName="glass-opaque glass-opaque-deep mx-auto max-w-4xl !p-7 sm:!p-10"
              >
                <span className="pointer-events-none absolute right-6 top-4 font-display text-7xl font-extrabold leading-none text-foreground/5 sm:text-8xl">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="relative flex h-full flex-col justify-center gap-5 sm:flex-row sm:items-center sm:gap-8">
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-2xl font-bold tabular-nums text-led sm:text-3xl">
                      {step.clock}
                    </span>
                    <IconChip size="lg">
                      <Icon />
                    </IconChip>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold tracking-tight sm:text-2xl">
                      {ts(`${step.key}.title`)}
                    </h3>
                    <p className="mt-2 max-w-xl leading-relaxed text-muted-foreground">
                      {ts(`${step.key}.desc`)}
                    </p>
                  </div>
                </div>
              </ScrollStackItem>
            );
          })}
        </ScrollStack>
      </Container>
    </Section>
  );
}
