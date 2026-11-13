"use client";

import { useState } from "react";
import { Caption, Choice, Choices, KINDS, MAP, type Kind } from "./parts";

/** The preset questions that show the two searches disagreeing */
const ASKED = [1, 5, 2].map((q) => MAP.questions[q]);
const ORDERS = [
  {
    key: "meaning",
    label: "By meaning (embeddings)",
    about: "The passages whose embeddings point most nearly the question's way. Good with questions worded differently from the page, but a passage that's vaguely about everything can crowd the top.",
  },
  {
    key: "keyword",
    label: "By words (BM25)",
    about: "BM25 ranks passages that share the question's words, rare words counting most. Exact for names like a tool or a company, blind to anything worded differently.",
  },
  {
    key: "fused",
    label: "Both, merged",
    about: "Reciprocal rank fusion: each passage scores by its place in both lists, so one both searches rate rises above one only a single search likes.",
  },
] as const;
/** What each ranking's badge says on a row */
const BADGES = { meaning: "embeddings", keyword: "BM25" } as const;
const LISTED = 5;
const ROW = 38;

/** One question's passages, reordering as the reader switches between the two searches and their merged ranking */
export function FusionFigure({ title }: { title: string }) {
  const [asked, setAsked] = useState(0);
  const [order, setOrder] = useState(0);
  const question = ASKED[asked];
  // Every passage in any ranking's top few, placed by the ranking shown
  const rows = [...new Set(ORDERS.flatMap((o) => question[o.key].slice(0, LISTED)))];
  const place = (p: number, key: (typeof ORDERS)[number]["key"]) => question[key].indexOf(p);
  const ranking = ORDERS[order].key;
  const unplaced = rows.filter((p) => place(p, ranking) < 0);
  const row = (p: number) => (place(p, ranking) >= 0 ? rows.filter((r) => place(r, ranking) >= 0 && place(r, ranking) < place(p, ranking)).length : rows.length - unplaced.length + unplaced.indexOf(p));

  return (
    <figure aria-label={title} className="my-10">
      <Choices label="Question">
        {ASKED.map((q, i) => (
          <Choice key={i} picked={asked === i} onPick={() => setAsked(i)}>
            {q.text}
          </Choice>
        ))}
      </Choices>
      <ol className="relative mt-4" style={{ height: rows.length * ROW }}>
        {rows.map((p) => {
          const point = MAP.points[p];
          const ranked = place(p, ranking) >= 0;
          return (
            <li
              key={`${asked}-${p}`}
              className={`absolute inset-x-0 flex h-[34px] items-center gap-2.5 rounded-lg border border-default-200 px-3 text-[0.84rem] transition-[transform,opacity] duration-700 ease-out-expo motion-reduce:transition-none ${ranked ? "" : "opacity-35"}`}
              style={{ transform: `translateY(${row(p) * ROW}px)` }}
            >
              <span className="w-5 text-default-400 tabular-nums">{ranked ? row(p) + 1 : "–"}</span>
              <span className={`size-2 flex-none rounded-full ${KINDS[point.kind as Kind].dot}`} />
              <span className="min-w-0 flex-1 truncate text-foreground">{point.label}</span>
              {(["meaning", "keyword"] as const).map((key) => (
                <span key={key} className={`flex-none rounded-full px-2 py-0.5 text-[0.7rem] tabular-nums max-sm:hidden ${key === "meaning" ? "bg-primary/15" : "bg-secondary/15"} ${place(p, key) < 0 ? "opacity-30" : ""}`}>
                  {BADGES[key]} {place(p, key) < 0 ? "–" : `#${place(p, key) + 1}`}
                </span>
              ))}
            </li>
          );
        })}
      </ol>
      <Choices label="Ranked">
        {ORDERS.map((o, i) => (
          <Choice key={o.key} picked={order === i} onPick={() => setOrder(i)}>
            {o.label}
          </Choice>
        ))}
      </Choices>
      <Caption>
        <strong className="font-semibold text-foreground">{ORDERS[order].label}.</strong> {ORDERS[order].about}
      </Caption>
    </figure>
  );
}
