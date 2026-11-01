"use client";

import React, { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { Canvas } from "@react-three/fiber";
import { useTheme as useNextTheme } from "next-themes";
import { useMouseTracking, useDOMColliders } from "./hooks";
import { PERFORMANCE_CONFIGS, VISUAL_CONFIG } from "./constants";
import { PX_PER_UNIT } from "./world";
import NetworkScene from "./NetworkScene";
import { networkPalette, type DOMCollider, type PerformanceLevel } from "./networkEngine";
import { createLiveCursors, presenceStore, type LiveCursors } from "./liveCursors";
import DebugPerf from "@/components/three/DebugPerf";
import { useSettings } from "@/contexts/SettingsContext";
import { useDebug } from "@/contexts/DebugContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useOnScreen } from "@/hooks/useOnScreen";
import { useReducedMotion } from "@/hooks/useReducedMotion";

// The avatars (and their animal icons) load only once someone else is on the page
const VisitorAvatars = dynamic(() => import("./VisitorAvatars"), { ssr: false });

/** Who else is on the page, bottom left, once there is anyone */
function LiveVisitors() {
  const presence = useSyncExternalStore(
    presenceStore.subscribe,
    presenceStore.getSnapshot,
    presenceStore.getServerSnapshot
  );
  if (!presence.self || presence.others.length === 0) return null;
  return <VisitorAvatars presence={presence} />;
}

// Debug component to visualize DOM colliders in 3D world coordinates: the boxes the
// physics uses, padding included, and the threshold around them where repulsion starts
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

export default function NetworkCanvas({
  containerRef,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const { networkSettings } = useSettings();
  const { isDebugEnabled } = useDebug();
  const { colors } = useTheme();
  const { resolvedTheme } = useNextTheme();
  const reducedMotion = useReducedMotion();

  const [performanceLevel] = useState<PerformanceLevel>(detectDevicePerformance);
  const performanceConfig = PERFORMANCE_CONFIGS[performanceLevel];

  // A setting saved as NaN comes back from localStorage as null: use the device default
  const resolvedNodeCount = networkSettings.nodeCount ?? performanceConfig.NODE_COUNT;
  const resolvedConnectionDistance =
    networkSettings.connectionDistance ?? performanceConfig.CONNECTION_DISTANCE;

  const mousePos = useMouseTracking(containerRef);
  const domColliders = useDOMColliders(containerRef, networkSettings.domCollisionPadding);
  // Start animating just before it comes into view (when 10% of it is within 50px)
  const shouldAnimate = useOnScreen(containerRef, { rootMargin: "50px", threshold: 0.1 });

  const dark = resolvedTheme !== "light";
  const palette = useMemo(() => networkPalette(colors, dark), [colors, dark]);

  // Other visitors' cursors, shown in their own primary colour. Not with reduced motion:
  // this visitor neither sees moving cursors nor sends one.
  const liveCursorsRef = useRef<LiveCursors | null>(null);
  const cursorLayerRef = useRef<HTMLDivElement>(null);
  const ownColor = colors.primary.shades[500].hex;
  const ownColorRef = useRef(ownColor);
  useEffect(() => {
    ownColorRef.current = ownColor;
    liveCursorsRef.current?.setColor(ownColor);
  }, [ownColor]);
  useEffect(() => {
    if (reducedMotion) return;
    const live = createLiveCursors(ownColorRef.current);
    liveCursorsRef.current = live;
    return () => {
      live?.close();
      liveCursorsRef.current = null;
    };
  }, [reducedMotion]);

  // Fade the canvas in once it exists, rather than popping in
  const [shown, setShown] = useState(false);

  const running = shouldAnimate && !reducedMotion;

  return (
    <>
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
          camera={{ position: [...VISUAL_CONFIG.CAMERA_POSITION], zoom: PX_PER_UNIT, near: 0.1, far: 100 }}
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
          onCreated={() => setShown(true)}
        >
          <NetworkScene
            nodeCount={resolvedNodeCount}
            connectionDistance={resolvedConnectionDistance}
            settings={networkSettings}
            performanceLevel={performanceLevel}
            palette={palette}
            mousePos={mousePos}
            domColliders={domColliders}
            liveCursors={liveCursorsRef}
            cursorLayer={cursorLayerRef}
            still={reducedMotion}
          />

          <DebugPerf />
          {isDebugEnabled && (
            <DebugColliders
              domColliders={domColliders}
              domCollisionThreshold={networkSettings.domCollisionThreshold}
            />
          )}
        </Canvas>
      </div>
      {/* Other visitors' pointers and names sit over the page, like in Google Docs (their
          glows stay in the canvas), and never catch the mouse */}
      <div
        ref={cursorLayerRef}
        data-network-overlay
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, zIndex: 20, overflow: "hidden", pointerEvents: "none" }}
      />
      <LiveVisitors />
    </>
  );
}
