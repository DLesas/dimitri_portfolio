"use client";

import Link from "next/link";
import { createContext, useContext, type ComponentProps } from "react";
import type { useRouter } from "next/navigation";
import { lightUpTarget } from "@/lib/lightUp";

/** What following a link in the palette does: AskPalette closes it, then opens the page */
export const FollowContext = createContext<(href: string) => void>(() => {});

/**
 * A link from the palette to a page of the site, maybe to a passage on it (#c-…). A plain
 * click goes through FollowContext; a click that opens a new tab stays the browser's.
 */
export function PassageLink({ href, ...props }: Omit<ComponentProps<typeof Link>, "href" | "onNavigate"> & { href: string }) {
  const follow = useContext(FollowContext);
  return (
    <Link
      href={href}
      onNavigate={(event) => {
        event.preventDefault();
        follow(href);
      }}
      {...props}
    />
  );
}

/**
 * Opens `href` on the site through the router, which scrolls to its passage (#c-…), then
 * lights the passage up (src/lib/lightUp.ts) once it's on the page.
 */
export function openPage(router: ReturnType<typeof useRouter>, href: string) {
  const url = new URL(href, location.href);
  const id = decodeURIComponent(url.hash.slice(1));
  const there = () => url.pathname === location.pathname && url.search === location.search && url.hash === location.hash;
  // Already there: the passage only needs bringing back into view
  if (there()) {
    if (id) document.getElementById(id)?.scrollIntoView();
    lightUpTarget();
    return;
  }
  router.push(url.pathname + url.search + url.hash);
  if (!id) return;
  const until = performance.now() + 10_000;
  const light = () => {
    if (there() && document.getElementById(id)) lightUpTarget();
    else if (performance.now() < until) setTimeout(light, 50);
  };
  light();
}
