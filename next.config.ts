import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/**
 * `public/` altındaki dosya adları içerik-hash'li değil, bu yüzden Next onları
 * immutable işaretlemiyor (dokümanda belirtildiği gibi bunu yalnızca adında
 * SHA taşıyan varlıklar için kendisi yapıyor). Sonuç: her tekrar ziyarette
 * ~193 hero karesi Cloudflare tüneli üzerinden revalidate ediliyordu.
 * `headers()` dosya sisteminden ÖNCE değerlendirildiği için `/public` dosyaları
 * da kapsanıyor (bkz. next docs → config/headers.md).
 *
 * KISIT: `immutable` verilen bir yol aynı adla yeniden kodlanamaz. Kareler
 * yeniden üretilirse yeni bir dizin altında yayınlanmalı (/hero-frames-v2/…).
 */
const IMMUTABLE = [
  { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
];

const nextConfig: NextConfig = {
  // Kendi VM'inde `node .next/standalone/server.js` ile çalışması için
  output: "standalone",
  async headers() {
    return [
      { source: "/hero-frames/:path*", headers: IMMUTABLE },
      { source: "/hero-frames-portrait/:path*", headers: IMMUTABLE },
      { source: "/pengrim-first-frame-edited.webp", headers: IMMUTABLE },
      { source: "/pengrim_beyaz.png", headers: IMMUTABLE },
      { source: "/pengrim_siyah.png", headers: IMMUTABLE },
      { source: "/ball-768.png", headers: IMMUTABLE },
      { source: "/ball-768-green.webp", headers: IMMUTABLE },
      { source: "/inventory-:name.webp", headers: IMMUTABLE },
    ];
  },
  allowedDevOrigins: ["192.168.68.106", "10.12.5.238"],
  images: {
    formats: ["image/avif", "image/webp"],
    // 85: tam ekrana açılan envanter görseli zaten kayıplı bir WebP'den geliyor;
    // varsayılan 75 ile ikinci sıkıştırma turunda gökyüzü bantlanıyor.
    qualities: [75, 85],
  },
};

export default withNextIntl(nextConfig);
