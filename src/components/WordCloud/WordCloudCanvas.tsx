"use client";

import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { useTheme as useNextTheme } from "next-themes";
import { useTheme } from "@/contexts/ThemeContext";
import { useSettings } from "@/contexts/SettingsContext";
import { useDebug } from "@/contexts/DebugContext";
import type { SkillRecord } from "@/hooks/queries/useSkillsData";
import {
  BASE_DISTANCE,
  FOV,
  createCloudEngine,
  type CloudEngine,
  type CloudInputs,
  type CloudPalette,
} from "./cloudEngine";

// r3f-perf is debug-only, so it loads only when debug mode is switched on
const Perf = lazy(() => import("r3f-perf").then((m) => ({ default: m.Perf })));

const FOG_NEAR = 0;
const FOG_FAR = 100;
const DAMPING_FACTOR = 0.07;
const fogTarget = new THREE.Color();

interface CloudSceneProps {
  skills: SkillRecord[];
  inputs: CloudInputs;
  baseFontSize: number;
  onHover: (skill: SkillRecord | null) => void;
}

/**
 * Connects the cloud engine to the canvas. All mutable state lives in the engine;
 * this component creates it, wires pointer and orbit controls, and drives it every frame.
 */
function CloudScene({ skills, inputs, baseFontSize, onHover }: CloudSceneProps) {
  // Read the scene from the store at call time: three.js objects are meant to be
  // mutated, but a value returned by a hook is treated as immutable
  const getThreeState = useThree((state) => state.get);
  const invalidate = useThree((state) => state.invalidate);
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);
  const engineRef = useRef<CloudEngine | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const inputsRef = useRef(inputs);
  const onHoverRef = useRef(onHover);

  // Latest props for the frame loop, without re-subscribing
  useEffect(() => {
    inputsRef.current = inputs;
    onHoverRef.current = onHover;
  });

  useEffect(() => {
    const engine = createCloudEngine(skills);
    engineRef.current = engine;
    const { scene } = getThreeState();
    scene.add(engine.group);
    engine.sync(() => invalidate());
    return () => {
      scene.remove(engine.group);
      engine.dispose();
      engineRef.current = null;
    };
  }, [skills, getThreeState, invalidate]);

  useEffect(() => {
    engineRef.current?.setFontSize(baseFontSize, () => invalidate());
  }, [skills, baseFontSize, invalidate]);

  // Theme: fog fades distant words into the background
  useEffect(() => {
    const { scene } = getThreeState();
    scene.background = null;
    if (scene.fog instanceof THREE.Fog) scene.fog.color.set(inputs.palette.fog);
    else scene.fog = new THREE.Fog(inputs.palette.fog, FOG_NEAR, FOG_FAR);
    engineRef.current?.setPalette(inputs.palette);
    invalidate();
  }, [skills, inputs.palette, getThreeState, invalidate]);

  // Fit the sphere to the container
  useEffect(() => {
    const { camera } = getThreeState();
    engineRef.current?.fit(camera as THREE.PerspectiveCamera, width, height);
    invalidate();
  }, [skills, width, height, getThreeState, invalidate]);

  // Orbit drag, hover and click
  useEffect(() => {
    const { camera, gl } = getThreeState();
    const el = gl.domElement;
    const controls = new OrbitControls(camera, el);
    controls.enableDamping = true;
    controls.dampingFactor = DAMPING_FACTOR;
    controls.enableZoom = false;
    controlsRef.current = controls;

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      engineRef.current?.pointerMove(e.clientX - r.left, e.clientY - r.top, e.clientX, e.clientY, e.buttons);
      invalidate();
    };
    const onLeave = () => {
      engineRef.current?.pointerLeave();
      invalidate();
    };
    const onDown = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      engineRef.current?.pointerDown(e.clientX - r.left, e.clientY - r.top, e.clientX, e.clientY);
      invalidate();
    };
    const onUp = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const { size } = getThreeState();
      const link = engineRef.current?.pointerUp(
        e.clientX - r.left,
        e.clientY - r.top,
        camera as THREE.PerspectiveCamera,
        size.width,
        size.height
      );
      if (link) window.open(link, "_blank", "noopener,noreferrer");
    };
    const onChange = () => invalidate();
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointerup", onUp);
    controls.addEventListener("change", onChange);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerup", onUp);
      controls.removeEventListener("change", onChange);
      controls.dispose();
      controlsRef.current = null;
      el.style.cursor = "";
    };
  }, [getThreeState, invalidate]);

  useFrame((state, delta) => {
    const engine = engineRef.current;
    if (!engine) return;
    const controlsMoving = controlsRef.current?.update() ?? false;
    const { busy, hoverChange, hovering } = engine.frame(
      delta,
      state.camera as THREE.PerspectiveCamera,
      state.size.width,
      state.size.height,
      state.gl.getPixelRatio(),
      inputsRef.current
    );
    if (hoverChange !== undefined) {
      state.gl.domElement.style.cursor = hovering ? "pointer" : "";
      onHoverRef.current(hoverChange);
    }
    const fog = state.scene.fog;
    if (fog instanceof THREE.Fog) fog.color.lerp(fogTarget.set(inputsRef.current.palette.fog), 0.5);

    // The canvas renders on demand: keep going while anything moves, stop once settled
    // (e.g. while the pointer rests on a word and the rotation has eased to a stop)
    if (busy || controlsMoving) state.invalidate();
  });

  return null;
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

/** Visible in the viewport and the tab is in front */
function useOnScreen(ref: React.RefObject<HTMLElement | null>) {
  const [inView, setInView] = useState(true);
  const [tabVisible, setTabVisible] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin: "100px" });
    io.observe(el);
    const onVis = () => setTabVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [ref]);
  return inView && tabVisible;
}

interface WordCloudCanvasProps {
  skills: SkillRecord[];
  onHover: (skill: SkillRecord | null) => void;
}

export default function WordCloudCanvas({ skills, onHover }: WordCloudCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const { wordCloudSettings } = useSettings();
  const { isDebugEnabled } = useDebug();
  const { colors } = useTheme();
  const { resolvedTheme } = useNextTheme();
  const reduced = useReducedMotion();
  const onScreen = useOnScreen(hostRef);
  const [shown, setShown] = useState(false);

  const dark = resolvedTheme !== "light";
  const palette = useMemo<CloudPalette>(() => {
    const p = colors.primary.shades;
    // Map skill types to theme colors
    const byType: Record<string, string> = {
      "Programming Language": p[500].hex,
      Library: p[600].hex,
      Software: p[500].hex,
      Database: p[700].hex,
      "Cloud Platform": p[600].hex,
    };
    return {
      byType: (type: string) => byType[type] ?? p[500].hex,
      hover: colors.accent.shades[500].hex,
      fog: colors.background.base.hex,
      shell: dark ? p[400].hex : p[600].hex,
      additive: dark,
    };
  }, [colors, dark]);

  const inputs = useMemo<CloudInputs>(
    () => ({
      rotationSpeedX: wordCloudSettings.rotationSpeedX,
      rotationSpeedY: wordCloudSettings.rotationSpeedY,
      palette,
      still: reduced,
    }),
    [wordCloudSettings.rotationSpeedX, wordCloudSettings.rotationSpeedY, palette, reduced]
  );

  return (
    <div
      ref={hostRef}
      style={{ position: "absolute", inset: 0, opacity: shown ? 1 : 0, transition: "opacity 500ms ease-out" }}
    >
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [0, 0, BASE_DISTANCE], fov: FOV, zoom: 1 }}
        gl={{ alpha: true }}
        // Renders only while something moves; never while offscreen or the tab is hidden
        frameloop={onScreen ? "demand" : "never"}
        onCreated={() => setShown(true)}
        aria-label="Interactive 3D cloud of skills. Hover a word for details, drag to rotate."
      >
        <CloudScene
          skills={skills}
          inputs={inputs}
          baseFontSize={wordCloudSettings.baseFontSize}
          onHover={onHover}
        />
        {/* Performance Monitor - Only visible in debug mode */}
        {isDebugEnabled && (
          <Suspense fallback={null}>
            <Perf position="bottom-right" antialias={false} showGraph deepAnalyze={false} matrixUpdate={false} />
          </Suspense>
        )}
      </Canvas>
    </div>
  );
}
