import { useEffect, useRef, type RefObject } from "react";
import { useThree } from "@react-three/fiber";
import type * as THREE from "three";

/** An engine that keeps its state and GPU resources outside React */
interface SceneEngine {
  /** Everything it draws, added to the scene as one object */
  root: THREE.Object3D;
  dispose(): void;
}

/**
 * Creates the engine, adds it to the canvas's scene, and removes and disposes of it on
 * unmount, or when `create` changes (then a new one takes its place).
 *
 * Call it before the effects that use the engine, so they run after it exists.
 */
export function useSceneEngine<E extends SceneEngine>(create: () => E): RefObject<E | null> {
  // Read the scene from the store at call time: three.js objects are meant to be
  // mutated, but a value returned by a hook is treated as immutable
  const getThreeState = useThree((state) => state.get);
  const engineRef = useRef<E | null>(null);

  useEffect(() => {
    const engine = create();
    engineRef.current = engine;
    const { scene } = getThreeState();
    scene.add(engine.root);
    return () => {
      scene.remove(engine.root);
      engine.dispose();
      engineRef.current = null;
    };
  }, [create, getThreeState]);

  return engineRef;
}
