import fs from "node:fs";
import path from "node:path";
import { useTranslations } from "next-intl";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { SectionHeading } from "@/components/layout/section-heading";
import { ShowcaseGallery, type GalleryItem } from "./showcase-gallery";
import { SECTION_IDS } from "@/lib/constants";

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);
// Karo yükseklikleri: gerçek en-boy okumaya gerek yok (bg-cover kırpar),
// çeşitlilik için dönüşümlü bir set.
const HEIGHTS = [460, 600, 360, 520, 640, 400, 560, 440];

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

function placeholderDataUri(i: number, height: number): string {
  const [c1, c2] = PLACEHOLDER_PAIRS[i % PLACEHOLDER_PAIRS.length];
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='${height}' viewBox='0 0 600 ${height}'>
    <defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
      <stop offset='0' stop-color='${c1}'/><stop offset='1' stop-color='${c2}'/>
    </linearGradient></defs>
    <rect width='600' height='${height}' fill='url(#g)'/>
    <circle cx='${120 + ((i * 90) % 360)}' cy='${height * 0.32}' r='${height * 0.4}' fill='#9bff7a' opacity='0.05'/>
    <rect x='0' y='0' width='600' height='${height}' fill='none' stroke='#ffffff' stroke-opacity='0.06' stroke-width='2'/>
    <text x='40' y='${height - 40}' font-family='monospace' font-size='22' letter-spacing='6' fill='#ffffff' fill-opacity='0.14'>PENGRIM</text>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function Showcase() {
  const t = useTranslations("showcase");
  const files = readShowcaseImages();
  const hasImages = files.length > 0;

  const items: GalleryItem[] = hasImages
    ? files.map((f, i) => ({
        id: f,
        img: `/showcase/${f}`,
        height: HEIGHTS[i % HEIGHTS.length],
      }))
    : Array.from({ length: 8 }).map((_, i) => ({
        id: `ph-${i}`,
        img: placeholderDataUri(i, HEIGHTS[i % HEIGHTS.length]),
        height: HEIGHTS[i % HEIGHTS.length],
      }));

  return (
    <Section id={SECTION_IDS.showcase} className="overflow-hidden">
      <Container>
        <SectionHeading
          eyebrow={t("eyebrow")}
          title={t("title")}
          subtitle={t("subtitle")}
        />

        <div className="mt-10 sm:mt-12">
          <ShowcaseGallery
            items={items}
            placeholder={!hasImages}
            placeholderLabel={t("placeholder")}
          />
        </div>
      </Container>
    </Section>
  );
}
