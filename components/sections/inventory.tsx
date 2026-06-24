import { useTranslations } from "next-intl";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { SectionHeading } from "@/components/layout/section-heading";
import { Reveal } from "@/components/effects/reveal";
import { Badge } from "@/components/ui/badge";
import { INVENTORY, SECTION_IDS } from "@/lib/constants";
import { ICONS } from "@/lib/icons";
import SpotlightCard from "@/components/SpotlightCard";

export function Inventory() {
  const t = useTranslations("inventory");

  return (
    <Section id={SECTION_IDS.inventory}>
      <Container>
        <SectionHeading
          eyebrow={t("eyebrow")}
          title={t("title")}
          subtitle={t("subtitle")}
        />

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {INVENTORY.map((item, i) => {
            const Icon = ICONS[item.icon];
            return (
              <Reveal key={item.key} delay={i * 0.08}>
                <SpotlightCard
                  spotlightColor="rgba(130, 230, 150, 0.16)"
                  className="group flex h-full flex-col gap-4 p-6 transition-transform duration-300 hover:-translate-y-1"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="grid size-12 place-items-center rounded-xl border border-led/20 bg-led/10 text-led transition-colors group-hover:bg-led/15">
                      <Icon className="size-6" />
                    </span>
                    <Badge
                      variant="outline"
                      className="border-border/60 bg-background/40 font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
                    >
                      {t(`items.${item.key}.tag`)}
                    </Badge>
                  </div>
                  <h3 className="font-display text-xl font-bold uppercase leading-tight tracking-tight">
                    {t(`items.${item.key}.title`)}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {t(`items.${item.key}.desc`)}
                  </p>
                </SpotlightCard>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}
