import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["tr", "en"],
  defaultLocale: "tr",
  localePrefix: "always",
  // Herkes Türkçe ile başlar: tarayıcı dili (Accept-Language) ve çerez
  // yönlendirmesi kapalı. İngilizce yalnız dil seçiciyle (/en) açılır.
  localeDetection: false,
});

export type Locale = (typeof routing.locales)[number];
