import { useTranslations } from "next-intl";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { CountUp } from "@/components/effects/count-up";
import { Reveal } from "@/components/effects/reveal";
import { STATS } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Rakamlar stadyum skorbordunda.
 *
 * Hero'nun LED çevre panosu şeridiyle aynı malzeme: koyu pano yüzeyi,
 * dot-matrix dokusu ve üzerinden geçen yayın parıltısı. Rakamların kendisi
 * de LED noktalarından oluşuyor (nokta maskesi) — pano her temada koyu,
 * çünkü gerçek bir LED ekran da öyle.
 *
 * Hücreler ince noktalı ayraçlarla bölünür: mobilde 2×2, masaüstünde 4 sütun.
 */
const DOT_MASK =
  "[mask-image:radial-gradient(circle,#000_58%,transparent_64%)] [mask-size:0.25rem_0.25rem] [-webkit-mask-image:radial-gradient(circle,#000_58%,transparent_64%)] [-webkit-mask-size:0.25rem_0.25rem]";

export function TrustStats() {
  const t = useTranslations("trust");

  return (
    <Section className="-mb-10 py-12 sm:py-16">
      <Container>
        <Reveal>
          <div className="dark relative isolate overflow-hidden rounded-2xl border border-white/10 bg-[oklch(0.115_0.02_171)] shadow-[inset_0_2px_12px_rgba(0,0,0,0.65),0_30px_60px_-34px_rgba(0,0,0,0.8)]">
            {/* LED dot-matrix dokusu */}
            <div
              aria-hidden="true"
              className="led-grid pointer-events-none absolute inset-0 opacity-20 mix-blend-screen"
            />
            {/* üst cam parlaması */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-linear-to-b from-white/[0.06] to-transparent"
            />

            <dl className="relative grid grid-cols-2 md:grid-cols-4">
              {STATS.map((s, i) => (
                <div
                  key={s.key}
                  className={cn(
                    "flex flex-col-reverse items-center gap-2 px-3 py-8 text-center sm:py-11",
                    // noktalı ayraçlar
                    i % 2 === 1 && "border-l border-dashed border-white/12",
                    i >= 2 && "border-t border-dashed border-white/12 md:border-t-0",
                    i === 2 && "md:border-l",
                  )}
                >
                  <dt className="text-sm text-white/65">{t(`stats.${s.key}`)}</dt>
                  <dd
                    className={cn(
                      "font-display text-5xl font-extrabold leading-none tracking-tight tabular-nums text-floodlight sm:text-6xl lg:text-7xl",
                      // parıltı maskenin DIŞINDA (dd'de), noktalar içte (span'de);
                      // aksi halde maske parıltıyı da kırpardı
                      "[filter:drop-shadow(0_0_14px_color-mix(in_oklch,var(--brand-led)_55%,transparent))]",
                    )}
                  >
                    <CountUp value={s.value} suffix={s.suffix} className={cn("inline-block", DOT_MASK)} />
                  </dd>
                </div>
              ))}
            </dl>

            {/* yayın parıltısı — LED şeridindekiyle aynı */}
            <div
              aria-hidden="true"
              className="animate-shine pointer-events-none absolute inset-y-0 w-1/5 [transform:skewX(-18deg)] bg-linear-to-r from-transparent via-white/10 to-transparent"
            />
          </div>
        </Reveal>
      </Container>
    </Section>
  );
}
