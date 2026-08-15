"use client";

import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHydrated } from "@/lib/use-hydrated";

export function ThemeToggle({ className }: { className?: string }) {
  const t = useTranslations("nav");
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useHydrated();

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      className={className}
      aria-label={
        mounted
          ? isDark
            ? t("themeToLight")
            : t("themeToDark")
          : t("theme")
      }
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {mounted ? (
        isDark ? <Sun className="size-4" /> : <Moon className="size-4" />
      ) : (
        <Sun className="size-4 opacity-0" />
      )}
    </Button>
  );
}
