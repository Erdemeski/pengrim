"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Globe } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Tek tık dil değiştirici — yalnızca tr/en olduğu sürece basit swap yeterli;
 *  3+ dil eklenirse dropdown'a (eski LanguageSwitcher deseni) dönülmeli. */
export function LanguageToggle({ className }: { className?: string }) {
  const locale = useLocale();
  const t = useTranslations("nav");
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = locale === "tr" ? "en" : "tr";
    startTransition(() => {
      router.replace(pathname, { locale: next });
    });
  }

  return (
    <Button
      variant="ghost"
      size="default"
      className={cn("h-8 px-2.5", className)}
      aria-label={t("language")}
      disabled={pending}
      onClick={toggle}
    >
      <Globe className="size-4" />
      <span className="font-mono text-xs font-medium uppercase">{locale}</span>
    </Button>
  );
}
