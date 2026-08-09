import { useTranslations } from "next-intl";
import { Mail, MapPin, Phone } from "lucide-react";
import { Container } from "./container";
import { Logo } from "./logo";
import { AnchorLink } from "./anchor-link";
import { NAV_ITEMS } from "@/lib/constants";

export function SiteFooter() {
  const tn = useTranslations("nav");
  const tf = useTranslations("footer");
  const year = new Date().getFullYear();
  const email = tf("email");
  const phone = tf("phone");

  return (
    <footer className="dark relative border-t border-border/60 bg-[oklch(0.128_0.012_172)] text-foreground">
      <Container className="py-14 sm:py-16">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1.1fr]">
          <div className="flex flex-col gap-4">
            <Logo />
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
              {tf("tagline")}
            </p>
          </div>

          <nav aria-label={tf("navTitle")}>
            <h3 className="text-sm font-semibold tracking-tight text-foreground">
              {tf("navTitle")}
            </h3>
            <ul className="mt-4 flex flex-col gap-2.5">
              {NAV_ITEMS.map((i) => (
                <li key={i.key}>
                  <AnchorLink
                    href={i.href}
                    className="text-sm text-foreground/80 transition-colors hover:text-led"
                  >
                    {tn(i.key)}
                  </AnchorLink>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h3 className="text-sm font-semibold tracking-tight text-foreground">
              {tf("contactTitle")}
            </h3>
            <ul className="mt-4 flex flex-col gap-3 text-sm">
              <li>
                <a
                  href={`mailto:${email}`}
                  className="inline-flex items-center gap-2.5 text-foreground/80 transition-colors hover:text-led"
                >
                  <Mail className="size-4 text-led" />
                  {email}
                </a>
              </li>
              <li>
                <a
                  href={`tel:${phone.replace(/[^+\d]/g, "")}`}
                  className="inline-flex items-center gap-2.5 text-foreground/80 transition-colors hover:text-led"
                >
                  <Phone className="size-4 text-led" />
                  {phone}
                </a>
              </li>
              <li className="inline-flex items-center gap-2.5 text-muted-foreground">
                <MapPin className="size-4 text-led" />
                {tf("address")}
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-border/60 pt-6 text-xs text-muted-foreground">
          <p>
            © {year} Pengrim. {tf("rights")}
          </p>
        </div>
      </Container>
    </footer>
  );
}
