"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

// next-themes, FOUC'u önlemek için bir <script> render ediyor; bu script SSR'de
// doğru çalışıyor ama React 19 render sırasında karşılaştığı her <script>
// etiketi için dev-only bir uyarı veriyor. Bilinen, henüz çözülmemiş next-themes/
// React 19 uyumluluk sorunu (pacocoursey/next-themes#387) — yalnızca dev'de,
// yalnızca bu mesajı susturuyoruz.
if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
  const original = console.error;
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === "string" && args[0].includes("Encountered a script tag")) {
      return;
    }
    original(...args);
  };
}

export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
