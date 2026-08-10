import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

type SectionProps = ComponentPropsWithoutRef<"section">;

/** Tutarlı dikey ritim + header için scroll-margin. */
export function Section({ className, children, ...props }: SectionProps) {
  return (
    <section
      className={cn(
        "relative scroll-mt-24 py-12 sm:py-16 md:py-20",
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
}
