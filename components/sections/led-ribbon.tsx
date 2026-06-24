import { Marquee } from "@/components/effects/marquee";
import { cn } from "@/lib/utils";

type LedRibbonProps = {
  words: string[];
  className?: string;
  durationSec?: number;
  reverse?: boolean;
  /** Bölüm ayıracı olarak hafif eğim */
  tilt?: boolean;
};

function LedDot() {
  return (
    <span
      aria-hidden="true"
      className="mx-1 size-2 rounded-full bg-led shadow-[0_0_12px_var(--brand-led)]"
    />
  );
}

/**
 * SIGNATURE — Saha kenarı LED çevre panosu.
 * Dot-matrix dokulu, kayan marka şeridi + üzerinden geçen broadcast parıltısı.
 */
export function LedRibbon({
  words,
  className,
  durationSec = 26,
  reverse = false,
  tilt = false,
}: LedRibbonProps) {
  return (
    <div
      className={cn(
        "relative isolate w-full",
        tilt && "-rotate-[1.4deg] scale-[1.03]",
        className,
      )}
    >
      <div className="relative overflow-hidden border-y border-white/10 bg-[oklch(0.115_0.02_171)] py-3.5 shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] sm:py-4">
        {/* LED dot-matrix dokusu */}
        <div
          aria-hidden="true"
          className="led-grid pointer-events-none absolute inset-0 opacity-30 mix-blend-screen"
        />
        {/* üst cam parlaması */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/[0.07] to-transparent"
        />

        <div className="mask-fade-x">
          <Marquee durationSec={durationSec} reverse={reverse}>
            {words.map((w, i) => (
              <span key={i} className="flex items-center">
                <span className="px-6 font-display text-sm font-extrabold uppercase tracking-[0.22em] text-floodlight [text-shadow:0_0_18px_color-mix(in_oklch,var(--brand-led)_45%,transparent)] sm:px-9 sm:text-base">
                  {w}
                </span>
                <LedDot />
              </span>
            ))}
          </Marquee>
        </div>

        {/* broadcast parıltısı */}
        <div
          aria-hidden="true"
          className="animate-shine pointer-events-none absolute inset-y-0 left-0 w-1/5 bg-gradient-to-r from-transparent via-white/15 to-transparent"
        />
      </div>
    </div>
  );
}
