"use client";

import { useEffect } from "react";
import { lightUpTarget } from "@/lib/lightUp";

/**
 * Lights up a cited passage a link lands on (src/lib/lightUp.ts): a page opened at one,
 * such as lesas.dev/about#c-…, or a link to one on the same page. The assistant's palette
 * lights up the passages it opens itself (ask/PassageLink.tsx).
 */
export function CitedPassage() {
  useEffect(() => {
    lightUpTarget();
    addEventListener("hashchange", lightUpTarget);
    return () => removeEventListener("hashchange", lightUpTarget);
  }, []);
  return null;
}
