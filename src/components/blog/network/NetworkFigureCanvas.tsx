"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useTheme } from "next-themes";
import { ANIMATION_CONFIG as A, EFFECTS_CONFIG, VISUAL_CONFIG } from "@/components/NetworkBackground/constants";
import { createNetworkEngine, type FrameContext, type NetworkInputs } from "@/components/NetworkBackground/networkEngine";
import { PX_PER_UNIT } from "@/components/NetworkBackground/world";
import DebugPerf from "@/components/three/DebugPerf";
import { networkPalette, type NetworkPalette } from "@/components/three/palette";
import { useSceneEngine } from "@/components/three/useSceneEngine";
import { useThemeColors } from "@/contexts/ThemeColorsContext";
import type { NetworkBackgroundSettings } from "@/contexts/SettingsContext";
import { useOnScreen } from "@/hooks/useOnScreen";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import {
  clearOverlay,
  comparisons,
  drawGrid,
  drawPointer,
  drawSprings,
  inReach,
  neighboursOf,
  sortIntoGrid,
  type OverlayStyle,
} from "./overlay";

/** What a figure shows of the network: its draw calls, its physics, or its grid */
export type FigureView = "draws" | "physics" | "grid";

/** What the figure's caption reports, a few times a second */
export interface Readout {
  nodes: number;
  links: number;
  /** Frames drawn, and physics steps run, per second */
  fps: number;
  stepsPerSecond: number;
  /** The grid: the focus node's neighbours, of how many others; links within reach */
  checked: number;
  others: number;
  linked: number;
  /** The grid: pairs compared across the network, of every pair */
  compared: number;
  pairs: number;
}

/**
 * The home page's network settings, at a smaller scale: shorter links and a smaller push,
 * so a stage a few hundred pixels across shows several grid cells and its whole reach
 */
const SETTINGS: NetworkBackgroundSettings = {
  nodeCount: 0, // set from the stage's size
  nodeRadius: 0.15,
  nodeOpacity: VISUAL_CONFIG.NODE_OPACITY,
  organicMovementSpeed: A.ORGANIC_MOVEMENT_SPEED,
  connectionDistance: 4,
  maxConnections: 120,
  connectionLineWidth: A.CONNECTION_LINE_WIDTH,
  mouseRepulsionRadius: 7,
  mouseRepulsionStrength: A.MOUSE_REPULSION_STRENGTH,
  domCollisionPadding: A.DOM_COLLISION_PADDING,
  domCollisionStrength: A.DOM_REPULSION_FORCE,
  domCollisionThreshold: A.DOM_COLLISION_THRESHOLD,
  glowIntensity: EFFECTS_CONFIG.GLOW_INTENSITY,
  pulseDensity: EFFECTS_CONFIG.PULSE_DENSITY,
  pulseSpeed: EFFECTS_CONFIG.PULSE_SPEED,
};
/** Nodes per square world unit: denser than the home page, so a small stage has enough */
const DENSITY = 0.09;
const MAX_NODES = 64;
/**
 * Stages narrower than this are zoomed out to show as much of the network: the grid only
 * makes its point with several cells across. Nodes and lines keep their size in pixels.
 */
const FULL_WIDTH = 640;
/** How long the grid view keeps a node in focus when the reader isn't pointing (seconds) */
const FOCUS_SECONDS = 2.4;
const GLOW_BOOST = 3;
const DIMMED_LINKS = 0.35;
const READOUT_SECONDS = 0.25;

interface SceneProps {
  view: FigureView;
  /** The draws view: draw calls shown so far (0: the glow, 1: + connections, 2: + nodes) */
  step: number;
  palette: NetworkPalette;
  style: OverlayStyle;
  still: boolean;
  overlay: RefObject<HTMLCanvasElement | null>;
  onReadout: (readout: Readout) => void;
  onReady: () => void;
}

/** Drives the network engine for the figure, and draws what it shows on top */
function FigureScene({ view, step, palette, style, still, overlay, onReadout, onReady }: SceneProps) {
  const getThreeState = useThree((state) => state.get);
  const invalidate = useThree((state) => state.invalidate);
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);
  const zoom = PX_PER_UNIT * Math.min(1, width / FULL_WIDTH);
  const engineRef = useSceneEngine(createNetworkEngine);
  const inputs = useRef<NetworkInputs>({
    settings: SETTINGS,
    connectionDistance: SETTINGS.connectionDistance,
    performanceLevel: "high",
    still,
  });
  const frameContext = useRef<FrameContext>({
    width: 0,
    height: 0,
    dpr: 1,
    mouse: { x: 0, y: 0, isActive: false },
    remotes: [],
    colliders: [],
  });
  /** Where the reader is pointing (world units), or null: then the demo cursor moves */
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const loop = useRef({
    demoTime: 0,
    // Each draw call's share shown, eased: the glow, connections, nodes
    shown: [0, 0, 0],
    focus: -1,
    focusFor: 0,
    homes: new Float32Array(0),
    frames: 0,
    elapsed: 0,
    stepsBefore: 0,
    fps: 0,
    stepsPerSecond: 0,
    readoutIn: 0,
    ready: false,
  });

  useEffect(() => {
    inputs.current.still = still;
  }, [still]);

  // Another draw call picked: draw again (with reduced motion, it only draws when asked)
  useEffect(() => invalidate(), [step, invalidate]);

  // As many nodes as the stage's size calls for, spread over it
  useEffect(() => {
    const { camera } = getThreeState();
    camera.zoom = zoom;
    camera.updateProjectionMatrix();
    const w = width / zoom, h = height / zoom;
    const count = Math.min(MAX_NODES, Math.round(w * h * DENSITY));
    engineRef.current?.setNodeCount(count, w, h, inputs.current, { width: w * 0.95, height: h * 0.9 });
    invalidate();
  }, [width, height, zoom, getThreeState, invalidate, engineRef]);

  useEffect(() => {
    engineRef.current?.setPalette(palette);
    invalidate();
  }, [palette, invalidate, engineRef]);

  // Reduced motion: let it settle, then hold still
  useEffect(() => {
    if (!still) return;
    engineRef.current?.settle(inputs.current, []);
    invalidate();
  }, [still, width, height, invalidate, engineRef]);

  // Point at it (or drag a finger across it) to push the nodes, or pick one on the grid
  useEffect(() => {
    const el = getThreeState().gl.domElement;
    el.style.touchAction = "pan-y";
    const move = (e: PointerEvent) => {
      if (e.pointerType === "touch" && e.buttons === 0) return;
      const r = el.getBoundingClientRect();
      const { zoom } = getThreeState().camera;
      pointer.current = {
        x: (e.clientX - r.left - r.width / 2) / zoom,
        y: -(e.clientY - r.top - r.height / 2) / zoom,
      };
      invalidate();
    };
    const leave = () => {
      pointer.current = null;
    };
    // A finger only points while it's down
    const up = (e: PointerEvent) => {
      if (e.pointerType === "touch") leave();
    };
    el.addEventListener("pointerdown", move);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointerleave", leave);
    el.addEventListener("pointercancel", leave);
    return () => {
      el.removeEventListener("pointerdown", move);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointerleave", leave);
      el.removeEventListener("pointercancel", leave);
    };
  }, [getThreeState, invalidate]);

  // useFrame always calls the latest callback, so it sees the latest props
  useFrame((state, delta) => {
    const engine = engineRef.current;
    if (!engine) return;
    const l = loop.current;
    const w = state.size.width, h = state.size.height;
    const stage = { w, h, zoom: state.camera.zoom };
    const ctx = frameContext.current;
    ctx.width = w;
    ctx.height = h;
    ctx.dpr = state.gl.getPixelRatio();

    // The cursor: the reader's, or a demo one that wanders the stage. The grid view has none.
    const mouse = ctx.mouse;
    const demo = !pointer.current;
    if (demo && !still) l.demoTime += delta;
    const t = l.demoTime;
    const target = pointer.current ?? {
      x: (0.34 * w * Math.sin(t * 0.45)) / stage.zoom,
      y: (0.28 * h * Math.sin(t * 0.7 + 1)) / stage.zoom,
    };
    const ease = mouse.isActive ? Math.min(1, delta * 10) : 1;
    mouse.x += (target.x - mouse.x) * ease;
    mouse.y += (target.y - mouse.y) * ease;
    mouse.isActive = view !== "grid" && !still;

    engine.frame(delta, inputs.current, ctx);
    const { positions, count, links, time, steps } = engine.inspect();

    // The cursor's glow, stronger than on the home page so it reads on its own
    const { cursor, links: linkMesh, nodes } = engine.parts;
    cursor.material.uniforms.uStrength.value *= GLOW_BOOST;
    // The draws view: each draw call fades in as its turn comes, and out when it starts over
    if (view === "draws") {
      const ease = still ? 1 : Math.min(1, delta * 6);
      for (let k = 0; k < 3; k++) l.shown[k] += ((k <= step ? 1 : 0) - l.shown[k]) * ease;
      cursor.material.uniforms.uStrength.value *= l.shown[0];
      linkMesh.material.uniforms.uIntro.value *= l.shown[1];
      nodes.material.uniforms.uIntro.value *= l.shown[2];
    } else {
      // Under the lines the other views draw, connections step back
      linkMesh.material.uniforms.uIntro.value *= DIMMED_LINKS;
    }

    // Frames and physics steps per second, over a second or so
    if (l.frames === 0) l.stepsBefore = steps;
    else l.elapsed += delta;
    l.frames++;
    if (l.elapsed >= 1) {
      l.fps = Math.round((l.frames - 1) / l.elapsed);
      l.stepsPerSecond = Math.round((steps - l.stepsBefore) / l.elapsed);
      l.frames = 0;
      l.elapsed = 0;
    }

    const readout: Readout = {
      nodes: count,
      links,
      fps: l.fps,
      stepsPerSecond: l.stepsPerSecond,
      checked: 0,
      others: Math.max(0, count - 1),
      linked: 0,
      compared: 0,
      pairs: 0,
    };

    const draw = overlay.current && clearOverlay(overlay.current, stage);
    if (draw) {
      if (view === "grid" && count > 1) {
        // The engine's cells follow its link distance, which breathes a little
        const grid = sortIntoGrid(positions, count, Math.max(SETTINGS.connectionDistance + Math.sin(time * 0.4), 1));
        if (pointer.current) {
          // The node nearest the pointer
          let best = Infinity;
          for (let i = 0; i < count; i++) {
            const d = (positions[i * 3] - pointer.current.x) ** 2 + (positions[i * 3 + 1] - pointer.current.y) ** 2;
            if (d < best) [best, l.focus] = [d, i];
          }
        } else if ((l.focusFor -= delta) <= 0 || l.focus < 0 || l.focus >= count) {
          // Another node, well inside the stage
          const inside: number[] = [];
          for (let i = 0; i < count; i++) {
            const x = positions[i * 3] * stage.zoom, y = positions[i * 3 + 1] * stage.zoom;
            if (Math.abs(x) < w * 0.32 && Math.abs(y) < h * 0.3 && i !== l.focus) inside.push(i);
          }
          if (inside.length) l.focus = inside[Math.floor(Math.random() * inside.length)];
          l.focusFor = FOCUS_SECONDS;
        }
        if (l.focus >= 0 && l.focus < count) {
          const neighbours = neighboursOf(grid, count, l.focus);
          drawGrid(draw, stage, positions, grid, l.focus, neighbours, style);
          readout.checked = neighbours.length;
          readout.linked = neighbours.filter((j) => inReach(positions, l.focus, j, grid.cell)).length;
        }
        Object.assign(readout, comparisons(grid, count));
      }

      if (view === "physics") {
        if (l.homes.length < count * 2) l.homes = new Float32Array(count * 2);
        for (let i = 0; i < count; i++) {
          const home = engine.homeOf(i, inputs.current);
          l.homes[i * 2] = home[0];
          l.homes[i * 2 + 1] = home[1];
        }
        const reach = mouse.isActive ? { x: mouse.x, y: mouse.y, radius: SETTINGS.mouseRepulsionRadius } : null;
        drawSprings(draw, stage, positions, l.homes, count, reach, style);
      }

      if (view !== "grid" && demo && !still) drawPointer(draw, stage, mouse.x, mouse.y, style);
    }

    if ((l.readoutIn -= delta) <= 0) {
      l.readoutIn = READOUT_SECONDS;
      onReadout(readout);
    }
    if (!l.ready) {
      l.ready = true;
      onReady();
    }
  });

  return null;
}

interface NetworkFigureCanvasProps {
  view: FigureView;
  step: number;
  onReadout: (readout: Readout) => void;
  onReady: () => void;
}

/** The figure's network: the home page's engine, on a small stage, with what it shows on top */
export default function NetworkFigureCanvas({ view, step, onReadout, onReady }: NetworkFigureCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const { colors } = useThemeColors();
  const { resolvedTheme } = useTheme();
  const still = useReducedMotion();
  const onScreen = useOnScreen(hostRef, { rootMargin: "50px" });

  const dark = resolvedTheme !== "light";
  const palette = useMemo(() => networkPalette(colors, dark), [colors, dark]);
  const style = useMemo<OverlayStyle>(
    () => ({ ink: dark ? "236, 237, 238" : "17, 24, 28", accent: colors.primary.shades[dark ? 400 : 600].hex }),
    [colors, dark]
  );

  return (
    <div ref={hostRef} className="absolute inset-0">
      <Canvas
        orthographic
        camera={{ position: [...VISUAL_CONFIG.CAMERA_POSITION], zoom: PX_PER_UNIT, near: 0.1, far: 100 }}
        dpr={[1, 2]}
        // Edges are anti-aliased in the shaders, so MSAA is not needed
        gl={{ alpha: true, antialias: false, powerPreference: "low-power" }}
        // Nothing renders while it's off screen or the tab is hidden
        frameloop={onScreen ? (still ? "demand" : "always") : "never"}
      >
        <FigureScene
          view={view}
          step={step}
          palette={palette}
          style={style}
          still={still}
          overlay={overlayRef}
          onReadout={onReadout}
          onReady={onReady}
        />
        <DebugPerf />
      </Canvas>
      <canvas ref={overlayRef} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />
    </div>
  );
}
