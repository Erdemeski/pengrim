"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { NAV_ITEMS, SECTION_IDS } from "@/lib/constants";
import { useScrollTo } from "./use-scroll-to";
import { Logo } from "./logo";

export function MobileNav() {
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);
  const scrollTo = useScrollTo();

  function go(href: string) {
    setOpen(false);
    // sheet kapanış animasyonu bittikten sonra kaydır
    window.setTimeout(() => scrollTo(href), 200);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label={t("menu")}
        >
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="glass-strong flex w-[88%] max-w-sm flex-col gap-0 border-l-border/60 p-0"
      >
        <SheetHeader className="border-b border-border/60 p-5">
          <SheetTitle className="text-left">
            <Logo />
          </SheetTitle>
        </SheetHeader>

        <nav className="flex flex-1 flex-col gap-1 p-3">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => go(item.href)}
              className="rounded-xl px-4 py-3.5 text-left font-display text-lg font-semibold uppercase tracking-tight text-foreground/90 transition-colors hover:bg-accent hover:text-foreground"
            >
              {t(item.key)}
            </button>
          ))}
        </nav>

        <div className="border-t border-border/60 p-5">
          <Button
            size="lg"
            className="w-full"
            onClick={() => go(`#${SECTION_IDS.contact}`)}
          >
            {t("cta")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
