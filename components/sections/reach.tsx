import { useTranslations } from "next-intl";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { SectionHeading } from "@/components/layout/section-heading";
import { Reveal } from "@/components/effects/reveal";
import { CHANNELS, SECTION_IDS } from "@/lib/constants";
import { ICONS } from "@/lib/icons";
import SpotlightCard from "@/components/SpotlightCard";

export function Reach() {
  const t = useTranslations("reach");

  return (
    <Section id={SECTION_IDS.reach}>
      <Container>
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <SectionHeading
            eyebrow={t("eyebrow")}
            title={t("title")}
            subtitle={t("subtitle")}
          />

          <Reveal>
            <SpotlightCard
              spotlightColor="rgba(130, 230, 150, 0.16)"
              className="divide-y divide-border/50 p-0"
            >
              {CHANNELS.map((c, i) => {
                const Icon = ICONS[c.icon];
                return (
                  <div
                    key={c.key}
                    className="flex items-center gap-4 p-5 sm:gap-5 sm:p-6"
                  >
                    <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-led/10 text-led">
                      <Icon className="size-6" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display text-base font-bold uppercase tracking-tight">
                        {t(`channels.${c.key}.title`)}
                      </h3>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {t(`channels.${c.key}.desc`)}
                      </p>
                    </div>
                    <span className="hidden font-mono text-xs tabular-nums text-muted-foreground/60 sm:block">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                );
              })}
            </SpotlightCard>
          </Reveal>
        </div>
      </Container>
    </Section>
  );
}
