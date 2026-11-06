"use client";

import { useEffect, useState } from "react";

/** The post's text, and a marker at its end: what reading progress is measured over */
export const POST_BODY_ID = "post-body";
export const POST_END_ID = "post-end";

export interface ReadingProgress {
  /** The section being read: the last one whose title has passed the reading line (-1 before the first) */
  current: number;
  /** How far through the whole post, 0 to 1 */
  progress: number;
  /** How far through the current section, 0 to 1 */
  fraction: number;
}

const clamp = (n: number) => Math.min(1, Math.max(0, n));

/**
 * Where on screen counts as "being read": 30% of the way down. Over the last stretch of
 * the page it slides down to the bottom of the window, since the end of the post and the
 * last section can never scroll up to the 30% line: at the very bottom, everything on
 * screen has been read.
 */
function readingLine() {
  const base = innerHeight * 0.3;
  const left = document.documentElement.scrollHeight - innerHeight - scrollY;
  const zone = innerHeight * 0.6;
  return left >= zone ? base : base + (innerHeight - base) * (1 - Math.max(0, left) / zone);
}

/** Reading progress through the post, following scrolling and resizing */
export function useReadingProgress(sectionIds: readonly string[]): ReadingProgress {
  const [state, setState] = useState<ReadingProgress>({ current: -1, progress: 0, fraction: 0 });

  useEffect(() => {
    let raf = 0;
    const measure = () => {
      raf = 0;
      const body = document.getElementById(POST_BODY_ID);
      const end = document.getElementById(POST_END_ID);
      if (!body || !end) return;
      const line = readingLine();
      const top = body.getBoundingClientRect().top;
      const bottom = end.getBoundingClientRect().top;
      const tops = sectionIds.map((id) => document.getElementById(id)?.getBoundingClientRect().top ?? Infinity);
      let current = -1;
      tops.forEach((t, i) => {
        if (t < line) current = i;
      });
      const next = current >= 0 ? (tops[current + 1] ?? bottom) : 0;
      const latest = {
        current,
        progress: clamp((line - top) / Math.max(1, bottom - top)),
        fraction: current < 0 ? 0 : clamp((line - tops[current]) / Math.max(1, next - tops[current])),
      };
      // Only re-render when something visible changes
      setState((prev) =>
        prev.current === latest.current &&
        Math.abs(prev.progress - latest.progress) < 0.002 &&
        Math.abs(prev.fraction - latest.fraction) < 0.004
          ? prev
          : latest
      );
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    addEventListener("scroll", schedule, { passive: true });
    addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("scroll", schedule);
      removeEventListener("resize", schedule);
    };
  }, [sectionIds]);

  return state;
}

/** Scrolls to a section and puts it in the address bar, smoothly unless reduced motion is asked for */
export function goToSection(id: string) {
  const smooth = !matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.getElementById(id)?.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
  history.replaceState(null, "", `#${id}`);
}
