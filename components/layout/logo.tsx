import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Çizim boyutu her kırılımda `h-11` (44 px) × ~197 px. `sizes` olmadan
 * next/image srcset'i `deviceSizes`ten kurar ve tarayıcı 640w+ bir varyant
 * seçebiliyordu — 2000×447 kaynaktan gereksiz büyük bir dosya. Sabit bir CSS
 * genişliği olduğu için `sizes` de sabit; artık `imageSizes` (≤384w) tarafından
 * karşılanıyor. Piksel çıktısı her DPR'de aynı.
 */
const LOGO_SIZES = "200px";

/**
 * Kurumsal wordmark. Açık temada siyah, koyu tema/koyu yüzeyde beyaz logo.
 * (Header & footer her zaman `.dark` sarmalayıcı içinde olduğundan beyaz gösterilir.)
 *
 * `priority` bilerek YOK: iki wordmark da `<link rel=preload>` üretiyor ve
 * (tema ile gizlenen kopya dahil, `display:none` indirmeyi engellemez) toplam
 * ~149 KB hero'nun ilk kareleriyle kritik yolda yarışıyordu. LCP öğesi logo
 * değil, hero poster arka planı.
 *
 * Gizli kopyaya `loading="lazy"` da verilmiyor: `display:none` öğeler hiçbir
 * zaman "viewport içinde" sayılmadığından tema değiştirilirken header bir an
 * boş kalırdı.
 */
export function Logo({ className }: { className?: string }) {
  const imgClass = "h-11 w-auto sm:h-11 -ml-5 mt-1";
  return (
    <span className={cn("inline-flex items-center", className)}>
      <Image
        src="/pengrim_siyah.png"
        alt="Pengrim Sports Media"
        width={2000}
        height={447}
        sizes={LOGO_SIZES}
        className={cn(imgClass, "block dark:hidden")}
      />
      <Image
        src="/pengrim_beyaz.png"
        alt="Pengrim Sports Media"
        width={2000}
        height={447}
        sizes={LOGO_SIZES}
        className={cn(imgClass, "hidden dark:block")}
      />
    </span>
  );
}
