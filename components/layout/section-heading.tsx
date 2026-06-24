import { Reveal } from "@/components/effects/reveal";
import { cn } from "@/lib/utils";
import ShinyText from "@/components/ShinyText";

type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center";
  className?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "left",
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4",
        align === "center" && "items-center text-center",
        className,
      )}
    >
      <Reveal>
        <span className="inline-flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-led shadow-[0_0_12px_var(--brand-led)]" />
          <ShinyText
            text={eyebrow}
            speed={4}
            color="var(--muted-foreground)"
            shineColor="var(--brand-led)"
            className="font-mono text-[11px] font-medium uppercase tracking-[0.28em] sm:text-xs"
          />
        </span>
      </Reveal>
      <Reveal delay={0.05}>
        <h2 className="max-w-3xl text-balance font-display text-3xl font-extrabold uppercase leading-[0.95] tracking-tight sm:text-4xl md:text-5xl">
          {title}
        </h2>
      </Reveal>
      {subtitle ? (
        <Reveal delay={0.1}>
          <p
            className={cn(
              "max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg",
              align === "center" && "mx-auto",
            )}
          >
            {subtitle}
          </p>
        </Reveal>
      ) : null}
    </div>
  );
}
