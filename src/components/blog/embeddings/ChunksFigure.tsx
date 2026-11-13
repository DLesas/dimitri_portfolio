"use client";

import { useRef } from "react";
import { CHUNK_WORDS } from "@/lib/ask/config";
import { Caption, useSteps } from "./parts";

/** A simplified page: its blocks of text, each under a section heading */
const BLOCKS = [
  { section: "A short note", words: 30 },
  { section: "What I wanted", words: 140 },
  { section: "How it works", words: 180 },
  { section: "How it works", words: 160 },
  { section: "How it works", words: 180 },
  { section: "What it costs", words: 90 },
];
/** Which passage each block is in, at each step */
const STEPS = [
  { label: "One per section", passages: [0, 1, 2, 2, 2, 3], about: "To begin with, each section of a page is one passage." },
  {
    label: "Join the short",
    passages: [0, 0, 1, 1, 1, 2],
    about: `A section under ${CHUNK_WORDS.min} words says too little to be found by itself, so it joins its neighbour.`,
  },
  {
    label: "Split the long",
    passages: [0, 0, 1, 1, 2, 3],
    about: `A section over ${CHUNK_WORDS.max} words covers too much for one point, so it splits between paragraphs: never inside one, or inside code or a table.`,
  },
];
const TINTS = ["border-primary bg-primary/15", "border-secondary bg-secondary/15", "border-[#f5a524] bg-[#f5a524]/15", "border-foreground/60 bg-foreground/10"];

/** A page's sections becoming passages, a step at a time */
export function ChunksFigure({ title }: { title: string }) {
  const stage = useRef<HTMLDivElement>(null);
  const { step, buttons } = useSteps(
    stage,
    STEPS.map((s) => s.label),
    5500,
    STEPS.length - 1,
  );
  const { passages, about } = STEPS[step];
  const words = (passage: number) => BLOCKS.reduce((sum, b, i) => sum + (passages[i] === passage ? b.words : 0), 0);

  return (
    <figure aria-label={title} className="my-10">
      <div ref={stage} className="mx-auto flex max-w-md flex-col py-2">
        {BLOCKS.map((block, i) => {
          const first = passages[i] !== passages[i - 1];
          return (
            <div
              key={i}
              className={`flex items-start justify-between gap-x-3 rounded-md border-l-[3px] px-3 py-1.5 text-[0.74rem] leading-snug transition-[margin,background-color,border-color] duration-700 ease-out-expo motion-reduce:transition-none ${TINTS[passages[i]]}`}
              // Taller the more words it has, and never too short for its labels
              style={{ minHeight: Math.max(30, 12 + block.words / 3.2), marginTop: i === 0 ? 0 : first ? 16 : 2 }}
            >
              <span className="text-default-500">
                {block.section !== BLOCKS[i - 1]?.section && <strong className="font-semibold text-foreground">{block.section} · </strong>}
                {block.words} words
              </span>
              {first && (
                <span className="flex-none text-right font-medium text-foreground tabular-nums">
                  Passage {passages[i] + 1}: {words(passages[i])} words
                </span>
              )}
            </div>
          );
        })}
      </div>
      {buttons}
      <Caption>
        <strong className="font-semibold text-foreground">{STEPS[step].label}.</strong> {about}
      </Caption>
    </figure>
  );
}
