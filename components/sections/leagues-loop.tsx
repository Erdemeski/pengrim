"use client";

import LogoLoop from "@/components/LogoLoop";

const LEAGUES = [
  "SÜPER LİG",
  "PREMIER LEAGUE",
  "LA LIGA",
  "SERIE A",
  "BUNDESLIGA",
  "UEFA CHAMPIONS LEAGUE",
  "LIGUE 1",
  "EREDIVISIE",
  "PRIMEIRA LIGA",
];

const logos = LEAGUES.map((name) => ({
  title: name,
  node: (
    <span className="font-display text-sm font-bold uppercase tracking-[0.15em] text-muted-foreground transition-colors hover:text-foreground sm:text-base">
      {name}
    </span>
  ),
}));

/** Lig / turnuva şeridi — gerçek logolar sağlandığında node yerine src kullanılacak. */
export function LeaguesLoop() {
  return (
    <LogoLoop
      logos={logos}
      speed={36}
      direction="left"
      gap={56}
      logoHeight={22}
      pauseOnHover
      scaleOnHover
      fadeOut
      fadeOutColor="var(--background)"
      ariaLabel="Ligler ve turnuvalar"
      className="py-1"
    />
  );
}
