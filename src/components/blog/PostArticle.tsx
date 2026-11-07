"use client";

import { useState, type ComponentPropsWithoutRef } from "react";
import { useHydrated } from "@/hooks/useHydrated";

/**
 * A post's article, whose `enter` animations play only when it's navigated to in the
 * browser. On a page load the text is already there in the server's HTML, so nothing
 * rises in. The skipping is `.enter-on-navigation` in src/styles/entrance.css.
 */
export function PostArticle({ className = "", ...props }: ComponentPropsWithoutRef<"article">) {
  // False while hydrating the server's HTML, true when rendered fresh in the browser.
  // Kept from the first render, so finishing hydration doesn't start the animations.
  const hydrated = useHydrated();
  const [navigated] = useState(hydrated);

  return <article {...props} className={`enter-on-navigation ${className}`} data-navigated={navigated || undefined} />;
}
