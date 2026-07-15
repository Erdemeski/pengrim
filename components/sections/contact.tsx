import { useTranslations } from "next-intl";
import { Mail, Phone, MapPin, ArrowUpRight } from "lucide-react";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { SectionHeading } from "@/components/layout/section-heading";
import { GlassCard } from "@/components/effects/glass-card";
import { SECTION_IDS } from "@/lib/constants";

export function Contact() {
  const t = useTranslations("contact");
  const tf = useTranslations("footer");
  const email = tf("email");
  const phone = tf("phone");
  const address = tf("address");
  const telHref = `tel:${phone.replace(/[^+\d]/g, "")}`;

  return (
    <Section
      id={SECTION_IDS.contact}
      className="border-t border-border/40 bg-muted/40"
    >
      <Container>
        <GlassCard
          strong
          className="relative overflow-hidden p-7 sm:p-10 md:p-14"
        >
          {/* saha kenarı LED parıltısı — köşede kısıtlı aksan */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-24 size-64 rounded-full bg-led/10 blur-3xl"
          />

          <div className="relative grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-16">
            <div className="flex flex-col gap-6">
              <SectionHeading
                eyebrow={t("eyebrow")}
                title={t("title")}
                subtitle={t("subtitle")}
              />
              {/*               <p className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-led opacity-60" />
                  <span className="relative inline-flex size-2 rounded-full bg-led" />
                </span>
                {t("responseNote")}
              </p>
 */}
            </div>

            <div className="flex flex-col gap-3">
              <a
                href={`mailto:${email}`}
                className="group flex items-center gap-4 rounded-2xl border border-border/60 bg-card/50 p-5 transition-all hover:border-led/50 hover:bg-card/80"
              >
                <span className="grid size-12 shrink-0 place-items-center rounded-xl border border-led/20 bg-led/10 text-led transition-colors group-hover:bg-led/20">
                  <Mail className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                    {t("emailLabel")}
                  </span>
                  <span className="block truncate font-display text-lg font-bold tracking-tight text-foreground">
                    {email}
                  </span>
                </span>
                <ArrowUpRight className="size-5 shrink-0 text-muted-foreground transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-led" />
              </a>

              <a
                href={telHref}
                className="group flex items-center gap-4 rounded-2xl border border-border/60 bg-card/50 p-5 transition-all hover:border-led/50 hover:bg-card/80"
              >
                <span className="grid size-12 shrink-0 place-items-center rounded-xl border border-led/20 bg-led/10 text-led transition-colors group-hover:bg-led/20">
                  <Phone className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                    {t("phoneLabel")}
                  </span>
                  <span className="block truncate font-display text-lg font-bold tracking-tight text-foreground">
                    {phone}
                  </span>
                </span>
                <ArrowUpRight className="size-5 shrink-0 text-muted-foreground transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-led" />
              </a>

              <div className="flex items-center gap-4 rounded-2xl border border-border/40 bg-card/30 p-5">
                <span className="grid size-12 shrink-0 place-items-center rounded-xl border border-border/50 bg-background/40 text-muted-foreground">
                  <MapPin className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                    {t("addressLabel")}
                  </span>
                  <span className="block truncate font-display text-lg font-bold tracking-tight text-foreground">
                    {address}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </GlassCard>
      </Container>
    </Section>
  );
}
