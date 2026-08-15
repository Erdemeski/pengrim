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
import { FirstVisitGate } from "@/components/layout/first-visit-gate";
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

/**
 * Modül sabiti: satır içi nesne literali her render'da yeni referans üretip
 * hem `React.memo(GradualBlur)`'ü hem de bileşenin içindeki
 * `useMemo(..., [props])`'u etkisiz kılıyordu.
 *
 * z-index style ile veriliyor: bileşen target="page" iken zIndex prop'una +100
 * ekleyip 1100'e çıkarıyor ve header (z-50) ile lightbox'ın (z-60+) üstünde
 * kalıyordu. style, containerStyle'da zIndex'ten sonra spread edildiği için
 * kazanır.
 */
const PAGE_BLUR_STYLE = { zIndex: 30 } as const;

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
      <head>
        {/*
          Sayfa HER yenilemede en üstten başlasın.

          Bilerek bir React effect'i DEĞİL, HTML ayrıştırılırken senkron çalışan
          bir inline script (bkz. next docs → guides/preventing-flash-before-hydration):
            1. Tarayıcının scroll geri-yüklemesi hydration'dan önce başlıyor.
               Effect'e bırakıldığında geri-yükleme bazen bizim scrollTo(0,0)'ımızdan
               sonra tamamlanıp onu eziyor — özellikle belge yüksekliği geç
               oturduğunda.
            2. Effect'e bağlı sürüm, ağaçtaki herhangi bir istemci bileşeni hata
               verdiğinde sessizce devre dışı kalıyordu; bu script her koşulda çalışır.

          Pinlenen hero yalnızca en üstten başlarken doğru ölçüldüğü için kritik.
          `SmoothScroll` içindeki eşdeğer effect ikinci savunma hattı olarak
          duruyor — o ayrıca Lenis'in sanal scroll konumunu da sıfırlıyor.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if('scrollRestoration' in history)history.scrollRestoration='manual';window.scrollTo(0,0)}catch(e){}})()`,
          }}
        />
      </head>
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
                  pointer-events: none olduğundan altındaki form alanları ve
                  bağlantılar tıklanabilir kalır. */}
              <GradualBlur
                target="page"
                position="bottom"
                height="3.5rem"
                strength={2.5}
                divCount={5}
                curve="bezier"
                exponential
                opacity={1}
                style={PAGE_BLUR_STYLE}
              />
              {/* İlk ziyaret kapısı — hero kareleri 400 ms'de hazırsa hiç
                  render edilmez. Lenis'e erişebilmesi için SmoothScroll'un
                  içinde. */}
              <FirstVisitGate />
            </SmoothScroll>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
