"use client";

import { useEffect, useReducer } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useLenis } from "lenis/react";
import { Dialog, DialogPortal, DialogTitle } from "@/components/ui/dialog";

export type LightboxItem = {
  src: string;
  alt: string;
  /** Karonun tıklama anındaki ekran kutusu — FLIP başlangıcı. */
  rect: DOMRect;
};

/** Ekranın ortasındaki 16:9 hedef kutu. */
type TargetBox = { top: number; left: number; width: number; height: number };

const RATIO = 16 / 9;
const EASE = [0.22, 1, 0.36, 1] as const;

function computeTarget(): TargetBox {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.min(vw * 0.92, 1280, vh * 0.84 * RATIO);
  const height = width / RATIO;
  return { width, height, left: (vw - width) / 2, top: (vh - height) / 2 };
}

export function ShowcaseLightbox({
  item,
  onClose,
  closeLabel,
}: {
  item: LightboxItem | null;
  onClose: () => void;
  closeLabel: string;
}) {
  const lenis = useLenis();
  const reduceMotion = useReducedMotion();
  const [, bumpResize] = useReducer((n: number) => n + 1, 0);

  // Radix body'ye overflow:hidden yazar ama Lenis kendi sanal scroll'unu
  // sürdürür; açıkken elle durdurulmalı.
  useEffect(() => {
    if (!item || !lenis) return;
    lenis.stop();
    return () => lenis.start();
  }, [item, lenis]);

  // Açıkken pencere yeniden boyutlanırsa hedef kutu bayatlamasın.
  useEffect(() => {
    if (!item) return;
    window.addEventListener("resize", bumpResize);
    return () => window.removeEventListener("resize", bumpResize);
  }, [item]);

  // Render sırasında hesaplanır (yan etki yok); item yalnızca istemcideki bir
  // tıklamadan sonra dolu olduğu için window erişimi güvenli.
  const target: TargetBox | null = item ? computeTarget() : null;
  const open = Boolean(item && target);

  // Kaynak ve hedef ikisi de 16:9 → ölçek tek düze, görsel bozulmaz.
  const from =
    item && target && !reduceMotion
      ? {
          opacity: 0,
          scale: item.rect.width / target.width,
          x:
            item.rect.left +
            item.rect.width / 2 -
            (target.left + target.width / 2),
          y:
            item.rect.top +
            item.rect.height / 2 -
            (target.top + target.height / 2),
        }
      : { opacity: 0, scale: 1, x: 0, y: 0 };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogPortal forceMount>
        <AnimatePresence>
          {open && item && target ? (
            <DialogPrimitive.Overlay asChild forceMount key="backdrop">
              <motion.div
                className="fixed inset-0 z-[60] bg-black/72 backdrop-blur-md"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.28 } }}
                transition={{ duration: 0.32, ease: EASE }}
              />
            </DialogPrimitive.Overlay>
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {open && item && target ? (
            <DialogPrimitive.Content
              asChild
              forceMount
              key="frame"
              aria-describedby={undefined}
            >
              <motion.div
                className="fixed z-[61] overflow-hidden rounded-xl bg-card shadow-[0_40px_120px_-30px_rgb(0_0_0/0.9)] outline-none"
                style={{
                  top: target.top,
                  left: target.left,
                  width: target.width,
                  height: target.height,
                }}
                initial={from}
                animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                exit={{ ...from, transition: { duration: 0.28, ease: EASE } }}
                transition={{ duration: 0.42, ease: EASE }}
              >
                <DialogTitle className="sr-only">{item.alt}</DialogTitle>

                <Image
                  src={item.src}
                  alt={item.alt}
                  fill
                  sizes="92vw"
                  quality={85}
                  priority
                  draggable={false}
                  className="object-cover"
                />

                <button
                  type="button"
                  onClick={onClose}
                  aria-label={closeLabel}
                  className="glass absolute right-3 top-3 grid size-9 place-items-center rounded-full text-foreground/75 transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-led)]"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </motion.div>
            </DialogPrimitive.Content>
          ) : null}
        </AnimatePresence>
      </DialogPortal>
    </Dialog>
  );
}
