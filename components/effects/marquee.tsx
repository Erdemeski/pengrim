import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

type MarqueeProps = {
  children: ReactNode;
  reverse?: boolean;
  durationSec?: number;
  pauseOnHover?: boolean;
  className?: string;
};

/**
 * Sonsuz yatay marquee. İçeriği iki kez render edip -50% kaydırarak
 * kesintisiz döngü sağlar (GPU transform). reduced-motion globals.css'te durdurulur.
 */
export function Marquee({
  children,
  reverse,
  durationSec = 30,
  pauseOnHover = true,
  className,
}: MarqueeProps) {
  return (
    <div
      className={cn(
        "relative flex w-full overflow-hidden",
        pauseOnHover && "pause-on-hover",
        className,
      )}
    >
      <div
        className={cn(
          "flex w-max shrink-0 items-center",
          reverse ? "animate-marquee-reverse" : "animate-marquee",
        )}
        style={{ "--marquee-duration": `${durationSec}s` } as CSSProperties}
      >
        <div className="flex shrink-0 items-center">{children}</div>
        <div className="flex shrink-0 items-center" aria-hidden="true">
          {children}
        </div>
      </div>
    </div>
  );
}
