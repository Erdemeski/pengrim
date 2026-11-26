import { useTranslations } from "next-intl";
import { Container } from "@/components/layout/container";
import { Logo } from "@/components/layout/logo";
import { AnchorLink } from "@/components/layout/anchor-link";
import { NAV_ITEMS, SECTION_IDS } from "@/lib/constants";
import { PitchMarkings } from "./pitch-markings";
import { FooterAurora } from "./footer-aurora";

/**
 * İletişim = sitenin footer'ı.
 *
 * Eskiden ayrı bir iletişim kartı ve altında aynı e-posta/telefon/adresi
 * tekrar eden bir footer vardı. Artık tek bölüm: üstte orta saha çizgisi
 * Vitrin duvarının alt kenarına oturur (bkz. PitchMarkings), e-posta adresi
 * bölümün asıl öğesi olarak büyük display tipte durur, altta tek satırlık
 * künye.
 */
export function Contact() {
  const t = useTranslations("contact");
  const tn = useTranslations("nav");
  const tf = useTranslations("footer");
  const email = tf("email");
  const phone = tf("phone");
  const address = tf("address");
  const telHref = `tel:${phone.replace(/[^+\d]/g, "")}`;
  const year = new Date().getFullYear();

  return (
    <footer
      id={SECTION_IDS.contact}
      className="relative isolate scroll-mt-24 overflow-hidden"
    >
      <PitchMarkings />

      <Container className="relative pt-24 pb-16 sm:pt-32 sm:pb-20 md:pt-40">
        <h2 className="max-w-3xl text-balance font-display text-4xl font-extrabold leading-[1.02] tracking-tight sm:text-5xl md:text-6xl">
          {t("title")}
        </h2>
        <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
          {t("subtitle")}
        </p>

        {/* Bölümün asıl öğesi: e-posta adresinin kendisi */}
        <a
          href={`mailto:${email}`}
          className="group relative mt-12 inline-block max-w-full break-words font-display text-[clamp(2rem,8.5vw,6rem)] font-extrabold leading-[1.05] tracking-tight text-foreground outline-none transition-colors hover:text-led focus-visible:text-led sm:mt-16"
        >
          {email}
          <span
            aria-hidden="true"
            className="absolute inset-x-0 -bottom-1 h-[3px] origin-left scale-x-0 bg-led transition-transform duration-300 ease-out group-hover:scale-x-100 group-focus-visible:scale-x-100"
          />
        </a>

        <dl className="mt-10 grid gap-6 sm:mt-12 sm:grid-cols-2 sm:gap-10 md:max-w-2xl">
          <div className="flex flex-col gap-1.5">
            <dt className="text-sm text-muted-foreground">{t("phoneLabel")}</dt>
            <dd>
              <a
                href={telHref}
                className="inline-flex min-h-11 items-center text-xl font-semibold tracking-tight text-foreground transition-colors hover:text-led sm:text-2xl"
              >
                {phone}
              </a>
            </dd>
          </div>
          <div className="flex flex-col gap-1.5">
            <dt className="text-sm text-muted-foreground">{t("addressLabel")}</dt>
            <dd className="inline-flex min-h-11 items-center text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              {address}
            </dd>
          </div>
        </dl>
      </Container>

      {/* Sayfanın en alt kenarından yükselen aurora (künyenin arkasında) */}
      <FooterAurora />

      {/* Künye. Alt boşluk, sayfa altındaki sabit GradualBlur şeridinin
          (3.5rem) bu satırı bulandırmaması için. */}
      <div className="relative border-t border-border/60">
        <Container className="flex flex-col gap-6 pt-8 pb-20 md:flex-row md:items-center md:justify-between md:gap-10">
          <Logo />
          <nav aria-label={tf("navTitle")}>
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              {NAV_ITEMS.filter((i) => i.key !== "contact").map((i) => (
                <li key={i.key}>
                  <AnchorLink
                    href={i.href}
                    className="inline-flex min-h-11 items-center text-sm text-foreground/80 transition-colors hover:text-led"
                  >
                    {tn(i.key)}
                  </AnchorLink>
                </li>
              ))}
            </ul>
          </nav>
          <p className="text-sm text-muted-foreground">
            © {year} Pengrim. {tf("rights")}
          </p>
        </Container>
      </div>
    </footer>
  );
}
