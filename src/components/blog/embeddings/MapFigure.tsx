"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { SceneBoundary } from "@/components/three/SceneBoundary";
import { useInViewOnce } from "@/hooks/useInViewOnce";
import { Caption, Choice, Choices, KINDS, MAP, percent, type Kind, type Layout } from "./parts";

// three.js and the scene load in their own chunk, once the map is nearly on screen
const MapCanvas = dynamic(() => import("./MapCanvas"), { ssr: false });

const LAYOUTS: Record<Layout, { label: string; about: string }> = {
  umap: {
    label: "UMAP",
    about: `UMAP keeps neighbours together and lets long distances bend: ${percent(MAP.kept.umap)} of each passage's ${MAP.kept.neighbours} nearest neighbours are still its nearest here.`,
  },
  pca: {
    label: "PCA",
    about: `PCA keeps the three directions the passages spread most along, ${percent(MAP.variance.reduce((a, b) => a + b))} of all their spread, and drops the other ${(MAP.dimensions - 3).toLocaleString("en-GB")}: only ${percent(MAP.kept.pca)} of nearest neighbours survive.`,
  },
};

/** The site's passages in 3D: a still picture until the scene has drawn, then one to turn, flatten two ways, and ask */
export function MapFigure({ title }: { title: string }) {
  const stage = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLDivElement>(null);
  const near = useInViewOnce(stage, "400px");
  const [layout, setLayout] = useState<Layout>("umap");
  const [question, setQuestion] = useState(-1);
  const [focus, setFocus] = useState(-1);
  const [live, setLive] = useState(false);
  const asked = question >= 0 ? MAP.questions[question] : null;

  return (
    <figure aria-label={title} className="my-10">
      <div ref={stage} className="relative h-[380px] select-none overflow-hidden sm:h-[460px]">
        {/* The still picture, in the HTML: the passages seen from the front */}
        <svg aria-hidden viewBox="-1.5 -1.25 3 2.5" className="absolute inset-0 size-full transition-opacity duration-500" style={{ opacity: live ? 0 : 1 }}>
          {MAP.points.map((p, i) => (
            <circle key={i} cx={p.umap[0]} cy={-p.umap[1]} r={0.03} className={KINDS[p.kind as Kind].dot.replace("bg-", "fill-")} />
          ))}
        </svg>
        {near && (
          <SceneBoundary onError={() => setLive(false)}>
            <div className="absolute inset-0 transition-opacity duration-500" style={{ opacity: live ? 1 : 0 }}>
              <MapCanvas layout={layout} question={question} focus={focus} onPoint={setFocus} label={label} onReady={() => setLive(true)} />
            </div>
          </SceneBoundary>
        )}
        <div
          ref={label}
          className="pointer-events-none absolute top-0 left-0 whitespace-nowrap rounded-md border border-primary bg-background/85 px-2 py-0.5 text-[0.74rem] font-medium leading-tight text-foreground opacity-0 transition-opacity duration-150"
        >
          {focus >= 0 ? MAP.points[focus].label : ""}
        </div>
        <ul className="pointer-events-none absolute bottom-1 left-1 flex flex-wrap gap-x-3 gap-y-1 text-[0.72rem] text-default-500">
          {(Object.keys(KINDS) as Kind[]).map((kind) => (
            <li key={kind} className="flex items-center gap-1.5">
              <span className={`size-2 rounded-full ${KINDS[kind].dot}`} />
              {KINDS[kind].label}
            </li>
          ))}
        </ul>
        {/* How it's flattened: a fixed control in the scene's corner, which doesn't turn with it */}
        <label className="absolute top-2 right-2 flex items-center gap-2 rounded-lg border border-default-200 bg-background/80 py-1 pr-1 pl-2.5 text-[0.78rem] text-default-500 backdrop-blur-sm">
          Flattened with
          <select
            value={layout}
            onChange={(e) => setLayout(e.target.value as Layout)}
            className="cursor-pointer rounded-md border border-default-200 bg-background px-2 py-1 text-[0.8rem] font-medium text-foreground focus-visible:outline-2 focus-visible:outline-primary"
          >
            {(Object.keys(LAYOUTS) as Layout[]).map((l) => (
              <option key={l} value={l}>
                {LAYOUTS[l].label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <Choices label="Ask a question">
        {MAP.questions.map((q, i) => (
          <Choice key={i} picked={question === i} onPick={() => setQuestion(question === i ? -1 : i)}>
            {q.text}
          </Choice>
        ))}
      </Choices>

      <Caption>
        <strong className="font-semibold text-foreground">{LAYOUTS[layout].label}.</strong> {LAYOUTS[layout].about}{" "}
        {asked ? (
          <>
            The white point is the question, joined to its {5} nearest passages by meaning, measured in all{" "}
            {MAP.dimensions.toLocaleString("en-GB")} dimensions:{" "}
            {asked.meaning.slice(0, 5).map((p, j) => (
              <span key={p}>
                {j > 0 && ", "}
                <button type="button" className="text-foreground underline decoration-default-300 underline-offset-2" onPointerEnter={() => setFocus(p)} onPointerLeave={() => setFocus(-1)} onFocus={() => setFocus(p)} onBlur={() => setFocus(-1)}>
                  {MAP.points[p].label}
                </button>{" "}
                ({asked.scores[j].toFixed(2)})
              </span>
            ))}
            .
          </>
        ) : (
          "Drag to turn it, point at a passage to name it, or pick a question to drop it in."
        )}
      </Caption>
    </figure>
  );
}
