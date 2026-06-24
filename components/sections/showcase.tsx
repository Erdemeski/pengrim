import { useTranslations } from "next-intl";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { SectionHeading } from "@/components/layout/section-heading";
import { BroadcastFrame } from "./broadcast-frame";
import { SECTION_IDS } from "@/lib/constants";
import CardSwap, { Card } from "@/components/CardSwap";

const FRAMES = [
  { key: "a", kind: "led" },
  { key: "b", kind: "backboard" },
  { key: "c", kind: "overlay" },
] as const;

export function Showcase() {
  const t = useTranslations("showcase");

  return (
    <Section id={SECTION_IDS.showcase} className="overflow-hidden">
      <Container>
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
          <SectionHeading
            eyebrow={t("eyebrow")}
            title={t("title")}
            subtitle={t("subtitle")}
          />

          <div className="relative h-[400px] sm:h-[480px]">
            <CardSwap
              width={380}
              height={300}
              delay={3200}
              pauseOnHover
              cardDistance={50}
              verticalDistance={58}
              skewAmount={5}
            >
              {FRAMES.map((f) => (
                <Card key={f.key} customClass="overflow-hidden">
                  <BroadcastFrame kind={f.kind} />
                  <div className="bg-black/65 p-3.5">
                    <h3 className="font-display text-sm font-bold uppercase tracking-tight text-floodlight">
                      {t(`items.${f.key}.title`)}
                    </h3>
                    <p className="mt-0.5 text-xs text-white/60">
                      {t(`items.${f.key}.desc`)}
                    </p>
                  </div>
                </Card>
              ))}
            </CardSwap>
          </div>
        </div>
      </Container>
    </Section>
  );
}
