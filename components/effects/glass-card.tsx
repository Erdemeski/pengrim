import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

type GlassCardProps = ComponentPropsWithoutRef<"div"> & {
  strong?: boolean;
};

/** Liquid glass yüzey (globals.css içindeki .glass / .glass-strong). */
export function GlassCard({ className, strong, ...props }: GlassCardProps) {
  return (
    <div
      className={cn(strong ? "glass-strong" : "glass", "rounded-2xl", className)}
      {...props}
    />
  );
}
