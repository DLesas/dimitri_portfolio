"use client";

import React, { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

// three.js and the scene load in their own chunk, after the page has painted
const NetworkCanvas = dynamic(() => import("./NetworkCanvas"), { ssr: false });

// Global flag to prevent multiple WebGL contexts
let globalCanvasActive = false;

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
  const [canRender, setCanRender] = useState(false);

  // One canvas at a time, started once the browser is idle after first paint
  useEffect(() => {
    if (disabled || globalCanvasActive) return;

    let owned = false;
    const start = () => {
      if (globalCanvasActive) return;
      globalCanvasActive = owned = true;
      setCanRender(true);
    };
    const idle = window.requestIdleCallback
      ? window.requestIdleCallback(start, { timeout: 1200 })
      : window.setTimeout(start, 150);

    return () => {
      if (window.cancelIdleCallback) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
      setCanRender(false);
      if (owned) globalCanvasActive = false;
    };
  }, [disabled]);

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      style={{ position: "relative", minHeight: "200px" }}
    >
      {canRender && (
        <NetworkCanvas
          containerRef={containerRef}
          nodeCount={nodeCount}
          connectionDistance={connectionDistance}
          performance={performance}
        />
      )}

      {/* Foreground Content */}
      {children}
    </div>
  );
}
