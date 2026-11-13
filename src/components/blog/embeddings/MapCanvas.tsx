"use client";

import { useEffect, useEffectEvent, useMemo, useRef, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useTheme } from "next-themes";
import { useSceneEngine } from "@/components/three/useSceneEngine";
import { useThemeColors } from "@/contexts/ThemeColorsContext";
import { useOnScreen } from "@/hooks/useOnScreen";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { createMapEngine, type MapInputs } from "./mapEngine";
import type { Layout } from "./parts";

export interface MapCanvasProps {
  layout: Layout;
  /** The preset question shown, or -1 */
  question: number;
  /** The passage pointed at, or -1 */
  focus: number;
  onPoint: (point: number) => void;
  /** The label that follows the pointed-at passage */
  label: RefObject<HTMLElement | null>;
  /** Called once the first frame is drawn */
  onReady: () => void;
}

const CAMERA = { distance: 3.5, fov: 34 };

/** Connects the map engine to the canvas: creates it, wires the pointer, and drives it every frame */
function MapScene({ inputs, onPoint, label, onReady }: Pick<MapCanvasProps, "onPoint" | "label" | "onReady"> & { inputs: MapInputs }) {
  const getThreeState = useThree((state) => state.get);
  const ready = useRef(false);
  const engineRef = useSceneEngine(createMapEngine);
  const point = useEffectEvent(onPoint);

  // Drag to turn it; point at a passage (or tap one, where nothing hovers)
  useEffect(() => {
    const el = getThreeState().gl.domElement;
    el.style.touchAction = "pan-y";
    el.style.cursor = "grab";
    const pick = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      return engineRef.current?.pick(e.clientX - r.left, e.clientY - r.top, r.width, r.height) ?? -1;
    };
    const onDown = (e: PointerEvent) => {
      engineRef.current?.pointerDown(e.clientX, e.clientY);
      el.setPointerCapture(e.pointerId);
      el.style.cursor = "grabbing";
    };
    const onMove = (e: PointerEvent) => {
      if (engineRef.current?.dragging) return engineRef.current.pointerMove(e.clientX, e.clientY);
      if (e.pointerType !== "mouse") return;
      const at = pick(e);
      el.style.cursor = at >= 0 ? "pointer" : "grab";
      point(at);
    };
    const onUp = (e: PointerEvent) => {
      engineRef.current?.pointerUp();
      el.style.cursor = "grab";
      if (e.pointerType !== "mouse") point(pick(e));
    };
    const onLeave = () => {
      engineRef.current?.pointerUp();
      point(-1);
    };
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onLeave);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onLeave);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [getThreeState, engineRef]);

  useFrame((state, delta) => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.frame(delta, state.camera, state.size.width, state.size.height, state.viewport.dpr, inputs, label.current);
    if (!ready.current) {
      ready.current = true;
      onReady();
    }
  });

  return null;
}

/** The map's 3D scene, which takes over from its still picture once drawn */
export default function MapCanvas({ layout, question, focus, ...props }: MapCanvasProps) {
  const host = useRef<HTMLDivElement>(null);
  const { colors } = useThemeColors();
  const dark = useTheme().resolvedTheme !== "light";
  const still = useReducedMotion();
  const onScreen = useOnScreen(host, { rootMargin: "100px" });
  const inputs = useMemo<MapInputs>(() => {
    const shade = dark ? 400 : 500;
    const colours = {
      role: new THREE.Color(colors.primary.shades[shade].hex),
      skill: new THREE.Color(colors.secondary.shades[shade].hex),
      post: new THREE.Color("#f5a524"),
      // Grey, so the question (white, or black in the light) stands apart
      intro: new THREE.Color(colors.foreground.base.hex).lerp(new THREE.Color(colors.background.base.hex), 0.45),
      ask: new THREE.Color(dark ? "#ffffff" : "#111111"),
      line: new THREE.Color(colors.foreground.base.hex),
    };
    return { layout, question, focus, colours, still };
  }, [layout, question, focus, colors, dark, still]);

  return (
    <div ref={host} className="absolute inset-0" aria-hidden>
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0, CAMERA.distance], fov: CAMERA.fov, near: 0.1, far: 50 }}
        gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
        // Never drawn while off screen or the tab is hidden
        frameloop={onScreen ? "always" : "never"}
      >
        <MapScene inputs={inputs} {...props} />
      </Canvas>
    </div>
  );
}
