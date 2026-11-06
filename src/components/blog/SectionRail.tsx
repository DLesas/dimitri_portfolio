"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { minutesLeft } from "@/lib/blog/format";
import type { Section } from "@/lib/blog/posts";
import { goToSection, useReadingProgress } from "./useReadingProgress";

/**
 * "On this page" beside a post on wide screens: the post's sections as a small
 * constellation that lights up as you read. Read sections fill in, the link to the next
 * one draws in as you go, the current one pulses, and a highlight slides to its name.
 * Sticks in the window, vertically centred, all the way down the post.
 */

/** A seeded random source, so a post's constellation is the same on every visit */
function seeded(text: string) {
  let h = 1779033703 ^ text.length;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Star {
  x: number;
  y: number;
  section: boolean;
}
interface Layout {
  height: number;
  stars: Star[];
  /** Each item's row in the list, for the highlight */
  rows: { top: number; height: number }[];
  /** Faint dots behind the constellation */
  dust: { x: number; y: number; r: number }[];
}

/** Where each star sits: level with its name, sections to the left, sub-sections to the right */
function layOut(list: HTMLUListElement, seed: string): Layout {
  const rand = seeded(`rail:${seed}`);
  const items = [...list.children] as HTMLLIElement[];
  const height = list.offsetHeight;
  return {
    height,
    dust: Array.from({ length: Math.round(height / 40) }, () => ({ x: 2 + rand() * 40, y: rand() * height, r: 0.5 + rand() * 0.7 })),
    stars: items.map((li) => {
      const section = li.dataset.depth === "2";
      return { x: section ? 9 + rand() * 14 : 21 + rand() * 15, y: li.offsetTop + li.offsetHeight / 2, section };
    }),
    rows: items.map((li) => ({ top: li.offsetTop, height: li.offsetHeight })),
  };
}

export function SectionRail({ sections, words, seed }: { sections: Section[]; words: number; seed: string }) {
  const ids = useMemo(() => sections.map((s) => s.id), [sections]);
  const { current, progress, fraction } = useReadingProgress(ids);
  const listRef = useRef<HTMLUListElement>(null);
  const [layout, setLayout] = useState<Layout | null>(null);

  // The constellation follows the list's layout, so it's drawn once the list is on screen
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const update = () => setLayout(layOut(list, seed));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(list);
    return () => observer.disconnect();
  }, [sections, seed]);

  // Sub-sections link back to their section where the path doesn't already join them
  const extras = useMemo(() => {
    const links: [number, number][] = [];
    let parent = -1;
    sections.forEach((s, i) => {
      if (s.depth === 2) parent = i;
      else if (parent >= 0 && parent !== i - 1) links.push([parent, i]);
    });
    return links;
  }, [sections]);

  const left = minutesLeft(words, progress);
  const row = layout?.rows[current];

  return (
    <nav aria-label="On this page" className="sticky top-0 flex h-screen flex-col overflow-y-auto text-[0.88rem]">
      <div className="my-auto py-6">
        <p className="mb-3.5 text-[0.72rem] font-semibold uppercase tracking-[0.09em] text-default-400">On this page</p>
        <div className="relative">
          {layout && (
            <svg aria-hidden className="pointer-events-none absolute left-0 top-0 w-11 overflow-visible" height={layout.height} viewBox={`0 0 44 ${layout.height}`}>
              <defs>
                <linearGradient id="rail-gradient" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={layout.height}>
                  <stop offset="0" style={{ stopColor: "var(--color-primary)" }} />
                  <stop offset="1" style={{ stopColor: "var(--color-secondary)" }} />
                </linearGradient>
              </defs>
              {layout.dust.map((d, i) => (
                <circle key={i} cx={d.x} cy={d.y} r={d.r} style={{ fill: "var(--color-default-400)" }} opacity={0.45} />
              ))}
              {extras.map(([a, b]) => {
                const [p, q] = [layout.stars[a], layout.stars[b]];
                return (
                  <line
                    key={`${a}-${b}`}
                    x1={p.x} y1={p.y} x2={q.x} y2={q.y}
                    strokeWidth={1}
                    strokeDasharray="2 3"
                    className="transition-[stroke,opacity] duration-300"
                    style={{ stroke: b <= current ? "var(--color-primary)" : "var(--color-default-200)", opacity: b <= current ? 0.5 : 1 }}
                  />
                );
              })}
              {layout.stars.slice(0, -1).map((p, k) => {
                const q = layout.stars[k + 1];
                const length = Math.hypot(q.x - p.x, q.y - p.y);
                const filled = k < current ? 1 : k === current ? fraction : 0;
                return (
                  <g key={k}>
                    <line x1={p.x} y1={p.y} x2={q.x} y2={q.y} strokeWidth={1.5} strokeLinecap="round" style={{ stroke: "var(--color-default-200)" }} />
                    <line
                      x1={p.x} y1={p.y} x2={q.x} y2={q.y}
                      stroke="url(#rail-gradient)"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeDasharray={length}
                      strokeDashoffset={length * (1 - filled)}
                    />
                  </g>
                );
              })}
              {layout.stars.map((s, i) => (
                <g key={i}>
                  {i === current && (
                    <circle
                      cx={s.x} cy={s.y} r={s.section ? 9 : 7}
                      opacity={0.25}
                      className="motion-safe:animate-[rail-pulse_2.4s_ease-in-out_infinite]"
                      style={{ fill: "var(--color-primary)", transformBox: "fill-box", transformOrigin: "center" }}
                    />
                  )}
                  <circle
                    cx={s.x} cy={s.y} r={s.section ? 4.5 : 3}
                    strokeWidth={i === current ? 2 : 1.5}
                    className="transition-[fill,stroke] duration-300"
                    style={{
                      fill: i < current ? "var(--color-primary)" : "var(--color-background)",
                      stroke: i <= current ? "var(--color-primary)" : "var(--color-default-400)",
                    }}
                  />
                </g>
              ))}
            </svg>
          )}
          {/* The current section's highlight, sliding from one name to the next */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-11 right-0 top-0 rounded-lg bg-gradient-to-r from-primary/15 to-secondary/10 transition-[transform,height,opacity] duration-[450ms] ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none"
            style={{ transform: `translateY(${row?.top ?? 0}px)`, height: row?.height ?? 0, opacity: row ? 1 : 0 }}
          />
          <ul ref={listRef} className="relative grid gap-0.5">
            {sections.map((s, i) => (
              <li key={s.id} data-depth={s.depth}>
                <a
                  href={`#${s.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    goToSection(s.id);
                  }}
                  aria-current={i === current ? "location" : undefined}
                  className={`block py-1.5 leading-snug transition-[color,translate] duration-300 motion-reduce:transition-none ${
                    s.depth === 3 ? "pl-[58px] text-[0.84rem]" : "pl-[50px]"
                  } ${
                    i === current
                      ? "translate-x-[3px] text-primary"
                      : i < current
                        ? "text-foreground/80 hover:text-foreground"
                        : "text-default-500 hover:text-foreground"
                  }`}
                >
                  {s.text}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-[18px] pl-[50px] tabular-nums text-default-500">
          <b className="text-foreground">{Math.round(progress * 100)}%</b> read · {left > 0 ? `${left} min left` : "Done"}
        </p>
      </div>
    </nav>
  );
}
