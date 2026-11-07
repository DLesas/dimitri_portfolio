"use client";

import { useMemo, useRef, type CSSProperties } from "react";
import { minutesLeft } from "@/lib/blog/format";
import type { Section } from "@/lib/blog/posts";
import { goToSection, useReadingProgress } from "./useReadingProgress";

/**
 * The section rail on narrower screens (below lg): the sections in an "On this page"
 * dropdown above the text, and a thin progress bar along the top of the screen.
 * `className` and `style` are the dropdown's (the bar is fixed, so it mustn't move with it).
 */
export function MobileSections({
  sections,
  words,
  className = "",
  style,
}: {
  sections: Section[];
  words: number;
  className?: string;
  style?: CSSProperties;
}) {
  const ids = useMemo(() => sections.map((s) => s.id), [sections]);
  const { current, progress } = useReadingProgress(ids);
  const details = useRef<HTMLDetailsElement>(null);
  const left = minutesLeft(words, progress);
  const leftText = left > 0 ? `${left} min left` : "Done";

  return (
    <>
      <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-40 h-[3px]">
        <div
          className="h-full origin-left bg-gradient-to-r from-primary to-secondary"
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>
      <details
        ref={details}
        className={`group mb-8 rounded-2xl border border-default-200 bg-default-50/50 ${className}`}
        style={style}
      >
        <summary className="flex cursor-pointer list-none justify-between px-4 py-3 text-[0.92rem] font-semibold [&::-webkit-details-marker]:hidden">
          On this page <span className="font-normal tabular-nums text-default-500">{leftText}</span>
        </summary>
        <nav aria-label="On this page">
          <ul className="grid gap-0.5 px-3 pb-3 text-[0.9rem]">
            {sections.map((s, i) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    details.current?.removeAttribute("open");
                    goToSection(s.id);
                  }}
                  aria-current={i === current ? "location" : undefined}
                  className={`block rounded-md py-1.5 ${s.depth === 3 ? "pl-6 text-[0.85rem]" : "pl-2"} ${
                    i === current ? "bg-primary/10 text-primary" : "text-default-600"
                  }`}
                >
                  {s.text}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </details>
    </>
  );
}
