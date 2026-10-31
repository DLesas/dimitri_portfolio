import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { VISUAL_CONFIG } from "./constants";
import {
  createNetworkEngine,
  type DOMCollider,
  type MousePosition,
  type NetworkEngine,
  type NetworkInputs,
  type NetworkPalette,
  type PerformanceLevel,
} from "./networkEngine";
import type { NetworkBackgroundSettings } from "@/contexts/SettingsContext";

export type { DOMCollider, NetworkPalette, PerformanceLevel };

interface NetworkSceneProps {
  nodeCount: number;
  connectionDistance: number;
  settings: NetworkBackgroundSettings;
  performanceLevel: PerformanceLevel;
  palette: NetworkPalette;
  mousePos: React.RefObject<MousePosition>;
  domColliders: React.RefObject<DOMCollider[]>;
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
  still,
}: NetworkSceneProps) {
  // Read the scene from the store at call time: three.js objects are meant to be
  // mutated, but a value returned by a hook is treated as immutable
  const getThreeState = useThree((state) => state.get);
  const invalidate = useThree((state) => state.invalidate);
  const engineRef = useRef<NetworkEngine | null>(null);
  const inputsRef = useRef<NetworkInputs>({ settings, connectionDistance, performanceLevel, still });

  // Latest props for the frame loop, without re-subscribing
  useEffect(() => {
    inputsRef.current = { settings, connectionDistance, performanceLevel, still };
  });

  useEffect(() => {
    const engine = createNetworkEngine();
    engineRef.current = engine;
    const { scene } = getThreeState();
    scene.add(engine.root);
    return () => {
      scene.remove(engine.root);
      engine.dispose();
      engineRef.current = null;
    };
  }, [getThreeState]);

  // Node count changes keep existing nodes; new ones spawn over the current view
  useEffect(() => {
    const { size } = getThreeState();
    engineRef.current?.setNodeCount(
      nodeCount,
      size.width / VISUAL_CONFIG.CAMERA_ZOOM,
      size.height / VISUAL_CONFIG.CAMERA_ZOOM,
      inputsRef.current
    );
    invalidate();
  }, [nodeCount, getThreeState, invalidate]);

  useEffect(() => {
    engineRef.current?.setPalette(palette);
    invalidate();
  }, [palette, invalidate]);

  // Reduced motion: settle once the text colliders have been measured, then hold still
  useEffect(() => {
    if (!still) return;
    const id = window.setTimeout(() => {
      engineRef.current?.settle(inputsRef.current, domColliders.current);
      invalidate();
    }, 600);
    return () => window.clearTimeout(id);
  }, [still, nodeCount, connectionDistance, settings, domColliders, invalidate]);

  useFrame((state, delta) => {
    engineRef.current?.frame(delta, inputsRef.current, {
      width: state.size.width,
      height: state.size.height,
      dpr: state.gl.getPixelRatio(),
      mouse: mousePos.current,
      colliders: domColliders.current,
    });
  });

  return null;
}
