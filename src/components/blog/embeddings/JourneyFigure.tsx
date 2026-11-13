"use client";

import { useState } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { Caption, Choice, Choices } from "./parts";

type NodeId = "pages" | "passages" | "model" | "table" | "question" | "bm25" | "merge" | "deeves";

const NODES: Record<NodeId, { label: string; about: string }> = {
  pages: { label: "The site's pages", about: "Everything written here: the home page, the About page's roles and skills, and each blog post." },
  passages: { label: "Passages", about: "The pages cut into pieces small enough to be about one thing, each with a fingerprint of its text." },
  model: { label: "Embedding model", about: "Qwen3-Embedding-8B, through OpenRouter: it turns any text into 4,096 numbers that place its meaning." },
  table: { label: "Vector table", about: "A DynamoDB table holding every passage's numbers, with an index that finds the nearest to any point." },
  question: { label: "Your question", about: "Whatever a visitor asks Deeves, the site's assistant, up to 500 characters." },
  bm25: { label: "BM25 search", about: "The word search, run in memory over the same passages: it ranks passages sharing the question's rarer words." },
  merge: { label: "Merge (RRF)", about: "Reciprocal rank fusion: each passage scores by its place in both lists, and the top 10 go on." },
  deeves: { label: "Deeves", about: "The chat model reads those passages and answers from them, citing each one it uses." },
};

/** A link from one node to another, and the stage it plays in: hops in the same stage move together */
interface Hop {
  from: NodeId;
  to: NodeId;
  stage: number;
}

/** Each flow and its hops */
const FLOWS: { label: string; about: string; hops: Hop[] }[] = [
  {
    label: "When it deploys",
    about: "The pages are cut into passages; any whose text is new or changed is embedded and stored. Unchanged ones are left alone, so most deploys embed nothing.",
    hops: [
      { from: "pages", to: "passages", stage: 0 },
      { from: "passages", to: "model", stage: 1 },
      { from: "model", to: "table", stage: 2 },
    ],
  },
  {
    label: "When you ask",
    about: "The question is embedded by the same model and the table finds the nearest passages, while BM25 ranks them by words; the two lists are merged, and the best 10 go to Deeves.",
    hops: [
      { from: "question", to: "model", stage: 0 },
      { from: "question", to: "bm25", stage: 0 },
      { from: "model", to: "table", stage: 1 },
      { from: "table", to: "merge", stage: 2 },
      { from: "bm25", to: "merge", stage: 2 },
      { from: "merge", to: "deeves", stage: 3 },
    ],
  },
];

/** Every link drawn, whichever flow it's in */
const LINKS: Hop[] = [...new Map(FLOWS.flatMap((f) => f.hops).map((h) => [`${h.from}-${h.to}`, h] as const)).values()];

/** Where each node sits: wide, in two rows (deploying above, asking below), and narrow, in two columns */
const LAYOUTS: Record<"wide" | "narrow", { box: { width: number; height: number }; at: Record<NodeId, readonly [number, number]> }> = {
  wide: {
    box: { width: 640, height: 300 },
    at: { pages: [70, 50], passages: [215, 50], model: [335, 150], table: [470, 50], question: [70, 250], bm25: [215, 250], merge: [450, 250], deeves: [575, 250] },
  },
  narrow: {
    box: { width: 340, height: 540 },
    at: { pages: [92, 40], passages: [92, 120], model: [170, 215], table: [250, 120], question: [92, 310], bm25: [92, 400], merge: [250, 400], deeves: [250, 490] },
  },
};

const NODE = { width: 124, height: 36 };
/** Seconds a dot takes over one hop, and the pause before the flow plays again */
const HOP = 1.1;
const REST = 1.2;

function Diagram({ layout, flow, focus, onFocus }: { layout: keyof typeof LAYOUTS; flow: number; focus: NodeId | null; onFocus: (node: NodeId | null) => void }) {
  const { box, at } = LAYOUTS[layout];
  const still = useReducedMotion();
  const { hops } = FLOWS[flow];
  const inFlow = (from: NodeId, to: NodeId) => hops.some((h) => h.from === from && h.to === to);
  const lit = new Set<NodeId>(hops.flatMap((h) => [h.from, h.to]));
  const stages = Math.max(...hops.map((h) => h.stage)) + 1;
  const cycle = stages * HOP + REST;
  const id = (from: string, to: string) => `journey-${layout}-${from}-${to}`;

  return (
    <svg viewBox={`0 0 ${box.width} ${box.height}`} className={`w-full ${layout === "wide" ? "hidden sm:block" : "sm:hidden"}`}>
      {LINKS.map(({ from, to }) => {
        const on = inFlow(from, to);
        return (
          <path
            key={`${from}-${to}`}
            id={id(from, to)}
            d={`M ${at[from][0]} ${at[from][1]} L ${at[to][0]} ${at[to][1]}`}
            fill="none"
            strokeWidth={on ? 2 : 1}
            className={`transition-colors duration-300 ${on ? "stroke-primary" : "stroke-default-300"}`}
          />
        );
      })}
      {/* A dot along each hop of the flow, in its turn: the flow plays, rests, and plays again */}
      {!still &&
        hops.map((h) => {
          const start = (h.stage * HOP) / cycle;
          const end = ((h.stage + 1) * HOP) / cycle;
          return (
            <circle key={`${flow}-${h.from}-${h.to}`} r={5} className="fill-primary" opacity={0}>
              <animateMotion dur={`${cycle}s`} repeatCount="indefinite" keyTimes={`0;${start};${end};1`} keyPoints="0;0;1;1" calcMode="linear">
                <mpath href={`#${id(h.from, h.to)}`} />
              </animateMotion>
              <animate
                attributeName="opacity"
                dur={`${cycle}s`}
                repeatCount="indefinite"
                keyTimes={`0;${start};${start + 0.01};${end - 0.01};${end};1`}
                values="0;0;1;1;0;0"
              />
            </circle>
          );
        })}
      {(Object.keys(NODES) as NodeId[]).map((node) => {
        const [x, y] = at[node];
        const on = lit.has(node);
        return (
          <g
            key={node}
            tabIndex={0}
            aria-label={`${NODES[node].label}: ${NODES[node].about}`}
            className="cursor-default outline-none"
            onPointerEnter={() => onFocus(node)}
            onPointerLeave={() => onFocus(null)}
            onFocus={() => onFocus(node)}
            onBlur={() => onFocus(null)}
          >
            <rect
              x={x - NODE.width / 2}
              y={y - NODE.height / 2}
              width={NODE.width}
              height={NODE.height}
              rx={10}
              strokeWidth={focus === node ? 2 : 1.25}
              className={`fill-background transition-colors duration-300 ${focus === node || on ? "stroke-primary" : "stroke-default-300"}`}
            />
            <text x={x} y={y + 4.5} textAnchor="middle" className={`text-[13px] font-medium transition-colors duration-300 ${on ? "fill-foreground" : "fill-default-400"}`}>
              {NODES[node].label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** How a page becomes searchable passages, and how a question finds them: two flows through the same parts */
export function JourneyFigure({ title }: { title: string }) {
  const [flow, setFlow] = useState(1);
  const [focus, setFocus] = useState<NodeId | null>(null);
  const props = { flow, focus, onFocus: setFocus };

  return (
    <figure aria-label={title} className="my-10">
      <Diagram layout="wide" {...props} />
      <Diagram layout="narrow" {...props} />
      <Choices label="Follow a flow">
        {FLOWS.map((f, i) => (
          <Choice key={f.label} picked={flow === i} onPick={() => setFlow(i)}>
            {f.label}
          </Choice>
        ))}
      </Choices>
      <Caption>
        {focus ? (
          <>
            <strong className="font-semibold text-foreground">{NODES[focus].label}.</strong> {NODES[focus].about}
          </>
        ) : (
          <>
            <strong className="font-semibold text-foreground">{FLOWS[flow].label}.</strong> {FLOWS[flow].about}
          </>
        )}
      </Caption>
    </figure>
  );
}
