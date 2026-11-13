"use client";

import { useState, type ReactNode, type RefObject } from "react";
import { useOnScreen } from "@/hooks/useOnScreen";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import data from "./map.json";

/** The embeddings post's data: made from the site by each production build (scripts/ask/map.ts), committed for the rest */
export const MAP = data;
export type Layout = "pca" | "umap";
export type Kind = "role" | "skill" | "intro" | "post";

/** What each kind of passage is called, and its colour as Tailwind classes */
export const KINDS: Record<Kind, { label: string; dot: string }> = {
  role: { label: "Roles", dot: "bg-primary" },
  skill: { label: "Skills", dot: "bg-secondary" },
  post: { label: "Blog sections", dot: "bg-[#f5a524]" },
  intro: { label: "Introductions", dot: "bg-default-400" },
};

/** One of a row of choices under a figure, as the 3D diagrams' flows are picked */
export function Choice({ picked, onPick, children }: { picked: boolean; onPick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={picked}
      onClick={onPick}
      className={`rounded-full border px-3 py-1.5 text-[0.82rem] font-medium leading-none transition-colors ${
        picked
          ? "border-primary bg-primary text-primary-foreground"
          : "border-default-200 text-default-500 hover:border-default-400 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

export function Choices({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2 pt-2">
      {children}
    </div>
  );
}

export function Caption({ children }: { children: ReactNode }) {
  return (
    <figcaption aria-live="polite" className="pt-3 text-[0.9rem] leading-relaxed text-default-500 tabular-nums">
      {children}
    </figcaption>
  );
}

export const percent = (share: number) => `${Math.round(share * 100)}%`;

/**
 * A number for an inline style, rounded: browsers keep only six digits of one, so a longer
 * number in the server's HTML wouldn't match the same number in the browser when it hydrates
 */
export const styleNumber = (x: number) => Math.round(x * 1000) / 1000;

/**
 * A figure that plays through `labels`, a step every `ms`, while it's on screen; picking a
 * step holds it, and picking it again plays on. With reduced motion nothing plays, and it
 * starts at `stillStep`. Returns the step shown and the step buttons, with their timer.
 */
export function useSteps(stage: RefObject<Element | null>, labels: string[], ms: number, stillStep = 0) {
  const playing = useOnScreen(stage, { threshold: 0.5 });
  const still = useReducedMotion();
  const [played, setPlayed] = useState(0);
  const [pinned, setPinned] = useState<number | null>(null);
  const step = pinned ?? (still ? stillStep : played);

  const buttons = (
    <>
      <Choices label="Steps">
        {labels.map((label, i) => (
          <Choice
            key={label}
            picked={step === i}
            onPick={() => {
              if (pinned === i) setPlayed(i);
              setPinned(pinned === i ? null : i);
            }}
          >
            {i + 1}. {label}
          </Choice>
        ))}
      </Choices>
      {/* A bar that fills, then moves the figure on: paused off screen, gone once a step is held */}
      {pinned === null && !still && (
        <span
          key={played}
          aria-hidden
          className="mt-2 block h-0.5 origin-left rounded-full bg-primary/60"
          style={{ animation: `grow-x ${ms}ms linear`, animationPlayState: playing ? "running" : "paused" }}
          onAnimationEnd={() => setPlayed((s) => (s + 1) % labels.length)}
        />
      )}
    </>
  );
  return { step, buttons };
}
