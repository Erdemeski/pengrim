import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // Kendi VM'inde `node .next/standalone/server.js` ile çalışması için
  output: "standalone",
  allowedDevOrigins: ["192.168.68.106", "10.12.5.238"],
  images: {
    formats: ["image/avif", "image/webp"],
  },
};

export default withNextIntl(nextConfig);
