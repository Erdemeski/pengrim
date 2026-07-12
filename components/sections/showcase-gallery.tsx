"use client";

import dynamic from "next/dynamic";

// Masonry gsap + matchMedia kullanır → yalnızca istemcide (ssr:false).
const Masonry = dynamic(() => import("@/components/Masonry"), { ssr: false });

export type GalleryItem = {
  id: string;
  img: string;
  height: number;
  url?: string;
};

export function ShowcaseGallery({
  items,
  placeholder = false,
  placeholderLabel,
}: {
  items: GalleryItem[];
  placeholder?: boolean;
  placeholderLabel?: string;
}) {
  return (
    <div className="flex flex-col gap-5">
      {placeholder && placeholderLabel ? (
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border/60 bg-card/50 px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          <span className="size-1.5 rounded-full bg-led shadow-[0_0_10px_var(--brand-led)]" />
          {placeholderLabel}
        </span>
      ) : null}

      {/* Masonry kendi yüksekliğini içeriğe göre ayarlar; ölçüm ilk tick'te
          gelene kadar min yükseklik layout'u korur. */}
      <div className="min-h-[560px] w-full">
        <Masonry
          items={items}
          animateFrom="bottom"
          duration={0.6}
          stagger={0.05}
          scaleOnHover
          hoverScale={0.97}
          blurToFocus
          colorShiftOnHover={false}
        />
      </div>
    </div>
  );
}
