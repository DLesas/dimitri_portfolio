"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { PerformanceLevel } from "@/components/NetworkBackground/constants";
import { detectHardware, performanceLevelFor, type HardwareInfo } from "@/lib/hardware";
import { whenIdle } from "@/lib/idle";
import { devLog } from "@/lib/devLog";

interface HardwarePerformanceContextValue {
  /** Detected hardware information (placeholder values until detection completes) */
  hardwareInfo: HardwareInfo;
  /** The device's tier ("medium" until detection completes) */
  performanceLevel: PerformanceLevel;
  /** Whether detection is complete */
  isDetectionComplete: boolean;
}

/** Until detection completes */
const PLACEHOLDER_HARDWARE: HardwareInfo = {
  cores: 4,
  memory: 4,
  isMobile: false,
  isTablet: false,
  hasHardwareAcceleration: true,
  browser: { name: "Unknown", version: "unknown" },
};

const HardwarePerformanceContext = createContext<HardwarePerformanceContextValue | undefined>(
  undefined
);

/**
 * Detects the device's hardware and performance tier (lib/hardware.ts) once, when the
 * browser is first idle, so it never blocks the initial render
 */
export function HardwarePerformanceProvider({ children }: { children: ReactNode }) {
  const [hardwareInfo, setHardwareInfo] = useState<HardwareInfo | null>(null);

  useEffect(
    () =>
      whenIdle(
        () => {
          const info = detectHardware();
          setHardwareInfo(info);
          devLog.log("Hardware Performance Detection:", {
            level: performanceLevelFor(info),
            info,
          });
        },
        { timeout: 3000, fallbackMs: 100 }
      ),
    []
  );

  const value = useMemo<HardwarePerformanceContextValue>(
    () => ({
      hardwareInfo: hardwareInfo ?? PLACEHOLDER_HARDWARE,
      performanceLevel: hardwareInfo ? performanceLevelFor(hardwareInfo) : "medium",
      isDetectionComplete: hardwareInfo !== null,
    }),
    [hardwareInfo]
  );

  return <HardwarePerformanceContext value={value}>{children}</HardwarePerformanceContext>;
}

/**
 * Hook to access hardware performance context
 * Must be used within a HardwarePerformanceProvider
 */
export function useHardwarePerformance() {
  const context = useContext(HardwarePerformanceContext);
  if (context === undefined) {
    throw new Error(
      "useHardwarePerformance must be used within a HardwarePerformanceProvider"
    );
  }
  return context;
}
