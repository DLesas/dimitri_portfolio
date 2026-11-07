/**
 * Where a diagram's nodes land on its stage. The same numbers place the still picture and
 * the labels (in CSS, before three.js has loaded or without WebGL) and aim the 3D camera,
 * so the live scene starts exactly where the picture was.
 *
 * Picture units are what the camera sees: a point's distance across (or up) from the
 * camera's axis over its distance from the camera.
 */
import type { CSSProperties } from "react";
import type { z } from "zod";
import type { diagramSchema } from "./schema";

export const FOV = 38;
export const CAMERA_DISTANCE = 44;
/** The view it opens at, in radians: turned a little, to show its depth */
export const OPENING_YAW = -0.25;
export const OPENING_PITCH = 0.12;

/** A node's sprite, halo included, in diagram units; the sphere is CORE of it across */
export const NODE_SIZE = { off: 2.2, on: 3.2 };
export const CORE = 0.26;

/** Labels hang this far below their node's centre (or, when they'd overlap, rise above it), in CSS pixels */
export const LABEL_GAP = 14;
export const LABEL_RISE = 10;
/** On a stage narrower than this, only the picked flow's labels show (the label classes use the same width) */
export const NARROW_STAGE = 480;

/** Room around the nodes for their labels, in CSS pixels */
const PAD_TOP = 16;
const PAD_BOTTOM = 38;
const padX = (width: number) => Math.min(72, Math.max(44, width * 0.11));
const PAD_X_CSS = "clamp(44px, 11cqw, 72px)";

export type Vec3 = [number, number, number];
type Diagram = z.output<typeof diagramSchema>;

export interface DiagramGraph {
  /** Each node's position, moved so the middle of them all is at the origin, where the camera looks */
  positions: Vec3[];
  /** Every hop of every flow, once whichever way it goes */
  edges: { a: number; b: number; flows: number[] }[];
  /** Each flow's hops in order, as node indices */
  hops: [number, number][][];
  /** inFlow[flow][node]: whether the node is one of the flow's */
  inFlow: boolean[][];
}

export interface DiagramPicture {
  /** Each node at the opening view, from the middle of the picture (x across, y up), and its distance scale */
  points: { x: number; y: number; scale: number }[];
  /** The picture's size at the opening view */
  width: number;
  height: number;
  /** Where its middle is, from the camera's axis */
  middle: [number, number];
}

/** Rotates a point as three.js does for a rotation of (pitch, yaw, 0): about y, then about x */
function rotate([x, y, z]: Vec3, yaw: number, pitch: number): Vec3 {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  const x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
  return [x1, y * cp - z1 * sp, y * sp + z1 * cp];
}

const round = (n: number) => Math.round(n * 1e5) / 1e5;

/** The diagram's links and its picture at the opening view */
export function layOut({ nodes, flows }: Diagram): { graph: DiagramGraph; picture: DiagramPicture } {
  const index = new Map(nodes.map((n, i) => [n.id, i]));
  const mid = [0, 1, 2].map((k) => {
    const values = nodes.map((n) => n.position[k]);
    return (Math.min(...values) + Math.max(...values)) / 2;
  });
  const positions = nodes.map((n) => n.position.map((v, k) => v - mid[k]) as Vec3);

  const edges: DiagramGraph["edges"] = [];
  const hops = flows.map((flow, f) =>
    flow.path.map(([from, to]) => {
      const a = index.get(from)!, b = index.get(to)!;
      let edge = edges.find((e) => (e.a === a && e.b === b) || (e.a === b && e.b === a));
      if (!edge) edges.push((edge = { a, b, flows: [] }));
      if (!edge.flows.includes(f)) edge.flows.push(f);
      return [a, b] as [number, number];
    })
  );
  const inFlow = hops.map((flowHops) => nodes.map((_, i) => flowHops.some(([a, b]) => a === i || b === i)));

  const seen = positions.map((p) => {
    const [x, y, z] = rotate(p, OPENING_YAW, OPENING_PITCH);
    const scale = 1 / (CAMERA_DISTANCE - z);
    return { x: x * scale, y: y * scale, scale };
  });
  const xs = seen.map((p) => p.x), ys = seen.map((p) => p.y);
  const middle: [number, number] = [
    (Math.min(...xs) + Math.max(...xs)) / 2,
    (Math.min(...ys) + Math.max(...ys)) / 2,
  ];
  return {
    graph: { positions, edges, hops, inFlow },
    picture: {
      points: seen.map((p) => ({ x: round(p.x - middle[0]), y: round(p.y - middle[1]), scale: round(p.scale) })),
      width: round(Math.max(...xs) - Math.min(...xs)),
      height: round(Math.max(...ys) - Math.min(...ys)),
      middle,
    },
  };
}

/**
 * The picture fitted to a stage, `width` by `height` CSS pixels: CSS pixels per picture
 * unit, and where the picture's middle sits on the stage
 */
export function fit(width: number, height: number, { width: w, height: h }: DiagramPicture) {
  const scale = Math.max(1e-3, Math.min((width - 2 * padX(width)) / w, (height - PAD_TOP - PAD_BOTTOM) / h));
  return { scale, middle: [width / 2, PAD_TOP + (height - PAD_TOP - PAD_BOTTOM) / 2] as const };
}

/**
 * The same fit in CSS, as custom properties for an element inside the stage (a size
 * container): --scale per picture unit, and the middle at (50cqw, --middle-y)
 */
export function fitCss({ width, height }: DiagramPicture) {
  return {
    "--scale": `min((100cqw - 2 * ${PAD_X_CSS}) / ${width}, (100cqh - ${PAD_TOP + PAD_BOTTOM}px) / ${height})`,
    "--middle-y": `calc(${PAD_TOP}px + (100cqh - ${PAD_TOP + PAD_BOTTOM}px) / 2)`,
  } as CSSProperties;
}
