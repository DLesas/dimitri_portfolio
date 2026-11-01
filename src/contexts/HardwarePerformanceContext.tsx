"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { PERFORMANCE_CONFIGS } from "@/components/NetworkBackground/constants";

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * Hardware performance levels based on device capabilities
 */
export type PerformanceLevel = "low" | "medium" | "high";

/**
 * Detailed hardware information detected from the browser
 */
export interface HardwareInfo {
  /** Number of CPU cores/threads available */
  cores: number;
  /** Device memory in GB (if available) */
  memory: number;
  /** Whether this appears to be a mobile device */
  isMobile: boolean;
  /** Whether this appears to be a tablet */
  isTablet: boolean;
  /** GPU renderer information (if available) */
  gpu?: string;
  /** Whether hardware acceleration is available */
  hasHardwareAcceleration: boolean;
  /** Browser name and version */
  browser: {
    name: string;
    version: string;
  };
}

/**
 * Performance settings derived from hardware capabilities
 */
export interface PerformanceSettings {
  /** Recommended performance level */
  level: PerformanceLevel;
  /** Network background configuration */
  network: (typeof PERFORMANCE_CONFIGS)[PerformanceLevel];
}

/**
 * Hardware performance context interface
 */
interface HardwarePerformanceContextType {
  /** Detected hardware information */
  hardwareInfo: HardwareInfo;
  /** Performance settings based on hardware */
  performanceSettings: PerformanceSettings;
  /** Whether detection is complete */
  isDetectionComplete: boolean;
}

// ============================================================================
// Hardware Detection Utilities
// ============================================================================

/**
 * Detect device type based on user agent and screen characteristics
 */
function detectDeviceType(userAgent: string): {
  isMobile: boolean;
  isTablet: boolean;
} {
  const mobileRegex =
    /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i;
  const tabletRegex = /iPad|Android(?=.*Tablet)|Tablet/i;

  const isMobile = mobileRegex.test(userAgent) && !tabletRegex.test(userAgent);
  const isTablet = tabletRegex.test(userAgent);

  return { isMobile, isTablet };
}

/**
 * Parse browser information from user agent
 */
function detectBrowser(userAgent: string): { name: string; version: string } {
  // Chrome/Chromium (Edge too: its user agent includes "Chrome")
  if (userAgent.includes("Chrome")) {
    const match = userAgent.match(/Chrome\/(\d+)/);
    return { name: "Chrome", version: match?.[1] || "unknown" };
  }

  // Firefox
  if (userAgent.includes("Firefox")) {
    const match = userAgent.match(/Firefox\/(\d+)/);
    return { name: "Firefox", version: match?.[1] || "unknown" };
  }

  // Safari
  if (userAgent.includes("Safari")) {
    const match = userAgent.match(/Safari\/(\d+)/);
    return { name: "Safari", version: match?.[1] || "unknown" };
  }

  return { name: "Unknown", version: "unknown" };
}

/**
 * Detect GPU information using WebGL
 */
function detectGPU(): { gpu?: string; hasHardwareAcceleration: boolean } {
  try {
    if (typeof window === "undefined") {
      return { hasHardwareAcceleration: false };
    }

    const canvas = document.createElement("canvas");
    const gl =
      (canvas.getContext("webgl") as WebGLRenderingContext | null) ||
      (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);

    if (!gl) {
      return { hasHardwareAcceleration: false };
    }

    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
    const gpu = debugInfo
      ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
      : undefined;

    return {
      gpu: typeof gpu === "string" ? gpu : undefined,
      hasHardwareAcceleration: true,
    };
  } catch {
    return { hasHardwareAcceleration: false };
  }
}

/**
 * Hardware detection
 */
function detectHardwareInfo(): HardwareInfo {
  const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const cores =
    typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 2 : 2;
  const memory =
    typeof navigator !== "undefined"
      ? (navigator as unknown as { deviceMemory?: number }).deviceMemory || 4
      : 4;
  const deviceType = detectDeviceType(userAgent);
  const browser = detectBrowser(userAgent);
  const gpuInfo = detectGPU();

  return {
    cores,
    memory,
    ...deviceType,
    browser,
    ...gpuInfo,
  };
}

/**
 * Determine performance level based on hardware capabilities
 */
function determinePerformanceLevel(
  hardwareInfo: HardwareInfo
): PerformanceLevel {
  // Mobile devices are typically lower performance
  if (hardwareInfo.isMobile) {
    return "low";
  }

  // Tablets can vary but generally medium performance
  if (hardwareInfo.isTablet) {
    // iPad Pro and high-end Android tablets
    if (hardwareInfo.cores >= 6 && hardwareInfo.memory >= 4) {
      return "medium";
    }
    return "low";
  }

  // Desktop/laptop performance assessment
  const { cores, memory, hasHardwareAcceleration, browser } = hardwareInfo;

  // Check for low-end indicators
  if (!hasHardwareAcceleration || cores <= 2 || memory <= 2) {
    return "low";
  }

  // Check for high-end indicators
  if (cores >= 8 && memory >= 8 && hasHardwareAcceleration) {
    return "high";
  }

  // Safari on older hardware can be less performant
  if (browser.name === "Safari" && cores <= 4) {
    return "medium";
  }

  // Default to medium for most desktop configurations
  return "medium";
}

// ============================================================================
// Context Creation
// ============================================================================

const HardwarePerformanceContext = createContext<
  HardwarePerformanceContextType | undefined
>(undefined);

// ============================================================================
// Provider Component
// ============================================================================

/**
 * Hardware performance provider component
 *
 * Detects device hardware capabilities and provides performance-optimized
 * settings for the entire application. This enables components to adapt
 * their behavior based on the user's device capabilities.
 *
 * Features:
 * - Comprehensive hardware detection (CPU, memory, GPU, device type)
 * - Performance level determination (low/medium/high)
 * - Optimized settings for the network background
 * - Browser detection for compatibility adjustments
 */
export function HardwarePerformanceProvider({
  children,
}: {
  children: ReactNode;
}) {
  // ========================================
  // State Management
  // ========================================

  const [hardwareInfo, setHardwareInfo] = useState<HardwareInfo | null>(null);
  const [isDetectionComplete, setIsDetectionComplete] = useState(false);

  // ========================================
  // Automatic Detection on Mount
  // ========================================

  /**
   * Detect the hardware once, on mount, during idle time, so it never blocks the
   * initial render. Detection never throws (detectGPU catches WebGL failures).
   */
  useEffect(() => {
    const detectHardware = () => {
      const info = detectHardwareInfo();
      setHardwareInfo(info);
      setIsDetectionComplete(true);

      // Log detection results in development
      if (process.env.NODE_ENV === "development") {
        console.log("Hardware Performance Detection:", {
          level: determinePerformanceLevel(info),
          info,
        });
      }
    };

    // Use requestIdleCallback for non-blocking detection during idle time
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      window.requestIdleCallback(() => detectHardware(), {
        timeout: 3000, // Reasonable timeout for hardware detection
      });
    } else {
      // Fallback for older browsers - use setTimeout with delay
      setTimeout(() => detectHardware(), 100);
    }
  }, []);

  // ========================================
  // Computed Values
  // ========================================

  const level = hardwareInfo ? determinePerformanceLevel(hardwareInfo) : "medium";

  // ========================================
  // Context Value
  // ========================================

  const contextValue: HardwarePerformanceContextType = {
    hardwareInfo: hardwareInfo || {
      cores: 4,
      memory: 4,
      isMobile: false,
      isTablet: false,
      hasHardwareAcceleration: true,
      browser: { name: "Unknown", version: "unknown" },
    },
    performanceSettings: { level, network: PERFORMANCE_CONFIGS[level] },
    isDetectionComplete,
  };

  return (
    <HardwarePerformanceContext.Provider value={contextValue}>
      {children}
    </HardwarePerformanceContext.Provider>
  );
}

// ============================================================================
// Context Hook
// ============================================================================

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
