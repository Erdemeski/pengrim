import { useTranslations } from "next-intl";
import { Mail, Phone } from "lucide-react";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { SectionHeading } from "@/components/layout/section-heading";
import { ContactForm } from "./contact-form";
import { SECTION_IDS } from "@/lib/constants";

export function Contact() {
  const t = useTranslations("contact");
  const tf = useTranslations("footer");
  const email = tf("email");
  const phone = tf("phone");

  return (
    <Section
      id={SECTION_IDS.contact}
      className="border-t border-border/40 bg-muted/40"
    >
      <Container>
        <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <div className="flex flex-col gap-7 lg:sticky lg:top-28 lg:self-start">
            <SectionHeading
              eyebrow={t("eyebrow")}
              title={t("title")}
              subtitle={t("subtitle")}
            />
            <div className="flex flex-col gap-3">
              <a
                href={`mailto:${email}`}
                className="inline-flex items-center gap-3 text-sm text-foreground/85 transition-colors hover:text-led"
              >
                <span className="grid size-9 place-items-center rounded-lg bg-led/10 text-led">
                  <Mail className="size-4" />
                </span>
                {email}
              </a>
              <a
                href={`tel:${phone.replace(/[^+\d]/g, "")}`}
                className="inline-flex items-center gap-3 text-sm text-foreground/85 transition-colors hover:text-led"
              >
                <span className="grid size-9 place-items-center rounded-lg bg-led/10 text-led">
                  <Phone className="size-4" />
                </span>
                {phone}
              </a>
            </div>
          </div>

          <ContactForm />
        </div>
      </Container>
    </Section>
  );
}
