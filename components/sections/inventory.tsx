import Image from "next/image";
import { useTranslations } from "next-intl";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { SectionHeading } from "@/components/layout/section-heading";
import { Reveal } from "@/components/effects/reveal";
import { INVENTORY, SECTION_IDS } from "@/lib/constants";
import ScrollExpandCard from "@/components/ScrollExpandCard";
import { BroadcastFrame, StadiumPlan } from "./inventory-art";

/**
 * Bento yerleşimi: 4 içerik → tam 4 hücre. Geniş hücre satır değiştirirken
 * taraf değiştiriyor (7/5 → 5/7).
 *
 * Mobil (tek sütun) sırası: LED, Statik, Paket, Yayın — görselli ve çizimli
 * kartlar dönüşümlü gelsin. DOM sırası DEĞİŞMİYOR (yalnız `order`):
 * ScrollExpandCard dinlenme yüksekliğini önceki kardeşten ölçüyor.
 *
 * Kartlarda jenerik ikon çipi yok. Görselli kartlarda metin, fotoğrafın
 * altındaki opak bir yayın alt bandında (lower third) duruyor — fotoğraftaki
 * panolarla çakışıp okunmaz hale gelmiyor. Metin kartlarının görseli
 * anlattıkları şeyin kendisi (saha planı, yayın kadrajı).
 */
const CELLS: Record<string, { span: string; order: string; image?: string }> = {
  led: { span: "lg:col-span-7", order: "max-lg:order-1", image: "/inventory-led-board.webp" },
  static: { span: "lg:col-span-5", order: "max-lg:order-2" },
  broadcast: { span: "lg:col-span-5", order: "max-lg:order-4" },
  package: { span: "lg:col-span-7", order: "max-lg:order-3", image: "/inventory-stadium.webp" },
};

export function Inventory() {
  const t = useTranslations("inventory");

  const art: Record<string, React.ReactNode> = {
    static: (
      <StadiumPlan
        className="max-w-[22rem]"
        labels={{
          goalBack: t("art.goalBack"),
          stands: t("art.stands"),
          tunnel: t("art.tunnel"),
        }}
      />
    ),
    broadcast: (
      <BroadcastFrame
        className="max-w-[22rem]"
        labels={{ live: t("art.live"), onScreen: t("art.onScreen") }}
      />
    ),
  };

  return (
    <Section id={SECTION_IDS.inventory}>
      <Container>
        <SectionHeading title={t("title")} subtitle={t("subtitle")} />

        <div className="mt-12 grid gap-4 lg:grid-cols-12">
          {INVENTORY.map((item, i) => {
            const cell = CELLS[item.key];
            const title = t(`items.${item.key}.title`);
            const desc = t(`items.${item.key}.desc`);

            return (
              <Reveal
                key={item.key}
                delay={i * 0.08}
                className={`${cell.span} ${cell.order}`}
              >
                {cell.image ? (
                  <article className="group flex h-full min-h-76 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card">
                    <div className="relative min-h-44 flex-1 overflow-hidden sm:min-h-52">
                      <Image
                        src={cell.image}
                        alt=""
                        fill
                        sizes="(max-width: 1024px) 100vw, 58vw"
                        className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                      />
                    </div>
                    {/* yayın alt bandı */}
                    <div className="relative border-t border-border/60 px-6 py-5 sm:px-7 sm:py-6">
                      <span
                        aria-hidden="true"
                        className="absolute inset-y-5 left-0 w-[3px] rounded-r-full bg-led sm:inset-y-6"
                      />
                      <h3 className="font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                        {title}
                      </h3>
                      <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-muted-foreground">
                        {desc}
                      </p>
                    </div>
                  </article>
                ) : (
                  <article className="flex h-full min-h-76 flex-col rounded-2xl border border-border/60 bg-card p-6 sm:p-7">
                    <div className="grid flex-1 place-items-center pb-6">
                      {art[item.key]}
                    </div>
                    <h3 className="font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                      {title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      {desc}
                    </p>
                  </article>
                )}
              </Reveal>
            );
          })}

          {/* Reveal ile sarılmaz: motion.div'in transform animasyonu tam da
              açılmanın başladığı anda tetikleniyor ve ölçümü kaydırıyor. */}
          <ScrollExpandCard
            className="lg:col-span-12 max-lg:order-5 -mb-12 sm:-mb-16 md:-mb-20"
            src="/inventory-feature.webp"
            icon={<></>}
            title={t("feature.title")}
            desc={t("feature.desc")}
            hint={t("feature.hint")}
            caption={t("feature.caption")}
            /* Kadrajı görseldeki futbol topuna hizalar ve konumunu
               BallJourney'e yayınlar. */
            ballAnchor
            /* Tam ekrana ulaşınca beklemeden sonraki bölüme geç: eski 0.28vh'lik
               sabit kalma, kaydırılsa da "takıldı" gibi görünüyordu. */
            holdRatio={0}
          />
        </div>
      </Container>
    </Section>
  );
}
