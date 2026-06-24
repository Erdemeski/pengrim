import { Marquee } from "@/components/effects/marquee";
import { cn } from "@/lib/utils";

type FrameKind = "led" | "backboard" | "overlay";

/**
 * Gerçek maç fotoğrafı yerine CSS ile kurgulanmış "yayın karesi" maketi.
 * Kurumsal görseller sağlandığında <Image /> ile değiştirilecek.
 */
export function BroadcastFrame({ kind }: { kind: FrameKind }) {
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-t-2xl bg-[radial-gradient(120%_100%_at_50%_0%,oklch(0.26_0.05_158)_0%,oklch(0.16_0.02_168)_60%)]">
      {/* saha çim çizgileri */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, transparent 0 38px, color-mix(in oklch, var(--brand-turf) 30%, transparent) 38px 39px)",
        }}
      />
      {/* vinyet */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(100%_80%_at_50%_30%,transparent_40%,oklch(0.1_0.02_168)_100%)]"
      />

      {/* skor kutusu */}
      <div className="absolute left-3 top-3 flex items-center gap-2 rounded-md border border-white/10 bg-black/45 px-2.5 py-1.5 font-mono text-[11px] font-medium backdrop-blur-sm">
        <span className="text-floodlight">PEN</span>
        <span className="text-led">1</span>
        <span className="text-muted-foreground">-</span>
        <span className="text-floodlight">0</span>
        <span className="text-floodlight/70">GRM</span>
        <span className="ml-1 text-led/80">67&apos;</span>
      </div>

      {kind === "backboard" ? (
        <>
          {/* kale filesi */}
          <div
            aria-hidden="true"
            className="absolute inset-x-8 top-10 bottom-16 opacity-25"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg, color-mix(in oklch,#fff 40%,transparent) 0 1px, transparent 1px 14px), repeating-linear-gradient(-45deg, color-mix(in oklch,#fff 40%,transparent) 0 1px, transparent 1px 14px)",
            }}
          />
          <div className="absolute inset-x-10 bottom-6 grid place-items-center rounded-md border border-led/30 bg-black/40 py-2 font-display text-sm font-extrabold uppercase tracking-[0.25em] text-floodlight [text-shadow:0_0_16px_color-mix(in_oklch,var(--brand-led)_55%,transparent)]">
            Pengrim
          </div>
        </>
      ) : null}

      {kind === "overlay" ? (
        <div className="absolute inset-x-0 bottom-0">
          <div className="flex items-center justify-between gap-3 border-t border-led/30 bg-gradient-to-r from-black/70 via-black/55 to-transparent px-4 py-3">
            <span className="font-display text-xs font-bold uppercase tracking-[0.2em] text-floodlight">
              Powered by <span className="text-led">Pengrim</span>
            </span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              xG 1.84
            </span>
          </div>
          <div className="h-1 w-full bg-gradient-to-r from-led via-turf to-transparent" />
        </div>
      ) : null}

      {kind === "led" ? (
        <div className="led-grid absolute inset-x-0 bottom-0 border-t border-white/10 bg-[oklch(0.12_0.02_171)]/90 py-2">
          <div className="mask-fade-x">
            <Marquee durationSec={18}>
              <span className="px-6 font-display text-xs font-extrabold uppercase tracking-[0.3em] text-floodlight [text-shadow:0_0_14px_color-mix(in_oklch,var(--brand-led)_50%,transparent)]">
                Pengrim
              </span>
              <span className="size-1.5 rounded-full bg-led shadow-[0_0_10px_var(--brand-led)]" />
            </Marquee>
          </div>
        </div>
      ) : null}
    </div>
  );
}
