import { useTranslations } from "next-intl";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { CountUp } from "@/components/effects/count-up";
import { Reveal } from "@/components/effects/reveal";
import { STATS } from "@/lib/constants";

export function TrustStats() {
  const t = useTranslations("trust");

  return (
    <Section className="py-12 sm:py-16">
      <Container>
        {/* Kart yok: yükseklik burada gerçek bir hiyerarşi taşımıyordu, dört
            kutu yalnızca aşağıdaki envanter ızgarasını tekrar ediyordu.
            Rakamlar ince ayraçlarla, boşlukla nefes alıyor. */}
        <div className="grid grid-cols-2 gap-y-8 sm:gap-y-10 md:grid-cols-4 md:divide-x md:divide-border/50">
          {STATS.map((s, i) => (
            <Reveal key={s.key} delay={i * 0.06}>
              <div className="flex flex-col items-center gap-1.5 px-4 text-center">
                <span className="font-display text-4xl font-extrabold tracking-tight tabular-nums text-foreground sm:text-5xl">
                  <CountUp value={s.value} suffix={s.suffix} />
                </span>
                <span className="text-sm text-muted-foreground">
                  {t(`stats.${s.key}`)}
                </span>
              </div>
            </Reveal>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          {t("note")}
        </p>
      </Container>
    </Section>
  );
}
