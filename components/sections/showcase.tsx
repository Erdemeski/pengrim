import fs from "node:fs";
import path from "node:path";
import { useTranslations } from "next-intl";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { ShowcaseWall, type ShowcaseImage } from "./showcase-wall";
import { SECTION_IDS } from "@/lib/constants";

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);

/** public/showcase içindeki görselleri okur (build/SSG anında). Klasör yoksa/boşsa [] döner. */
function readShowcaseImages(): string[] {
  try {
    const dir = path.join(process.cwd(), "public", "showcase");
    return fs
      .readdirSync(dir)
      .filter((f) => IMAGE_EXT.has(path.extname(f).toLowerCase()))
      .sort();
  } catch {
    return [];
  }
}

// Gerçek görsel yokken gösterilecek on-brand nötr placeholder karoları.
// Harici istek olmaması için gradient SVG data-URI (CSP-güvenli).
const PLACEHOLDER_PAIRS = [
  ["#0e1512", "#182420"],
  ["#111a16", "#0b1310"],
  ["#13201a", "#0e1713"],
  ["#0d1411", "#1a2620"],
];

// Karolar 16:9 olduğundan placeholder da sabit oranda üretilir.
const PH_W = 640;
const PH_H = 360;

function placeholderDataUri(i: number): string {
  const [c1, c2] = PLACEHOLDER_PAIRS[i % PLACEHOLDER_PAIRS.length];
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${PH_W}' height='${PH_H}' viewBox='0 0 ${PH_W} ${PH_H}'>
    <defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
      <stop offset='0' stop-color='${c1}'/><stop offset='1' stop-color='${c2}'/>
    </linearGradient></defs>
    <rect width='${PH_W}' height='${PH_H}' fill='url(#g)'/>
    <circle cx='${120 + ((i * 90) % 380)}' cy='${PH_H * 0.32}' r='${PH_H * 0.4}' fill='#9bff7a' opacity='0.05'/>
    <rect x='0' y='0' width='${PH_W}' height='${PH_H}' fill='none' stroke='#ffffff' stroke-opacity='0.06' stroke-width='2'/>
    <text x='40' y='${PH_H - 36}' font-family='monospace' font-size='22' letter-spacing='6' fill='#ffffff' fill-opacity='0.14'>PENGRIM</text>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function Showcase() {
  const t = useTranslations("showcase");
  const files = readShowcaseImages();
  const hasImages = files.length > 0;

  // alt metni dosya adından değil çeviriden gelir — "Screenshot_5.png" ekran
  // okuyucu için değersiz.
  const items: ShowcaseImage[] = hasImages
    ? files.map((f, i) => ({
        id: f,
        src: `/showcase/${f}`,
        alt: t("imageAlt", { n: i + 1 }),
      }))
    : Array.from({ length: 8 }).map((_, i) => ({
        id: `ph-${i}`,
        src: placeholderDataUri(i),
        alt: t("imageAlt", { n: i + 1 }),
      }));

  return (
    <Section id={SECTION_IDS.showcase} className="overflow-hidden">
      {!hasImages ? (
        <Container>
          <span className="mb-8 inline-flex w-fit items-center gap-2 rounded-full border border-border/60 bg-card/50 px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            <span className="size-1.5 rounded-full bg-led shadow-[0_0_10px_var(--brand-led)]" />
            {t("placeholder")}
          </span>
        </Container>
      ) : null}

      {/* Duvar Container dışında: sağ/sol kenarı pencereye dayanmalı.
          Görsel varken bölümün üst boşluğu da yutulur — üst kenar zaten
          gradyanla açıldığı için duvar bütün bandı kaplar. */}
      <ShowcaseWall
        items={items}
        expandLabel={t("expand")}
        closeLabel={t("close")}
        className={hasImages ? "-mt-12 sm:-mt-16 md:-mt-20" : undefined}
      />
    </Section>
  );
}
