import { useTranslations } from "next-intl";
import { Mail, Phone, MapPin, ArrowUpRight } from "lucide-react";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { SectionHeading } from "@/components/layout/section-heading";
import { GlassCard } from "@/components/effects/glass-card";
import { IconChip } from "@/components/ui/icon-chip";
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
            <SectionHeading
              eyebrow={t("eyebrow")}
              title={t("title")}
              subtitle={t("subtitle")}
            />

            <div className="flex flex-col gap-3">
              <a
                href={`mailto:${email}`}
                className="group flex items-center gap-4 rounded-2xl border border-border/60 bg-card/50 p-5 transition-all hover:border-led/50 hover:bg-card/80"
              >
                <IconChip className="group-hover:bg-led/20">
                  <Mail />
                </IconChip>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs text-muted-foreground">
                    {t("emailLabel")}
                  </span>
                  <span className="block truncate text-lg font-semibold tracking-tight text-foreground">
                    {email}
                  </span>
                </span>
                <ArrowUpRight className="size-5 shrink-0 text-muted-foreground transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-led" />
              </a>

              <a
                href={telHref}
                className="group flex items-center gap-4 rounded-2xl border border-border/60 bg-card/50 p-5 transition-all hover:border-led/50 hover:bg-card/80"
              >
                <IconChip className="group-hover:bg-led/20">
                  <Phone />
                </IconChip>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs text-muted-foreground">
                    {t("phoneLabel")}
                  </span>
                  <span className="block truncate text-lg font-semibold tracking-tight text-foreground">
                    {phone}
                  </span>
                </span>
                <ArrowUpRight className="size-5 shrink-0 text-muted-foreground transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-led" />
              </a>

              <div className="flex items-center gap-4 rounded-2xl border border-border/40 bg-card/30 p-5">
                <IconChip tone="muted">
                  <MapPin />
                </IconChip>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs text-muted-foreground">
                    {t("addressLabel")}
                  </span>
                  <span className="block truncate text-lg font-semibold tracking-tight text-foreground">
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
