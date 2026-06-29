import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Kurumsal wordmark. Açık temada siyah, koyu tema/koyu yüzeyde beyaz logo.
 * (Header & footer her zaman `.dark` sarmalayıcı içinde olduğundan beyaz gösterilir.)
 */
export function Logo({
  className,
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  const imgClass = "h-11 w-auto sm:h-11 -ml-5 mt-1";
  return (
    <span className={cn("inline-flex items-center", className)}>
      <Image
        src="/pengrim_siyah.png"
        alt="Pengrim Sports Media"
        width={2000}
        height={447}
        priority={priority}
        className={cn(imgClass, "block dark:hidden")}
      />
      <Image
        src="/pengrim_beyaz.png"
        alt="Pengrim Sports Media"
        width={2000}
        height={447}
        priority={priority}
        className={cn(imgClass, "hidden dark:block")}
      />
    </span>
  );
}
