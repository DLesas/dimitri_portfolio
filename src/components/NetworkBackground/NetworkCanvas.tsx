"use client";

import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { useTheme as useNextTheme } from "next-themes";
import {
  useContainerDimensions,
  useMouseTracking,
  useDOMColliders,
  useViewportVisibility,
} from "./hooks";
import { PERFORMANCE_CONFIGS, VISUAL_CONFIG } from "./constants";
import NetworkScene from "./NetworkScene";
import type { DOMCollider, NetworkPalette, PerformanceLevel } from "./networkEngine";
import { useSettings } from "@/contexts/SettingsContext";
import { useDebug } from "@/contexts/DebugContext";
import { useTheme } from "@/contexts/ThemeContext";

// r3f-perf is debug-only, so it loads only when debug mode is switched on
const Perf = lazy(() => import("r3f-perf").then((m) => ({ default: m.Perf })));

// Safe disposal function to prevent double context loss
function safeDisposeRenderer(renderer: THREE.WebGLRenderer | null) {
  if (!renderer) return;

  // @ts-expect-error - custom flag to track disposal
  if (renderer.__isDisposed) return;

  renderer.dispose();

  // Only force context loss if context is still available
  const context = renderer.getContext();
  if (context && !context.isContextLost()) {
    renderer.forceContextLoss();
  }

  // @ts-expect-error - mark as disposed
  renderer.__isDisposed = true;
}

// Debug component to visualize DOM colliders in 3D world coordinates
function DebugColliders({
  domColliders,
  domCollisionThreshold,
}: {
  domColliders: React.RefObject<DOMCollider[]>;
  domCollisionThreshold: number;
}) {
  const { colors } = useTheme();
  const [colliders, setColliders] = useState<DOMCollider[]>([]);

  // The colliders ref is re-measured as the page moves and animates; mirror it here so the
  // overlay shows up as soon as debug mode is on and follows text as it moves
  useEffect(() => {
    let lastKey = "";
    const sync = () => {
      const next = domColliders.current;
      const key = next
        .map((c) => `${c.x.toFixed(2)},${c.y.toFixed(2)},${c.width.toFixed(2)},${c.height.toFixed(2)}`)
        .join("|");
      if (key === lastKey) return;
      lastKey = key;
      setColliders(next.slice());
    };
    sync();
    const id = window.setInterval(sync, 250);
    return () => window.clearInterval(id);
  }, [domColliders]);

  // Create multiple layers for gradient shadow effect
  const gradientLayers = 6;

  return (
    <group>
      {colliders.map((collider, i) => (
        <React.Fragment key={`collider-${i}`}>
          {/* Render shadow gradient layers - largest to smallest for proper layering */}
          {Array.from({ length: gradientLayers })
            .reverse()
            .map((_, reverseIndex) => {
              const layerIndex = gradientLayers - 1 - reverseIndex;
              const layerProgress = (layerIndex + 1) / gradientLayers;
              const extension = domCollisionThreshold * layerProgress;
              const opacity = 0.15 * Math.pow(1 - layerProgress, 1.5);

              return (
                <mesh
                  key={`shadow-${i}-${layerIndex}`}
                  position={[collider.x, collider.y, -0.002 - layerIndex * 0.001]}
                >
                  <boxGeometry
                    args={[collider.width + extension * 2, collider.height + extension * 2, 0.001]}
                  />
                  <meshBasicMaterial
                    color={colors.accent.shades[500].hex}
                    transparent={true}
                    opacity={opacity}
                  />
                </mesh>
              );
            })}

          {/* Main collision box - wireframe outline on top */}
          <mesh key={`wireframe-${i}`} position={[collider.x, collider.y, 0]}>
            <boxGeometry args={[collider.width, collider.height, 0.001]} />
            <meshBasicMaterial
              color={colors.accent.shades[500].hex}
              wireframe={true}
              transparent={true}
              opacity={1.0}
            />
          </mesh>
        </React.Fragment>
      ))}
    </group>
  );
}

// Device performance detection
const detectDevicePerformance = (): PerformanceLevel => {
  // Check for mobile devices
  if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
    return "low";
  }

  // Check hardware concurrency (CPU cores) and available memory (if supported)
  const cores = navigator.hardwareConcurrency || 2;
  const memory = (navigator as unknown as { deviceMemory?: number }).deviceMemory || 4;

  if (cores <= 2 || memory <= 2) return "low";
  if (cores <= 4 || memory <= 4) return "medium";
  return "high";
};

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

export interface NetworkCanvasProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  nodeCount?: number;
  connectionDistance?: number;
  performance?: "auto" | "low" | "medium" | "high";
}

export default function NetworkCanvas({
  containerRef,
  nodeCount,
  connectionDistance,
  performance = "auto",
}: NetworkCanvasProps) {
  const glRef = useRef<THREE.WebGLRenderer | null>(null);
  const { networkSettings } = useSettings();
  const { isDebugEnabled } = useDebug();
  const { colors } = useTheme();
  const { resolvedTheme } = useNextTheme();
  const reducedMotion = useReducedMotion();

  const [performanceLevel] = useState<PerformanceLevel>(() =>
    performance === "auto" ? detectDevicePerformance() : performance
  );
  const performanceConfig = PERFORMANCE_CONFIGS[performanceLevel];

  // Settings priority: props > user settings > performance defaults
  const resolvedNodeCount = nodeCount ?? networkSettings.nodeCount ?? performanceConfig.NODE_COUNT;
  const resolvedConnectionDistance =
    connectionDistance ?? networkSettings.connectionDistance ?? performanceConfig.CONNECTION_DISTANCE;

  const containerDimensions = useContainerDimensions(containerRef);
  const mousePos = useMouseTracking(containerRef, containerDimensions.width, containerDimensions.height);
  const domColliders = useDOMColliders(
    containerRef,
    containerDimensions.width,
    containerDimensions.height,
    networkSettings.domCollisionPadding
  );
  const { shouldAnimate } = useViewportVisibility(containerRef);

  const dark = resolvedTheme !== "light";
  const primary = colors.primary.shades;
  const secondary = colors.secondary.shades;
  const palette = useMemo<NetworkPalette>(() => {
    const core = new THREE.Color(primary[500].hex).lerp(new THREE.Color(secondary[500].hex), 0.5);
    if (!dark) core.copy(new THREE.Color(primary[600].hex));
    return {
      core: `#${core.getHexString()}`,
      rim: `#${core.clone().multiplyScalar(dark ? 0.55 : 0.7).getHexString()}`,
      halo: dark ? primary[400].hex : primary[500].hex,
      lineA: dark ? primary[500].hex : primary[600].hex,
      lineB: dark ? secondary[500].hex : secondary[600].hex,
      packet: dark ? primary[100].hex : primary[500].hex,
      additive: dark,
    };
  }, [dark, primary, secondary]);

  // Fade the canvas in once it exists, rather than popping in
  const [shown, setShown] = useState(false);

  useEffect(() => {
    return () => {
      safeDisposeRenderer(glRef.current);
      glRef.current = null;
    };
  }, []);

  const running = shouldAnimate && !reducedMotion;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: -1,
        pointerEvents: "auto",
        overflow: "hidden",
        opacity: shown ? 1 : 0,
        transition: "opacity 600ms ease-out",
      }}
      aria-hidden="true"
    >
      <Canvas
        orthographic
        camera={{ position: [...VISUAL_CONFIG.CAMERA_POSITION], zoom: VISUAL_CONFIG.CAMERA_ZOOM, near: 0.1, far: 100 }}
        dpr={performanceLevel === "low" ? [1, 1] : [1, 1.5]}
        // Edges are anti-aliased in the shaders, so MSAA is not needed
        gl={{
          alpha: true,
          antialias: false,
          powerPreference: performanceLevel === "low" ? "low-power" : "default",
        }}
        // Nothing renders while the network is offscreen or the tab is hidden
        frameloop={running ? "always" : reducedMotion ? "demand" : "never"}
        style={{ background: "transparent", width: "100%", height: "100%" }}
        onCreated={({ gl }) => {
          glRef.current = gl;
          setShown(true);
        }}
      >
        <NetworkScene
          nodeCount={resolvedNodeCount}
          connectionDistance={resolvedConnectionDistance}
          settings={networkSettings}
          performanceLevel={performanceLevel}
          palette={palette}
          mousePos={mousePos}
          domColliders={domColliders}
          still={reducedMotion}
        />

        {isDebugEnabled && (
          <>
            {/* Only the performance panel waits on its lazy chunk */}
            <Suspense fallback={null}>
              <Perf position="bottom-right" antialias={false} showGraph deepAnalyze={false} matrixUpdate={false} />
            </Suspense>
            <DebugColliders
              domColliders={domColliders}
              domCollisionThreshold={networkSettings.domCollisionThreshold}
            />
          </>
        )}
      </Canvas>
    </div>
  );
}
