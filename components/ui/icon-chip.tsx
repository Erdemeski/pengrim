import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * İkon çipi — bölümler arasında altı yerde birebir kopyalanmış olan
 * "kare kutu içinde LED renkli ikon" molekülü. Tek yerde toplandı ki
 * varyasyon kasıtlı olsun, kopya-yapıştır sapması olmasın.
 */
const iconChipVariants = cva(
  "grid shrink-0 place-items-center transition-colors",
  {
    variants: {
      size: {
        sm: "size-10 rounded-lg [&>svg]:size-4.5",
        md: "size-12 rounded-xl [&>svg]:size-6",
        lg: "size-14 rounded-2xl [&>svg]:size-7",
      },
      tone: {
        led: "border border-led/20 bg-led/10 text-led",
        muted: "border border-border/50 bg-background/40 text-muted-foreground",
      },
    },
    defaultVariants: { size: "md", tone: "led" },
  },
);

type IconChipProps = React.ComponentProps<"span"> &
  VariantProps<typeof iconChipVariants>;

export function IconChip({
  className,
  size,
  tone,
  ...props
}: IconChipProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(iconChipVariants({ size, tone }), className)}
      {...props}
    />
  );
}
