"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { SceneBoundary } from "@/components/three/SceneBoundary";
import { useInViewOnce } from "@/hooks/useInViewOnce";
import { useOnScreen } from "@/hooks/useOnScreen";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type { FigureView, Readout } from "./NetworkFigureCanvas";

// three.js and the network load in their own chunk, once the figure is nearly on screen
const NetworkFigureCanvas = dynamic(() => import("./NetworkFigureCanvas"), { ssr: false });

const TITLES: Record<FigureView, string> = {
  draws: "The network drawn one draw call at a time",
  physics: "Nodes pushed by a cursor and pulled back to their drift paths",
  grid: "The grid connections are found with",
};

/** The draws view's draw calls, in the order they're drawn */
const DRAW_CALLS = ["Your cursor's glow", "Connections", "Nodes"];
/** Its frame, built up a draw call at a time, then held */
const PLAY = [0, 1, 2, 2];
const PLAY_MS = 1600;

/** A live number, or "…" until there is one */
const count = (n: number | undefined) => (n === undefined ? "…" : n.toLocaleString("en-GB"));

/** What the draws view's caption says while each draw call is shown */
function drawCallCaption(step: number, r: Readout | null): ReactNode {
  const n = <strong>Draw call {step + 1} of 3.</strong>;
  if (step === 0)
    return (
      <>
        {n} Your cursor&apos;s glow, one sprite. On the home page, other visitors&apos; glows come first, in one more.
      </>
    );
  if (step === 1)
    return (
      <>
        {n} Every connection, {count(r?.links)} right now, in one batch of instanced quads.
      </>
    );
  return (
    <>
      {n} Every node, all {count(r?.nodes)}, as one set of point sprites.
    </>
  );
}

function caption(view: FigureView, step: number, r: Readout | null, still: boolean): ReactNode {
  if (view === "draws") {
    // All three share one space, so the caption never changes height as they play
    return (
      <span className="grid">
        {DRAW_CALLS.map((_, i) => (
          <span key={i} aria-hidden={i !== step} className={`[grid-area:1/1] ${i === step ? "" : "invisible"}`}>
            {drawCallCaption(i, r)}
          </span>
        ))}
      </span>
    );
  }
  if (view === "physics")
    return (
      <>
        <strong>Point at the nodes to push them.</strong> Each is pulled back towards where its drift path has it
        (the faint lines).
        {still ? (
          " With reduced motion on, it holds still."
        ) : (
          <>
            {" "}
            Your screen: {count(r?.fps || undefined)} frames a second. The physics:{" "}
            {count(r?.stepsPerSecond || undefined)} steps.
          </>
        )}
      </>
    );
  return (
    <>
      <strong>Cells one link-distance wide.</strong> A node&apos;s links can only be in its own cell or the eight
      around it, so this one is compared with {count(r?.checked)} nodes, not all {count(r?.others)}. Across the
      network, that&apos;s {count(r?.compared)} comparisons instead of {count(r?.pairs)}.
    </>
  );
}

/**
 * A small copy of the home page's network, to show how it works: `draws` builds a frame
 * up one draw call at a time, `physics` shows the cursor's push and each node's pull
 * back, and `grid` shows how connections are found. Posts use it without importing it:
 *
 *   <NetworkFigure show="grid" />
 */
export function NetworkFigure({ show }: { show: FigureView }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const near = useInViewOnce(stageRef, "400px");
  const onScreen = useOnScreen(stageRef);
  const still = useReducedMotion();
  const [live, setLive] = useState(false);
  const [failed, setFailed] = useState(false);
  const [readout, setReadout] = useState<Readout | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);
  const [beat, setBeat] = useState(0);

  // Plays through the draw calls while on screen, unless one is picked or motion is reduced
  const playing = show === "draws" && live && onScreen && pinned === null && !still;
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => setBeat((b) => (b + 1) % PLAY.length), PLAY_MS);
    return () => window.clearInterval(id);
  }, [playing]);
  const step = pinned ?? (still ? 2 : PLAY[beat]);

  return (
    <figure
      aria-label={TITLES[show]}
      className="my-10 overflow-hidden rounded-2xl border border-default-200 bg-default-50/60 dark:bg-white/[0.02]"
    >
      <div ref={stageRef} className="relative h-[240px] select-none overflow-hidden sm:h-[280px]">
        {near && (
          <SceneBoundary onError={() => setFailed(true)}>
            <div className="absolute inset-0 transition-opacity duration-500" style={{ opacity: live ? 1 : 0 }}>
              <NetworkFigureCanvas view={show} step={step} onReadout={setReadout} onReady={() => setLive(true)} />
            </div>
          </SceneBoundary>
        )}
        {failed && (
          <p className="absolute inset-0 grid place-items-center text-sm text-default-500">
            This figure needs WebGL, which this browser doesn&apos;t offer.
          </p>
        )}
      </div>

      {show === "draws" && (
        <div role="group" aria-label="Draw calls" className="flex flex-wrap gap-2 border-t border-default-200 px-4 pb-1 pt-3">
          {DRAW_CALLS.map((label, i) => (
            <button
              key={label}
              type="button"
              aria-pressed={pinned === i}
              // Picking a draw call holds it; picking it again plays them through again
              onClick={() => setPinned((current) => (current === i ? null : i))}
              className={`rounded-full border px-3 py-1.5 text-[0.82rem] font-medium leading-none transition-colors ${
                step === i
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-default-200 text-default-500 hover:border-default-400 hover:text-foreground"
              }`}
            >
              {i + 1}. {label}
            </button>
          ))}
        </div>
      )}

      <figcaption
        className={`px-4 pb-4 text-[0.9rem] leading-relaxed text-default-500 tabular-nums ${
          show === "draws" ? "pt-2" : "border-t border-default-200 pt-3"
        }`}
      >
        {caption(show, step, readout, still)}
      </figcaption>
    </figure>
  );
}
