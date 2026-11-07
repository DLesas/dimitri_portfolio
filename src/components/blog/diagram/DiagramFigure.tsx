"use client";

import { useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { SceneBoundary } from "@/components/three/SceneBoundary";
import { useInViewOnce } from "@/hooks/useInViewOnce";
import { CORE, LABEL_GAP, NODE_SIZE, fitCss, type DiagramGraph, type DiagramPicture } from "./layout";

// three.js and the scene load in their own chunk, once the diagram is nearly on screen
const DiagramCanvas = dynamic(() => import("./DiagramCanvas"), { ssr: false });

interface Item {
  label: string;
  description: string;
}

interface DiagramFigureProps {
  title: string;
  nodes: Item[];
  flows: Item[];
  graph: DiagramGraph;
  picture: DiagramPicture;
}

/**
 * A post diagram: the stage (a still picture, replaced by the 3D scene once it has drawn,
 * with the labels over both), the flows to pick from, and a caption describing the picked
 * flow, or the node pointed at
 */
export function DiagramFigure({ title, nodes, flows, graph, picture }: DiagramFigureProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const labels = useRef<(HTMLElement | null)[]>([]);
  const near = useInViewOnce(stageRef, "400px");
  const [flow, setFlow] = useState(0);
  const [pointed, setPointed] = useState(-1);
  const [picked, setPicked] = useState(-1);
  const [live, setLive] = useState(false);

  const focus = pointed >= 0 ? pointed : picked;
  const inFlow = graph.inFlow[flow];
  const fitStyle = useMemo(() => fitCss(picture), [picture]);
  const { width: w, height: h } = picture;
  // The caption shows one of these; all of them share its space, so it never changes height
  const captions = [...flows, ...nodes];
  const caption = focus >= 0 ? flows.length + focus : flow;

  return (
    <figure aria-label={title} className="my-10">
      <div ref={stageRef} className="relative h-[340px] select-none overflow-hidden [container-type:size] sm:h-[400px]">
        <div className="absolute inset-0" style={fitStyle}>
          {/* The still picture, drawn in the HTML: until the 3D scene has drawn, or without it */}
          <svg
            aria-hidden
            viewBox={`${-w / 2} ${-h / 2} ${w} ${h}`}
            preserveAspectRatio="none"
            className="absolute overflow-visible transition-opacity duration-500"
            style={{
              left: `calc(50cqw - ${w / 2} * var(--scale))`,
              top: `calc(var(--middle-y) - ${h / 2} * var(--scale))`,
              width: `calc(${w} * var(--scale))`,
              height: `calc(${h} * var(--scale))`,
              opacity: live ? 0 : 1,
            }}
          >
            {graph.edges.map(({ a, b, flows: on }) => {
              const lit = on.includes(flow);
              return (
                <line
                  key={`${a}-${b}`}
                  x1={picture.points[a].x}
                  y1={-picture.points[a].y}
                  x2={picture.points[b].x}
                  y2={-picture.points[b].y}
                  vectorEffect="non-scaling-stroke"
                  strokeWidth={lit ? 2.6 : 1.2}
                  className={lit ? "stroke-primary/90" : "stroke-default-300"}
                />
              );
            })}
            {picture.points.map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={-p.y}
                r={(inFlow[i] ? NODE_SIZE.on : NODE_SIZE.off) * (CORE / 2) * p.scale}
                className={inFlow[i] ? "fill-primary" : "fill-default-300"}
              />
            ))}
          </svg>

          {/* Without WebGL, or if the scene fails, the still picture stays */}
          {near && (
            <SceneBoundary onError={() => setLive(false)}>
              <div className="absolute inset-0 transition-opacity duration-500" style={{ opacity: live ? 1 : 0 }}>
                <DiagramCanvas
                  graph={graph}
                  picture={picture}
                  flow={flow}
                  focus={focus}
                  labels={labels}
                  onPoint={setPointed}
                  onTap={(node) => setPicked((current) => (node === current ? -1 : node))}
                  onReady={() => setLive(true)}
                />
              </div>
            </SceneBoundary>
          )}

          <div className="pointer-events-none absolute inset-0">
            {nodes.map((node, i) => (
              <button
                key={i}
                ref={(el) => {
                  labels.current[i] = el;
                }}
                type="button"
                aria-pressed={picked === i}
                onPointerEnter={(e) => e.pointerType === "mouse" && setPointed(i)}
                onPointerLeave={() => setPointed(-1)}
                onFocus={() => setPointed(i)}
                onBlur={() => setPointed(-1)}
                onClick={() => setPicked((current) => (current === i ? -1 : i))}
                // On a narrow stage, labels outside the flow are hidden, so they mustn't catch
                // taps or drags meant for the scene; a keyboard can still reach them
                className={`pointer-events-auto absolute whitespace-nowrap rounded-md border bg-background/75 px-2 py-0.5 text-[0.74rem] font-medium leading-tight text-foreground transition-[opacity,border-color] duration-200 @max-[480px]:px-1.5 @max-[480px]:text-[0.68rem] ${
                  focus === i ? "border-primary" : "border-default-200"
                } ${inFlow[i] || focus === i ? "" : "opacity-40 @max-[480px]:pointer-events-none @max-[480px]:opacity-0 focus-visible:opacity-100"}`}
                style={{
                  left: `calc(50cqw + ${picture.points[i].x} * var(--scale))`,
                  top: `calc(var(--middle-y) - ${picture.points[i].y} * var(--scale))`,
                  transform: `translate(-50%, ${LABEL_GAP}px)`,
                }}
              >
                {node.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div role="group" aria-label="Follow a flow" className="flex flex-wrap gap-2 pt-2">
        {flows.map((f, i) => (
          <button
            key={i}
            type="button"
            aria-pressed={flow === i}
            onClick={() => {
              setFlow(i);
              setPicked(-1);
            }}
            className={`rounded-full border px-3 py-1.5 text-[0.82rem] font-medium leading-none transition-colors ${
              flow === i
                ? "border-primary bg-primary text-primary-foreground"
                : "border-default-200 text-default-500 hover:border-default-400 hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <figcaption aria-live="polite" className="grid pt-3 text-[0.9rem] leading-relaxed text-default-500">
        {captions.map((item, i) => (
          <p key={i} className={`[grid-area:1/1] ${i === caption ? "" : "invisible"}`}>
            <strong className="font-semibold text-foreground">{item.label}.</strong> {item.description}
          </p>
        ))}
      </figcaption>
    </figure>
  );
}
