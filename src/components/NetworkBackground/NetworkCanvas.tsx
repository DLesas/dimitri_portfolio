"use client";

import React, { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { Canvas } from "@react-three/fiber";
import { useTheme } from "next-themes";
import { useMouseTracking, useDOMColliders } from "./hooks";
import { ANIMATION_CONFIG, PERFORMANCE_CONFIGS, VISUAL_CONFIG } from "./constants";
import { PX_PER_UNIT } from "./world";
import NetworkScene from "./NetworkScene";
import DebugColliders from "./DebugColliders";
import { networkPalette } from "@/components/three/palette";
import { createLiveCursors, presenceStore, type LiveCursors } from "./liveCursors";
import DebugPerf from "@/components/three/DebugPerf";
import { useSettings } from "@/contexts/SettingsContext";
import { useDebug } from "@/contexts/DebugContext";
import { useThemeColors } from "@/contexts/ThemeColorsContext";
import { useOnScreen } from "@/hooks/useOnScreen";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { detectHardware, performanceLevelFor } from "@/lib/hardware";

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

export default function NetworkCanvas({
  containerRef,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const { networkSettings } = useSettings();
  const { isDebugEnabled } = useDebug();
  const { colors } = useThemeColors();
  const { resolvedTheme } = useTheme();
  const reducedMotion = useReducedMotion();

  // The same tier as the settings' defaults (HardwarePerformanceContext): the detection
  // runs once per page, so whichever asks first does it. Needed now, for the renderer.
  const [performanceLevel] = useState(() => performanceLevelFor(detectHardware()));
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

  // Other visitors' cursors, shown in their own primary colour, with a glow as wide as
  // their own repulsion radius. Not with reduced motion: this visitor neither sees moving
  // cursors nor sends one.
  const liveCursorsRef = useRef<LiveCursors | null>(null);
  const cursorLayerRef = useRef<HTMLDivElement>(null);
  const ownColor = colors.primary.shades[500].hex;
  const ownColorRef = useRef(ownColor);
  useEffect(() => {
    ownColorRef.current = ownColor;
    liveCursorsRef.current?.setColor(ownColor);
  }, [ownColor]);
  const ownRadius = networkSettings.mouseRepulsionRadius ?? ANIMATION_CONFIG.MOUSE_REPULSION_RADIUS;
  const ownRadiusRef = useRef(ownRadius);
  useEffect(() => {
    ownRadiusRef.current = ownRadius;
    liveCursorsRef.current?.setRadius(ownRadius);
  }, [ownRadius]);
  useEffect(() => {
    if (reducedMotion) return;
    const live = createLiveCursors(ownColorRef.current, ownRadiusRef.current);
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
