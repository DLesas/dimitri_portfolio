"use client";

import { useRef, type ComponentPropsWithoutRef } from "react";
import { useInViewOnce } from "@/hooks/useInViewOnce";

/**
 * A section whose `enter` animations (its own and its children's) wait until it
 * scrolls into view, then play once. The pausing is `.reveal` in src/styles/entrance.css.
 */
export function Reveal({
  className = "",
  ...props
}: ComponentPropsWithoutRef<"section">) {
  const ref = useRef<HTMLElement>(null);
  const shown = useInViewOnce(ref);

  return (
    <section
      ref={ref}
      {...props}
      className={`reveal ${className}`}
      data-shown={shown || undefined}
    />
  );
}
