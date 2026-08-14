"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import {
  ShowcaseLightbox,
  type LightboxItem,
} from "./showcase-lightbox";
import type { DriftWallItem } from "@/components/DriftWall";

// DriftWall RAF + matchMedia + elementFromPoint kullanır → yalnızca istemcide.
const DriftWall = dynamic(() => import("@/components/DriftWall"), {
  ssr: false,
});

export type ShowcaseImage = {
  id: string;
  src: string;
  alt: string;
};

/** 16:9 karo ölçüleri — hepsi tileWidth * 9/16 ile türetildi. */
const TILE = {
  sm: { width: 176, height: 99, sizes: "180px" },
  md: { width: 232, height: 131, sizes: "240px" },
  lg: { width: 288, height: 162, sizes: "300px" },
} as const;

function pickTile(viewport: number) {
  if (viewport < 640) return TILE.sm;
  if (viewport < 1024) return TILE.md;
  return TILE.lg;
}

const GAP = 16;

export function ShowcaseWall({
  items,
  expandLabel,
  closeLabel,
  className,
}: {
  items: ShowcaseImage[];
  expandLabel: string;
  closeLabel: string;
  className?: string;
}) {
  // Sunucuda 1280 varsayılır; ilk efektte gerçek genişlikle düzeltilir.
  // DriftWall zaten ssr:false olduğu için hidrasyon uyuşmazlığı doğmaz.
  const [viewport, setViewport] = useState(1280);
  const [selected, setSelected] = useState<LightboxItem | null>(null);

  useEffect(() => {
    const measure = () => setViewport(window.innerWidth);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const tile = pickTile(viewport);

  // Sütun sayısı ekranı tam kaplayacak kadar. Düzlem scale(1.18) + translateZ
  // ile büyütülüp geri itildiği için etkin birim genişliği ~1.13 kat; kenarda
  // boşluk kalmaması için bir sütun pay bırakıldı. (İki paylı halde en dıştaki
  // sütun tamamen kırpma alanının dışında kalıyor, boşuna karo üretiyordu.)
  const columns = useMemo(
    () => Math.min(8, Math.ceil(viewport / ((tile.width + GAP) * 1.13)) + 1),
    [viewport, tile.width],
  );

  const wallItems = useMemo<DriftWallItem[]>(
    () =>
      items.map((it) => ({
        image: it.src,
        alt: it.alt,
        title: `${expandLabel}: ${it.alt}`,
      })),
    [items, expandLabel],
  );

  const handleSelect = useCallback((item: DriftWallItem, rect: DOMRect) => {
    setSelected({ src: item.image, alt: item.alt ?? "", rect });
  }, []);

  const closeLightbox = useCallback(() => setSelected(null), []);

  if (!items.length) return null;

  return (
    <div
      className={cn(
        // Negatif alt marjin Section'ın alt boşluğunu yutar: duvarın alt kenarı
        // doğrudan İletişim bölümünün border-t çizgisine dayanır.
        "relative h-[clamp(520px,72vh,820px)] w-full overflow-hidden",
        "-mb-12 sm:-mb-16 md:-mb-20",
        className,
      )}
    >
      <DriftWall
        items={wallItems}
        columns={columns}
        itemsPerColumn={4}
        tileWidth={tile.width}
        tileHeight={tile.height}
        sizes={tile.sizes}
        gap={GAP}
        radius={12}
        tilt={8}
        turn={-12}
        roll={5}
        perspective={1100}
        depth={20}
        speed={16}
        variance={0.35}
        direction="up"
        parallax={0.25}
        lift={40}
        dim={1}
        tintOpacity={0.16}
        overlayColor="var(--brand-pitch)"
        topFade="25%"
        bottomFade="25%"
        paused={selected !== null}
        onItemSelect={handleSelect}
      />

      <ShowcaseLightbox
        item={selected}
        onClose={closeLightbox}
        closeLabel={closeLabel}
      />
    </div>
  );
}
