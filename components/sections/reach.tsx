import { useTranslations } from "next-intl";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { SectionHeading } from "@/components/layout/section-heading";
import { Reveal } from "@/components/effects/reveal";
import { IconChip } from "@/components/ui/icon-chip";
import { CHANNELS, SECTION_IDS } from "@/lib/constants";
import { ICONS } from "@/lib/icons";

export function Reach() {
  const t = useTranslations("reach");

  return (
    <Section id={SECTION_IDS.reach}>
      <Container>
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-16">
          <SectionHeading title={t("title")} subtitle={t("subtitle")} />

          {/* Kart ve satır ayraçları kaldırıldı: dört kanal bir liste değil,
              eşdeğer dört ifade. Boşluk yeterli ayrımı zaten yapıyor ve bu,
              bölümün envanter ızgarasına benzemesini engelliyor. */}
          <div className="grid gap-x-8 gap-y-9 sm:grid-cols-2">
            {CHANNELS.map((c, i) => {
              const Icon = ICONS[c.icon];
              return (
                <Reveal key={c.key} delay={i * 0.07}>
                  <div className="flex flex-col gap-3">
                    <IconChip size="sm">
                      <Icon />
                    </IconChip>
                    <h3 className="text-base font-semibold tracking-tight text-foreground">
                      {t(`channels.${c.key}.title`)}
                    </h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {t(`channels.${c.key}.desc`)}
                    </p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </Container>
    </Section>
  );
}
