/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useRef, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrthographicCamera } from "@react-three/drei";
import { Perf } from "r3f-perf";
import * as THREE from "three";
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
import { useTheme } from "@/contexts/ThemeContext";

// Global flag to prevent multiple WebGL contexts
let globalCanvasActive = false;

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

// Separate component for debug performance monitoring to avoid re-renders
function DebugPerf() {
  const { isDebugEnabled } = useDebug();

  return (
    <Perf
      position="bottom-right"
      antialias={false}
      showGraph={isDebugEnabled}
      deepAnalyze={false}
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

// Debug component to visualize DOM colliders in 3D world coordinates
function DebugColliders({
  domColliders,
  isDebugEnabled,
  domCollisionThreshold,
}: {
  domColliders: React.MutableRefObject<
    Array<{
      x: number;
      y: number;
      width: number;
      height: number;
      element: HTMLElement;
    }>
  >;
  isDebugEnabled: boolean;
  domCollisionThreshold: number;
}) {
  const { colors } = useTheme();
  const groupRef = useRef<THREE.Group>(null);

  // Always cleanup on unmount
  useEffect(() => {
    return () => {
      if (groupRef.current) {
        // Dispose all children recursively
        groupRef.current.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry?.dispose();
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach((material) => material.dispose());
              } else {
                child.material.dispose();
              }
            }
          }
        });
        groupRef.current.clear();
        // Remove reference
        groupRef.current = null;
      }
    };
  }, []);

  // Clean up when debug is disabled
  useEffect(() => {
    if (!isDebugEnabled && groupRef.current) {
      // Remove and dispose all children when debug is turned off
      groupRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach((material) => material.dispose());
            } else {
              child.material.dispose();
            }
          }
        }
      });
      groupRef.current.clear();
    }
  }, [isDebugEnabled]);

  if (!isDebugEnabled || domColliders.current.length === 0) {
    return <group ref={groupRef} />;
  }

  // Create multiple layers for gradient shadow effect
  const gradientLayers = 6; // Reduced from 10 to improve performance

  return (
    <group ref={groupRef}>
      {domColliders.current.map((collider, i) => (
        <React.Fragment key={`collider-${i}-${collider.x}-${collider.y}`}>
          {/* Render shadow gradient layers - largest to smallest for proper layering */}
          {Array.from({ length: gradientLayers })
            .reverse()
            .map((_, reverseIndex) => {
              const layerIndex = gradientLayers - 1 - reverseIndex;
              const layerProgress = (layerIndex + 1) / gradientLayers;
              const extension = domCollisionThreshold * layerProgress;

              // Calculate the size for this layer (extending outward from collision box)
              const layerWidth = collider.width + extension * 2;
              const layerHeight = collider.height + extension * 2;

              // Create a smooth opacity falloff - stronger at edges, weaker further out
              const opacity = 0.15 * Math.pow(1 - layerProgress, 1.5);

              return (
                <mesh
                  key={`shadow-${i}-${layerIndex}`}
                  position={[
                    collider.x,
                    collider.y,
                    -0.002 - layerIndex * 0.001,
                  ]}
                >
                  <boxGeometry args={[layerWidth, layerHeight, 0.001]} />
                  <meshBasicMaterial
                    color={colors.accent.shades[500].hex}
                    transparent={true}
                    opacity={opacity}
                  />
                </mesh>
              );
            })}

          {/* Main collision box - solid fill to "cut out" the center */}
          <mesh key={`solid-${i}`} position={[collider.x, collider.y, -0.001]}>
            <boxGeometry args={[collider.width, collider.height, 0.002]} />
            <meshBasicMaterial
              color={colors.accent.shades[500].hex}
              transparent={true}
              opacity={0}
            />
          </mesh>

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
  const glRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const [canRender, setCanRender] = useState(false);

  // Get settings from context - REMOVED useDebug to prevent re-renders
  const { networkSettings } = useSettings();

  // Prevent multiple instances and add delay
  useEffect(() => {
    if (globalCanvasActive) {
      return;
    }

    const timer = setTimeout(() => {
      if (!globalCanvasActive) {
        globalCanvasActive = true;
        setCanRender(true);
      }
    }, 150); // Small delay to ensure previous instance is cleaned up

    return () => {
      clearTimeout(timer);
      setCanRender(false);
      // Don't reset global flag here - let WebGL cleanup handle it
    };
  }, []);

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
    containerDimensions.height,
    networkSettings.domCollisionPadding
  );
  const nodeRefs = useNodeRefs(resolvedNodeCount);
  const { shouldAnimate } = useViewportVisibility(containerRef);
  const { isDebugEnabled } = useDebug();

  // Generate stable node positions that preserve existing nodes during count changes
  const nodes = useStableNodePositions(
    resolvedNodeCount,
    containerDimensions.width,
    containerDimensions.height
  );

  // Cleanup WebGL context on unmount
  useEffect(() => {
    return () => {
      // Dispose of the scene and all its children
      if (sceneRef.current) {
        sceneRef.current.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry?.dispose();
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach((material) => material.dispose());
              } else {
                child.material.dispose();
              }
            }
          }
          if (child instanceof THREE.Line || (child as any).isLine2) {
            const lineChild = child as THREE.Line;
            lineChild.geometry?.dispose();
            if (lineChild.material) {
              if (Array.isArray(lineChild.material)) {
                lineChild.material.forEach((material) => material.dispose());
              } else {
                lineChild.material.dispose();
              }
            }
          }
        });
        sceneRef.current.clear();
      }

      // Safely dispose of the WebGL renderer
      safeDisposeRenderer(glRef.current);
      glRef.current = null;

      // Reset global flag only after successful disposal
      globalCanvasActive = false;
    };
  }, []);

  // If disabled or not ready to render, just render children without canvas
  if (disabled || !canRender) {
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
          onCreated={({ gl, scene }) => {
            glRef.current = gl;
            sceneRef.current = scene;
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

          {/* Debug Colliders */}
          <DebugColliders
            key={`debug-colliders-${isDebugEnabled}`}
            domColliders={domColliders}
            isDebugEnabled={isDebugEnabled}
            domCollisionThreshold={networkSettings.domCollisionThreshold}
          />
        </Canvas>
      </div>

      {/* Foreground Content */}
      <>{children}</>
    </div>
  );
}
