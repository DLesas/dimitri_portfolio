/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useRef, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrthographicCamera } from "@react-three/drei";
import { Perf } from "r3f-perf";
import {
  useContainerDimensions,
  useMouseTracking,
  useDOMColliders,
  useNodeRefs,
  useViewportVisibility,
  useStableNodePositions,
} from "./hooks";
import { NetworkNode } from "./NetworkNode";
import { DynamicNetworkConnections } from "./DynamicNetworkConnections";
import { PERFORMANCE_CONFIGS, VISUAL_CONFIG } from "./constants";
import { useSettings } from "@/contexts/SettingsContext";
import { useDebug } from "@/contexts/DebugContext";

// Separate component for debug performance monitoring to avoid re-renders
function DebugPerf() {
  const { isDebugEnabled } = useDebug();

  return (
    <Perf
      position="bottom-right"
      showGraph={isDebugEnabled}
      deepAnalyze={isDebugEnabled}
      minimal={!isDebugEnabled}
      matrixUpdate={false}
      overClock={false}
      style={{
        opacity: isDebugEnabled ? 1 : 0,
        pointerEvents: isDebugEnabled ? "auto" : "none",
        visibility: isDebugEnabled ? "visible" : "hidden",
      }}
    />
  );
}

// Device performance detection
const detectDevicePerformance = (): "low" | "medium" | "high" => {
  // Check for mobile devices
  if (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    )
  ) {
    return "low";
  }

  // Check hardware concurrency (CPU cores)
  const cores = navigator.hardwareConcurrency || 2;

  // Check available memory (if supported)
  const memory =
    (navigator as unknown as { deviceMemory?: number }).deviceMemory || 4;

  // Check for weak devices
  if (cores <= 2 || memory <= 2) {
    return "low";
  } else if (cores <= 4 || memory <= 4) {
    return "medium";
  } else {
    return "high";
  }
};

export type NetworkBackgroundProps = {
  nodeCount?: number;
  connectionDistance?: number;
  color?: string;
  children?: React.ReactNode;
  className?: string;
  performance?: "auto" | "low" | "medium" | "high";
  disabled?: boolean; // Option to completely disable for very weak devices
};

export default function NetworkBackground({
  nodeCount,
  connectionDistance,
  children,
  className = "",
  performance = "auto",
  disabled = false,
}: NetworkBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<any>(null);

  // Get settings from context - REMOVED useDebug to prevent re-renders
  const { networkSettings } = useSettings();

  // Device performance detection and configuration selection
  const detectedPerformanceLevel =
    performance === "auto" ? detectDevicePerformance() : performance;
  const performanceConfig = PERFORMANCE_CONFIGS[detectedPerformanceLevel];

  // Settings priority: props > user settings > performance defaults
  // This allows props to override user settings when needed (e.g., for specific pages)
  const resolvedNodeCount =
    nodeCount ?? networkSettings.nodeCount ?? performanceConfig.NODE_COUNT;
  const resolvedConnectionDistance =
    connectionDistance ??
    networkSettings.connectionDistance ??
    performanceConfig.CONNECTION_DISTANCE;

  // Get dynamic container dimensions
  const containerDimensions = useContainerDimensions(containerRef);

  // Use custom hooks for complex logic with dynamic dimensions
  const mousePos = useMouseTracking(
    containerRef,
    containerDimensions.width,
    containerDimensions.height
  );
  const domColliders = useDOMColliders(
    containerRef,
    containerDimensions.width,
    containerDimensions.height
  );
  const nodeRefs = useNodeRefs(resolvedNodeCount);
  const { shouldAnimate } = useViewportVisibility(containerRef);

  // Generate stable node positions that preserve existing nodes during count changes
  const nodes = useStableNodePositions(
    resolvedNodeCount,
    containerDimensions.width,
    containerDimensions.height
  );

  // Cleanup WebGL context on unmount
  useEffect(() => {
    return () => {
      if (canvasRef.current?.gl) {
        canvasRef.current.gl.dispose();
        console.log("NetworkBackground: WebGL context disposed");
      }
    };
  }, []);

  // If disabled, just render children without canvas
  if (disabled) {
    return (
      <div
        ref={containerRef}
        className={`relative ${className}`}
        style={{ position: "relative", minHeight: "200px" }}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      style={{ position: "relative", minHeight: "200px" }}
    >
      {/* Background Canvas */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: -1,
          pointerEvents: "auto",
          overflow: "hidden",
        }}
      >
        <Canvas
          ref={canvasRef}
          orthographic
          dpr={detectedPerformanceLevel === "low" ? [1, 1] : [1, 1.5]} // Lower DPR for weak devices
          gl={{
            alpha: true,
            antialias: detectedPerformanceLevel !== "low", // Disable antialiasing on weak devices
            powerPreference:
              detectedPerformanceLevel === "low" ? "low-power" : "default",
          }}
          style={{
            background: "transparent",
            width: "100%",
            height: "100%",
          }}
        >
          <OrthographicCamera
            makeDefault
            position={VISUAL_CONFIG.CAMERA_POSITION}
            zoom={VISUAL_CONFIG.CAMERA_ZOOM}
          />
          <ambientLight intensity={VISUAL_CONFIG.AMBIENT_LIGHT_INTENSITY} />

          {/* Render nodes */}
          {nodes.map((node, index) => (
            <NetworkNode
              key={index}
              position={node.position}
              index={index}
              nodeRefsArray={nodeRefs}
              mousePos={mousePos}
              domColliders={domColliders}
              shouldAnimate={shouldAnimate}
            />
          ))}

          {/* Render dynamic connections */}
          <DynamicNetworkConnections
            nodeRefsArray={nodeRefs}
            maxDistance={resolvedConnectionDistance}
            shouldAnimate={shouldAnimate}
            performanceLevel={detectedPerformanceLevel}
          />

          {/* Detailed Performance Monitor - Isolated to prevent re-renders */}
          <DebugPerf />
        </Canvas>
      </div>

      {/* Foreground Content */}
      <>{children}</>
    </div>
  );
}
