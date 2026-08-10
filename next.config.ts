import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // Kendi VM'inde `node .next/standalone/server.js` ile çalışması için
  output: "standalone",
  allowedDevOrigins: ["192.168.68.106", "10.12.5.238"],
  images: {
    formats: ["image/avif", "image/webp"],
    // 85: tam ekrana açılan envanter görseli zaten kayıplı bir WebP'den geliyor;
    // varsayılan 75 ile ikinci sıkıştırma turunda gökyüzü bantlanıyor.
    qualities: [75, 85],
  },
};

export default withNextIntl(nextConfig);
