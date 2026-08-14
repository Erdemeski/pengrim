import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Archivo, Inter, JetBrains_Mono } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";
import { routing } from "@/i18n/routing";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { SmoothScroll } from "@/components/layout/smooth-scroll";
import GradualBlur from "@/components/GradualBlur";
import "../globals.css";

// latin-ext zorunlu: varsayılan dil Türkçe ve ı ğ ş İ ç ö ü yalnız bu alt
// kümede. Eksik olduğunda bu harfler fallback fontun metrikleriyle çizilip
// satır içinde göze çarpan bir karışıklık yaratıyordu.
const display = Archivo({
  subsets: ["latin", "latin-ext"],
  variable: "--font-display",
  display: "swap",
});
const sans = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
  display: "swap",
});
const mono = JetBrains_Mono({
  subsets: ["latin", "latin-ext"],
  variable: "--font-mono",
  display: "swap",
});

type LocaleParams = { params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: LocaleParams): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    title: t("title"),
    description: t("description"),
    icons: {
      icon: "/pengrim-icon.png",
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleParams & { children: React.ReactNode }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${display.variable} ${sans.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh antialiased" suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <NextIntlClientProvider messages={messages}>
            <SmoothScroll>
              {children}
              {/* Pencere alt kenarında kalıcı yumuşak geçiş.
                  z-index style ile veriliyor: bileşen target="page" iken
                  zIndex prop'una +100 ekleyip 1100'e çıkarıyor ve header
                  (z-50), Sheet ile lightbox'ın (z-60+) üstünde kalıyordu.
                  style, containerStyle'da zIndex'ten sonra spread edildiği
                  için kazanır. pointer-events: none olduğundan altındaki
                  form alanları ve bağlantılar tıklanabilir kalır. */}
              <GradualBlur
                target="page"
                position="bottom"
                height="3.5rem"
                strength={2.5}
                divCount={5}
                curve="bezier"
                exponential
                opacity={1}
                style={{ zIndex: 30 }}
              />
            </SmoothScroll>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
