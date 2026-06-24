import { useTranslations } from "next-intl";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { CountUp } from "@/components/effects/count-up";
import { Reveal } from "@/components/effects/reveal";
import { LeaguesLoop } from "./leagues-loop";
import { STATS } from "@/lib/constants";
import SpotlightCard from "@/components/SpotlightCard";

export function TrustStats() {
  const t = useTranslations("trust");

  return (
    <Section className="py-12 sm:py-16">
      <Container>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          {STATS.map((s, i) => (
            <Reveal key={s.key} delay={i * 0.06}>
              <SpotlightCard
                spotlightColor="rgba(130, 230, 150, 0.18)"
                className="flex h-full flex-col items-center gap-1.5 p-6 text-center sm:p-7"
              >
                <span className="bg-gradient-to-br from-foreground via-foreground to-led bg-clip-text font-display text-4xl font-extrabold tracking-tight text-transparent tabular-nums sm:text-5xl">
                  <CountUp value={s.value} suffix={s.suffix} />
                </span>
                <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  {t(`stats.${s.key}`)}
                </span>
              </SpotlightCard>
            </Reveal>
          ))}
        </div>

        <p className="mt-4 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/55">
          {t("note")}
        </p>

        <div className="mt-10 border-y border-border/50 py-5">
          <LeaguesLoop />
        </div>
      </Container>
    </Section>
  );
}
