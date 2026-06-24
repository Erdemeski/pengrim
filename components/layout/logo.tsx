import { cn } from "@/lib/utils";

/**
 * Geçici wordmark + LED çevre panosu işareti.
 * Kurumsal logo sağlandığında bu bileşen değiştirilecek.
 */
export function Logo({
  className,
  withWordmark = true,
}: {
  className?: string;
  withWordmark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        aria-hidden="true"
        className="relative grid size-8 shrink-0 place-items-center overflow-hidden rounded-lg bg-gradient-to-br from-primary to-[oklch(0.6_0.14_158)] text-primary-foreground shadow-[0_0_20px_-6px_var(--brand-turf)]"
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="none">
          {/* LED çevre panosu — yükseklikleri değişen ışık çubukları */}
          <rect x="3" y="9" width="2.4" height="6" rx="1" fill="currentColor" opacity="0.6" />
          <rect x="7" y="6" width="2.4" height="12" rx="1" fill="currentColor" opacity="0.85" />
          <rect x="11" y="8" width="2.4" height="8" rx="1" fill="currentColor" />
          <rect x="15" y="5" width="2.4" height="14" rx="1" fill="currentColor" opacity="0.85" />
          <rect x="19" y="10" width="2.0" height="4" rx="1" fill="currentColor" opacity="0.6" />
        </svg>
      </span>
      {withWordmark ? (
        <span className="font-display text-lg font-extrabold uppercase tracking-tight text-foreground">
          Pengrim
        </span>
      ) : null}
    </span>
  );
}
