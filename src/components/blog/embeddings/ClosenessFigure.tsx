"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { useOnScreen } from "@/hooks/useOnScreen";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { Caption, Choice, Choices, MAP, styleNumber } from "./parts";

/**
 * Made-up passages with just two numbers each, so they can be drawn: how much each is
 * about databases (x) and about leading people (y)
 */
const PASSAGES = [
  { label: "Drizzle", at: [0.92, 0.12] },
  { label: "SQLAlchemy", at: [0.84, 0.24] },
  { label: "Roke role", at: [0.56, 0.62] },
  { label: "Capita consultant role", at: [0.28, 0.9] },
  { label: "Home page intro", at: [0.3, 0.27] },
] as const;
const QUESTIONS = [
  { text: "Which databases has he used?", angle: Math.atan2(0.15, 0.95) },
  { text: "Has he led a team?", angle: Math.atan2(0.95, 0.2) },
];
/** The plot: where nought is, and how many units across one is */
const O = { x: 34, y: 262 };
const S = 230;
const ROW = 32;
/** Seconds per sweep, while the reader hasn't taken over */
const SWEEP = 10;
const LIMIT = { min: 0.06, max: Math.PI / 2 - 0.06 };

const at = ([x, y]: readonly number[]) => ({ x: O.x + x * S, y: O.y - y * S });
const degrees = (radians: number) => Math.round((radians * 180) / Math.PI);
/** An arc from angle `a` to `b` around nought, `r` units out */
function arc(a: number, b: number, r: number) {
  const [from, to] = [Math.min(a, b), Math.max(a, b)];
  const p = (t: number) => `${(O.x + Math.cos(t) * r * S).toFixed(1)} ${(O.y - Math.sin(t) * r * S).toFixed(1)}`;
  return `M ${p(from)} A ${r * S} ${r * S} 0 0 0 ${p(to)}`;
}

/** A question's arrow among a few passages' arrows: the nearer one points the same way, the higher it ranks */
export function ClosenessFigure({ title }: { title: string }) {
  const svg = useRef<SVGSVGElement>(null);
  const onScreen = useOnScreen(svg, { threshold: 0.4 });
  const still = useReducedMotion();
  const [angle, setAngle] = useState(QUESTIONS[0].angle);
  // The reader takes over by picking a question or dragging the arrow: then it stops sweeping
  const [held, setHeld] = useState(false);
  const dragging = useRef(false);

  useEffect(() => {
    if (held || still || !onScreen) return;
    let frame = 0;
    const start = performance.now();
    const middle = (LIMIT.min + LIMIT.max) / 2;
    const reach = (LIMIT.max - LIMIT.min) / 2;
    // Starts from the databases question, at the bottom of the sweep
    const step = (now: number) => {
      setAngle(middle - reach * Math.cos((((now - start) / 1000) * 2 * Math.PI) / SWEEP));
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [held, still, onScreen]);

  const scored = PASSAGES.map((p) => {
    const length = Math.hypot(...p.at);
    return { ...p, score: (Math.cos(angle) * p.at[0] + Math.sin(angle) * p.at[1]) / length, angle: Math.atan2(p.at[1], p.at[0]) };
  });
  const ranked = [...scored].sort((a, b) => b.score - a.score);
  const best = ranked[0];
  const tip = at([Math.cos(angle), Math.sin(angle)]);

  function aim(e: PointerEvent<SVGSVGElement>) {
    const box = svg.current!.getBoundingClientRect();
    const x = ((e.clientX - box.left) / box.width) * 320 - O.x;
    const y = O.y - ((e.clientY - box.top) / box.height) * 300;
    setAngle(Math.min(LIMIT.max, Math.max(LIMIT.min, Math.atan2(y, x))));
  }

  return (
    <figure aria-label={title} className="my-10">
      <div className="grid items-center gap-x-6 gap-y-2 sm:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <svg
          ref={svg}
          viewBox="0 0 320 300"
          className="w-full touch-pan-y select-none overflow-visible"
          onPointerDown={(e) => {
            dragging.current = true;
            setHeld(true);
            e.currentTarget.setPointerCapture(e.pointerId);
            aim(e);
          }}
          onPointerMove={(e) => dragging.current && aim(e)}
          onPointerUp={() => (dragging.current = false)}
          onPointerCancel={() => (dragging.current = false)}
        >
          <defs>
            <marker id="closeness-head" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" className="fill-foreground" />
            </marker>
          </defs>
          {/* Axes */}
          <line x1={O.x} y1={O.y} x2={O.x + 1.12 * S} y2={O.y} strokeWidth={1} className="stroke-default-300" />
          <line x1={O.x} y1={O.y} x2={O.x} y2={O.y - 1.12 * S} strokeWidth={1} className="stroke-default-300" />
          <text x={O.x + 1.12 * S} y={O.y + 22} textAnchor="end" className="fill-default-500 text-[11px]">
            about databases →
          </text>
          <text x={O.x - 10} y={O.y - 1.12 * S} textAnchor="start" transform={`rotate(-90 ${O.x - 10} ${O.y - 1.12 * S})`} dx={-118} className="fill-default-500 text-[11px]">
            about leading people →
          </text>
          {/* The angle between the question and the passage nearest it */}
          <path d={arc(angle, best.angle, 0.22)} fill="none" strokeWidth={1.5} className="stroke-primary/70" />
          {/* The passages */}
          {scored.map((p) => {
            const end = at(p.at);
            const lit = p === best;
            return (
              <g key={p.label} style={{ opacity: styleNumber(0.25 + 0.75 * Math.max(0, p.score) ** 3) }}>
                <line x1={O.x} y1={O.y} x2={end.x} y2={end.y} strokeWidth={lit ? 3 : 2} strokeLinecap="round" className={lit ? "stroke-primary" : "stroke-default-400"} />
                <circle cx={end.x} cy={end.y} r={lit ? 5 : 4} className={lit ? "fill-primary" : "fill-default-400"} />
                <text x={end.x + 8} y={end.y + 4} className={`text-[11px] ${lit ? "fill-foreground font-semibold" : "fill-default-500"}`}>
                  {p.label}
                </text>
              </g>
            );
          })}
          {/* The question: drag its end to aim it */}
          <line x1={O.x} y1={O.y} x2={tip.x} y2={tip.y} strokeWidth={3} strokeLinecap="round" markerEnd="url(#closeness-head)" className="stroke-foreground" />
          <circle cx={tip.x} cy={tip.y} r={14} className="cursor-grab fill-foreground/10" />
          {/* Past the arrow's tip, clear of the passages' labels */}
          <text
            x={tip.x + Math.cos(angle) * 22}
            y={tip.y - Math.sin(angle) * 22 + 4}
            textAnchor={angle < 1 ? "start" : "middle"}
            className="fill-foreground text-[11px] font-semibold"
          >
            Question
          </text>
        </svg>

        <ol className="relative" style={{ height: PASSAGES.length * ROW }}>
          {scored.map((p) => {
            const place = ranked.indexOf(p);
            return (
              <li
                key={p.label}
                className="absolute inset-x-0 flex h-[28px] items-center gap-2.5 rounded-lg border border-default-200 px-3 text-[0.82rem] transition-transform duration-300 ease-out-expo motion-reduce:transition-none"
                style={{ transform: `translateY(${place * ROW}px)` }}
              >
                <span className="w-4 text-default-400 tabular-nums">{place + 1}</span>
                <span className={`min-w-0 flex-1 truncate ${place === 0 ? "font-semibold text-foreground" : "text-default-600"}`}>{p.label}</span>
                <span className="tabular-nums text-default-500">{p.score.toFixed(2)}</span>
              </li>
            );
          })}
        </ol>
      </div>

      <Choices label="Aim at a question">
        {QUESTIONS.map((q) => (
          <Choice
            key={q.text}
            picked={held && Math.abs(angle - q.angle) < 0.01}
            onPick={() => {
              setHeld(true);
              setAngle(q.angle);
            }}
          >
            {q.text}
          </Choice>
        ))}
      </Choices>
      <Caption>
        <strong className="font-semibold text-foreground">
          {best.label} is nearest: {degrees(Math.abs(angle - best.angle))}° apart, similarity {best.score.toFixed(2)}.
        </strong>{" "}
        Each score is how nearly a passage&apos;s arrow points the question&apos;s way: 1 for the same direction, 0 at right angles. Only direction counts, so the home page&apos;s short arrow would score the same at any length. These two numbers are made up so they can be drawn; the real search does the same sum over all {MAP.dimensions.toLocaleString("en-GB")}.
        {!held && " Drag the question's arrow, or pick one."}
      </Caption>
    </figure>
  );
}
