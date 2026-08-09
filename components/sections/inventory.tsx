import Image from "next/image";
import { useTranslations } from "next-intl";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { SectionHeading } from "@/components/layout/section-heading";
import { Reveal } from "@/components/effects/reveal";
import { IconChip } from "@/components/ui/icon-chip";
import { INVENTORY, SECTION_IDS } from "@/lib/constants";
import { ICONS } from "@/lib/icons";
import SpotlightCard from "@/components/SpotlightCard";

/**
 * Bento yerleşimi: 4 içerik → tam 4 hücre, boş hücre yok. Geniş hücre satır
 * değiştirirken taraf değiştiriyor (7/5 → 5/7) — bu, bir üstteki istatistik
 * bandının ve bir alttaki adım listesinin eşit-kutu ritmini kırıyor.
 * İki hücre markanın kendi çekiminden gerçek görsel taşıyor.
 */
const CELLS: Record<string, { span: string; image?: string }> = {
  led: { span: "lg:col-span-7", image: "/inventory-led.webp" },
  static: { span: "lg:col-span-5" },
  broadcast: { span: "lg:col-span-5" },
  package: { span: "lg:col-span-7", image: "/inventory-package.webp" },
};

export function Inventory() {
  const t = useTranslations("inventory");

  return (
    <Section id={SECTION_IDS.inventory}>
      <Container>
        <SectionHeading title={t("title")} subtitle={t("subtitle")} />

        <div className="mt-12 grid gap-4 lg:grid-cols-12">
          {INVENTORY.map((item, i) => {
            const Icon = ICONS[item.icon];
            const cell = CELLS[item.key];
            const title = t(`items.${item.key}.title`);
            const desc = t(`items.${item.key}.desc`);

            return (
              <Reveal
                key={item.key}
                delay={i * 0.08}
                className={cell.span}
              >
                {cell.image ? (
                  <article className="group relative flex h-full min-h-76 flex-col justify-end overflow-hidden rounded-2xl border border-border/60">
                    <Image
                      src={cell.image}
                      alt=""
                      fill
                      sizes="(max-width: 1024px) 100vw, 58vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                    />
                    {/* metin kontrastı için scrim — görsel içeriğinden bağımsız */}
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 bg-linear-to-t from-background via-background/80 to-background/10"
                    />
                    <div className="relative flex flex-col gap-3 p-6 sm:p-7">
                      <IconChip>
                        <Icon />
                      </IconChip>
                      <h3 className="text-lg font-semibold tracking-tight text-foreground">
                        {title}
                      </h3>
                      <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
                        {desc}
                      </p>
                    </div>
                  </article>
                ) : (
                  <SpotlightCard
                    spotlightColor="rgba(130, 230, 150, 0.16)"
                    className="flex h-full min-h-76 flex-col justify-end gap-3 p-6 sm:p-7"
                  >
                    <IconChip>
                      <Icon />
                    </IconChip>
                    <h3 className="text-lg font-semibold tracking-tight text-foreground">
                      {title}
                    </h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {desc}
                    </p>
                  </SpotlightCard>
                )}
              </Reveal>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}
