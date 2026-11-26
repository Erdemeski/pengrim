import type { IconName } from "./icons";

/** Bölüm anchor id'leri (header navigasyonu ve smooth-scroll bunları kullanır). */
export const SECTION_IDS = {
  hero: "hero",
  inventory: "envanter",
  how: "is-akisi",
  reach: "neden-futbol",
  showcase: "vitrin",
  contact: "iletisim",
} as const;

export const NAV_ITEMS = [
  { key: "inventory", href: `#${SECTION_IDS.inventory}` },
  { key: "how", href: `#${SECTION_IDS.how}` },
  { key: "reach", href: `#${SECTION_IDS.reach}` },
  { key: "showcase", href: `#${SECTION_IDS.showcase}` },
  { key: "contact", href: `#${SECTION_IDS.contact}` },
] as const;

/** TrustStats — sayılar evrensel, etiketler messages'tan gelir. */
export const STATS: ReadonlyArray<{
  key: string;
  value: number;
  suffix: string;
  decimals?: number;
}> = [
  { key: "reach", value: 30, suffix: "+" },
  { key: "matches", value: 500, suffix: "+" },
  { key: "teams", value: 25, suffix: "+" },
  { key: "brands", value: 450, suffix: "+" },
];

export const INVENTORY: ReadonlyArray<{ key: string; icon: IconName }> = [
  { key: "led", icon: "MonitorPlay" },
  { key: "static", icon: "Megaphone" },
  { key: "broadcast", icon: "Radio" },
  { key: "package", icon: "Layers" },
];

/** İş akışı — maç saati metaforu (KO/1H/2H/FT). */
export const STEPS: ReadonlyArray<{ key: string; clock: string; icon: IconName }> =
  [
    { key: "select", clock: "KO", icon: "CalendarSearch" },
    { key: "package", clock: "1H", icon: "LayoutGrid" },
    { key: "approve", clock: "2H", icon: "BadgeCheck" },
    { key: "report", clock: "FT", icon: "ChartColumnBig" },
  ];

export const CHANNELS: ReadonlyArray<{ key: string; icon: IconName }> = [
  { key: "tv", icon: "Tv" },
  { key: "ott", icon: "MonitorSmartphone" },
  { key: "social", icon: "Share2" },
  { key: "stadium", icon: "Users" },
];


/** Kanonik alan adı — metadata, robots ve sitemap buradan türetilir. */
export const SITE_URL = "https://pengrim.com";
