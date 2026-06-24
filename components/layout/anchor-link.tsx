"use client";

import type { ReactNode } from "react";
import { useScrollTo } from "./use-scroll-to";

type AnchorLinkProps = {
  href: string;
  className?: string;
  children: ReactNode;
};

/** İç anchor bağlantısı — Lenis ile yumuşak kaydırır. */
export function AnchorLink({ href, className, children }: AnchorLinkProps) {
  const scrollTo = useScrollTo();
  return (
    <a
      href={href}
      onClick={(e) => {
        e.preventDefault();
        scrollTo(href);
      }}
      className={className}
    >
      {children}
    </a>
  );
}
