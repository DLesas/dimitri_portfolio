"use client";

import { useCallback, useEffect, useEffectEvent, useMemo, useRef, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type * as THREE from "three";
import { useTheme } from "next-themes";
import DebugPerf from "@/components/three/DebugPerf";
import { useSceneEngine } from "@/components/three/useSceneEngine";
import { useThemeColors } from "@/contexts/ThemeColorsContext";
import { useOnScreen } from "@/hooks/useOnScreen";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { createDiagramEngine, diagramPalette, type DiagramInputs } from "./diagramEngine";
import { CAMERA_DISTANCE, FOV, type DiagramGraph, type DiagramPicture } from "./layout";

interface DiagramCanvasProps {
  graph: DiagramGraph;
  picture: DiagramPicture;
  flow: number;
  focus: number;
  /** The nodes' HTML labels, which the scene moves with their nodes */
  labels: RefObject<(HTMLElement | null)[]>;
  /** The node the pointer is over, or -1 */
  onPoint: (node: number) => void;
  /** A tap or click without a drag: the node tapped, or -1 for none */
  onTap: (node: number) => void;
  /** Called once the first frame is drawn */
  onReady: () => void;
}

type SceneProps = Pick<DiagramCanvasProps, "graph" | "picture" | "labels" | "onPoint" | "onTap" | "onReady"> & {
  inputs: DiagramInputs;
};

/**
 * Connects the diagram engine to the canvas. All mutable state lives in the engine; this
 * component creates it, wires the pointer, and drives it every frame.
 */
function DiagramScene({ graph, picture, inputs, labels, onPoint, onTap, onReady }: SceneProps) {
  const getThreeState = useThree((state) => state.get);
  const invalidate = useThree((state) => state.invalidate);
  const ready = useRef(false);

  const create = useCallback(() => createDiagramEngine(graph, picture), [graph, picture]);
  const engineRef = useSceneEngine(create);

  useEffect(() => {
    engineRef.current?.setPalette(inputs.palette);
    invalidate();
  }, [create, inputs.palette, invalidate, engineRef]);

  // A new flow or focus: draw again
  useEffect(() => invalidate(), [inputs, invalidate]);

  const point = useEffectEvent(onPoint);
  const tap = useEffectEvent(onTap);

  // Drag to turn it, point at or tap a node
  useEffect(() => {
    const el = getThreeState().gl.domElement;
    // On a touch screen a vertical swipe scrolls the page and a sideways one turns the
    // diagram, as with the skills cloud
    el.style.touchAction = "pan-y";
    el.style.cursor = "grab";
    let pointed = -1;
    const at = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top] as const;
    };
    const show = (node: number) => {
      el.style.cursor = engineRef.current?.dragging ? "grabbing" : node >= 0 ? "pointer" : "grab";
      if (node !== pointed) point((pointed = node));
      invalidate();
    };
    const onDown = (e: PointerEvent) => {
      engineRef.current?.pointerDown(...at(e));
      el.setPointerCapture(e.pointerId);
      show(pointed);
    };
    const onMove = (e: PointerEvent) => {
      const node = engineRef.current?.pointerMove(...at(e)) ?? -1;
      // A finger only points while pressed: it shouldn't leave a node lit
      show(e.pointerType === "touch" ? -1 : node);
    };
    const onUp = (e: PointerEvent) => {
      const tapped = engineRef.current?.pointerUp(...at(e));
      if (tapped !== undefined) tap(tapped);
      show(e.pointerType === "touch" ? -1 : pointed);
    };
    const onCancel = () => {
      engineRef.current?.pointerCancel();
      show(-1);
    };
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onCancel);
    el.addEventListener("pointerleave", onCancel);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onCancel);
      el.removeEventListener("pointerleave", onCancel);
      el.style.cursor = "";
    };
  }, [getThreeState, invalidate, engineRef]);

  // useFrame always calls the latest callback, so it sees the latest inputs
  useFrame((state, delta) => {
    const engine = engineRef.current;
    if (!engine) return;
    const moving = engine.frame(
      delta,
      state.camera as THREE.PerspectiveCamera,
      state.size.width,
      state.size.height,
      state.viewport.dpr,
      inputs,
      labels.current
    );
    if (!ready.current) {
      ready.current = true;
      onReady();
    }
    // The canvas renders on demand: keep going while anything moves
    if (moving) state.invalidate();
  });

  return null;
}

/** A post diagram's 3D scene, which takes over from its still picture once drawn */
export default function DiagramCanvas({ flow, focus, ...props }: DiagramCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const { colors } = useThemeColors();
  const { resolvedTheme } = useTheme();
  const reduced = useReducedMotion();
  const onScreen = useOnScreen(hostRef, { rootMargin: "100px" });

  const dark = resolvedTheme !== "light";
  const palette = useMemo(() => diagramPalette(colors, dark), [colors, dark]);
  const inputs = useMemo<DiagramInputs>(() => ({ flow, focus, palette, still: reduced }), [flow, focus, palette, reduced]);

  return (
    <div ref={hostRef} className="absolute inset-0" aria-hidden>
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0, CAMERA_DISTANCE], fov: FOV, near: 1, far: 200 }}
        // Edges are anti-aliased in the shaders, so MSAA is not needed
        gl={{ alpha: true, antialias: false, powerPreference: "low-power" }}
        // Renders only while something moves; never while offscreen or the tab is hidden
        frameloop={onScreen ? "demand" : "never"}
      >
        <DiagramScene inputs={inputs} {...props} />
        <DebugPerf />
      </Canvas>
    </div>
  );
}
