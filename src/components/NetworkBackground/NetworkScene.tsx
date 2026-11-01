import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { PX_PER_UNIT } from "./world";
import type { PerformanceLevel } from "./constants";
import {
  createNetworkEngine,
  type DOMCollider,
  type FrameContext,
  type MousePosition,
  type NetworkInputs,
  type NetworkPalette,
} from "./networkEngine";
import type { LiveCursors, RemoteCursor } from "./liveCursors";
import { drawCursorMarks } from "./cursorMarks";
import { useSceneEngine } from "@/components/three/useSceneEngine";
import type { NetworkBackgroundSettings } from "@/contexts/SettingsContext";

const NO_REMOTES: RemoteCursor[] = [];

interface NetworkSceneProps {
  nodeCount: number;
  connectionDistance: number;
  settings: NetworkBackgroundSettings;
  performanceLevel: PerformanceLevel;
  palette: NetworkPalette;
  mousePos: React.RefObject<MousePosition>;
  domColliders: React.RefObject<DOMCollider[]>;
  /** Other visitors' cursors, when connected */
  liveCursors: React.RefObject<LiveCursors | null>;
  /** Where their pointers and names are drawn, over the page */
  cursorLayer: React.RefObject<HTMLDivElement | null>;
  /** Freeze the network: no drift, packets or mouse response */
  still: boolean;
}

/**
 * Connects the network engine to the canvas. All mutable state lives in the engine;
 * this component creates it, hands it the latest props and drives it every frame.
 */
export default function NetworkScene({
  nodeCount,
  connectionDistance,
  settings,
  performanceLevel,
  palette,
  mousePos,
  domColliders,
  liveCursors,
  cursorLayer,
  still,
}: NetworkSceneProps) {
  // Read the scene from the store at call time: three.js objects are meant to be
  // mutated, but a value returned by a hook is treated as immutable
  const getThreeState = useThree((state) => state.get);
  const invalidate = useThree((state) => state.invalidate);
  const inputsRef = useRef<NetworkInputs>({ settings, connectionDistance, performanceLevel, still });
  // Filled in every frame rather than allocated every frame
  const frameContextRef = useRef<FrameContext>({
    width: 0,
    height: 0,
    dpr: 1,
    mouse: { x: 0, y: 0, isActive: false },
    remotes: NO_REMOTES,
    colliders: [],
  });

  // Latest props for the effects below and the frame loop, without re-subscribing
  useEffect(() => {
    inputsRef.current = { settings, connectionDistance, performanceLevel, still };
  });

  const engineRef = useSceneEngine(createNetworkEngine);

  // Node count changes keep existing nodes; new ones spawn over the current view
  useEffect(() => {
    const { size } = getThreeState();
    engineRef.current?.setNodeCount(
      nodeCount,
      size.width / PX_PER_UNIT,
      size.height / PX_PER_UNIT,
      inputsRef.current
    );
    invalidate();
  }, [nodeCount, getThreeState, invalidate, engineRef]);

  useEffect(() => {
    engineRef.current?.setPalette(palette);
    invalidate();
  }, [palette, invalidate, engineRef]);

  // Reduced motion: settle once the text colliders have been measured, then hold still
  useEffect(() => {
    if (!still) return;
    const id = window.setTimeout(() => {
      engineRef.current?.settle(inputsRef.current, domColliders.current);
      invalidate();
    }, 600);
    return () => window.clearTimeout(id);
  }, [still, nodeCount, connectionDistance, settings, domColliders, invalidate, engineRef]);

  useFrame((state, delta) => {
    const remotes = liveCursors.current?.update(delta, mousePos.current) ?? NO_REMOTES;
    const ctx = frameContextRef.current;
    ctx.width = state.size.width;
    ctx.height = state.size.height;
    ctx.dpr = state.gl.getPixelRatio();
    ctx.mouse = mousePos.current;
    ctx.remotes = remotes;
    ctx.colliders = domColliders.current;
    engineRef.current?.frame(delta, inputsRef.current, ctx);
    if (cursorLayer.current) {
      drawCursorMarks(cursorLayer.current, remotes, state.size.width, state.size.height);
    }
  });

  return null;
}
