"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import { PERFORMANCE_CONFIGS } from "@/components/NetworkBackground/constants";
import { retryWithBackoff, RetryPresets } from "@/utils/retry";

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
  /** User agent string for device detection */
  userAgent: string;
  /** Whether this appears to be a mobile device */
  isMobile: boolean;
  /** Whether this appears to be a tablet */
  isTablet: boolean;
  /** Whether this appears to be a desktop/laptop */
  isDesktop: boolean;
  /** GPU renderer information (if available) */
  gpu?: string;
  /** Whether hardware acceleration is available */
  hasHardwareAcceleration: boolean;
  /** Browser name and version */
  browser: {
    name: string;
    version: string;
  };
  /** Operating system information */
  os: {
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
  /** Recommended animation settings */
  animations: {
    reducedMotion: boolean;
    maxParticles: number;
    targetFPS: number;
  };
  /** Display settings */
  display: {
    pixelRatio: number;
    antialiasing: boolean;
    shadowQuality: "off" | "low" | "medium" | "high";
  };
}

/**
 * Hardware performance context interface
 */
interface HardwarePerformanceContextType {
  /** Detected hardware information */
  hardwareInfo: HardwareInfo;
  /** Performance settings based on hardware */
  performanceSettings: PerformanceSettings;
  /** Manual override for performance level */
  setPerformanceLevel: (level: PerformanceLevel) => void;
  /** Whether detection is complete */
  isDetectionComplete: boolean;
  /** Whether detection failed */
  hasDetectionFailed: boolean;
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
  isDesktop: boolean;
} {
  const mobileRegex =
    /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i;
  const tabletRegex = /iPad|Android(?=.*Tablet)|Tablet/i;

  const isMobile = mobileRegex.test(userAgent) && !tabletRegex.test(userAgent);
  const isTablet = tabletRegex.test(userAgent);
  const isDesktop = !isMobile && !isTablet;

  return { isMobile, isTablet, isDesktop };
}

/**
 * Parse browser information from user agent
 */
function detectBrowser(userAgent: string): { name: string; version: string } {
  // Chrome/Chromium
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
  if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) {
    const match = userAgent.match(/Safari\/(\d+)/);
    return { name: "Safari", version: match?.[1] || "unknown" };
  }

  // Edge
  if (userAgent.includes("Edg")) {
    const match = userAgent.match(/Edg\/(\d+)/);
    return { name: "Edge", version: match?.[1] || "unknown" };
  }

  return { name: "Unknown", version: "unknown" };
}

/**
 * Parse operating system information from user agent
 */
function detectOS(userAgent: string): { name: string; version: string } {
  // Windows
  if (userAgent.includes("Windows")) {
    if (userAgent.includes("Windows NT 10.0"))
      return { name: "Windows", version: "10/11" };
    if (userAgent.includes("Windows NT 6.3"))
      return { name: "Windows", version: "8.1" };
    if (userAgent.includes("Windows NT 6.1"))
      return { name: "Windows", version: "7" };
    return { name: "Windows", version: "unknown" };
  }

  // macOS
  if (userAgent.includes("Mac OS X")) {
    const match = userAgent.match(/Mac OS X (\d+_\d+)/);
    return {
      name: "macOS",
      version: match?.[1]?.replace("_", ".") || "unknown",
    };
  }

  // iOS
  if (userAgent.includes("iPhone OS") || userAgent.includes("OS ")) {
    const match = userAgent.match(/OS (\d+_\d+)/);
    return { name: "iOS", version: match?.[1]?.replace("_", ".") || "unknown" };
  }

  // Android
  if (userAgent.includes("Android")) {
    const match = userAgent.match(/Android (\d+\.?\d*)/);
    return { name: "Android", version: match?.[1] || "unknown" };
  }

  // Linux
  if (userAgent.includes("Linux")) {
    return { name: "Linux", version: "unknown" };
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
 * Comprehensive hardware detection
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
  const os = detectOS(userAgent);
  const gpuInfo = detectGPU();

  return {
    cores,
    memory,
    userAgent,
    ...deviceType,
    browser,
    os,
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

/**
 * Generate performance settings based on hardware level
 */
function generatePerformanceSettings(
  level: PerformanceLevel,
  hardwareInfo: HardwareInfo
): PerformanceSettings {
  const networkConfig = PERFORMANCE_CONFIGS[level];

  return {
    level,
    network: networkConfig,
    animations: {
      reducedMotion: level === "low" || hardwareInfo.isMobile,
      maxParticles: level === "low" ? 50 : level === "medium" ? 200 : 500,
      targetFPS: level === "low" ? 30 : level === "medium" ? 45 : 60,
    },
    display: {
      pixelRatio:
        level === "low"
          ? 1
          : Math.min(
              typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1,
              2
            ),
      antialiasing: level !== "low",
      shadowQuality:
        level === "low" ? "off" : level === "medium" ? "low" : "medium",
    },
  };
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
 * - Optimized settings for network background, animations, and display
 * - Manual performance level override capability
 * - Browser and OS detection for compatibility adjustments
 * - Automatic retry on detection failure
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
  const [manualPerformanceLevel, setManualPerformanceLevel] =
    useState<PerformanceLevel | null>(null);
  const [isDetectionComplete, setIsDetectionComplete] = useState(false);
  const [hasDetectionFailed, setHasDetectionFailed] = useState(false);

  // ========================================
  // Hardware Detection Function
  // ========================================

  const runDetection = useCallback(() => {
    const detectHardware = async () => {
      // Use the generalized retry utility for hardware detection
      const result = await retryWithBackoff(
        async () => {
          const info = detectHardwareInfo();
          return info;
        },
        {
          ...RetryPresets.slow, // Use slow preset for hardware detection
          retryDelay: 2000, // 2 second delay between retries
          maxRetries: 3, // Maximum 3 retries
          onRetry: (error, attempt, delay) => {
            console.log(
              `Retrying hardware detection in ${delay}ms (attempt ${
                attempt + 1
              }/3): ${error.message}`
            );
            setHasDetectionFailed(false); // Clear failure state during retry
          },
          onSuccess: (info, totalAttempts) => {
            setHardwareInfo(info);
            setIsDetectionComplete(true);
            setHasDetectionFailed(false);

            // Log detection results in development
            if (process.env.NODE_ENV === "development") {
              console.log("Hardware Performance Detection:", {
                level:
                  manualPerformanceLevel || determinePerformanceLevel(info),
                info,
                totalAttempts,
              });
            }
          },
          onMaxRetriesReached: (lastError, totalAttempts) => {
            console.warn(
              `Hardware detection failed after ${totalAttempts} attempts, using fallback values:`,
              lastError
            );
            setHasDetectionFailed(true);
            setIsDetectionComplete(true);

            // Set fallback hardware info
            setHardwareInfo({
              cores: 2,
              memory: 4,
              userAgent:
                typeof navigator !== "undefined" ? navigator.userAgent : "",
              isMobile: false,
              isTablet: false,
              isDesktop: true,
              hasHardwareAcceleration: false,
              browser: { name: "Unknown", version: "unknown" },
              os: { name: "Unknown", version: "unknown" },
            });
          },
        }
      );

      // Handle the result (success is already handled in onSuccess callback)
      if (!result.success && !result.retriesExhausted) {
        // This case handles when shouldRetry returns false
        console.warn("Hardware detection aborted:", result.error);
        setHasDetectionFailed(true);
        setIsDetectionComplete(true);
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
  }, [manualPerformanceLevel]);

  // ========================================
  // Automatic Detection on Mount
  // ========================================

  /**
   * Automatic run hardware detection on component mount during idle time
   * This ensures hardware info is available without blocking initial render
   */
  useEffect(() => {
    runDetection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only run on mount

  // ========================================
  // Computed Values
  // ========================================

  const performanceLevel =
    manualPerformanceLevel ||
    (hardwareInfo ? determinePerformanceLevel(hardwareInfo) : "medium");
  const performanceSettings = hardwareInfo
    ? generatePerformanceSettings(performanceLevel, hardwareInfo)
    : generatePerformanceSettings("medium", {
        cores: 4,
        memory: 4,
        userAgent: "",
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        hasHardwareAcceleration: true,
        browser: { name: "Unknown", version: "unknown" },
        os: { name: "Unknown", version: "unknown" },
      });

  // ========================================
  // Methods
  // ========================================

  const setPerformanceLevel = (level: PerformanceLevel) => {
    setManualPerformanceLevel(level);
  };

  // ========================================
  // Context Value
  // ========================================

  const contextValue: HardwarePerformanceContextType = {
    hardwareInfo: hardwareInfo || {
      cores: 4,
      memory: 4,
      userAgent: "",
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      hasHardwareAcceleration: true,
      browser: { name: "Unknown", version: "unknown" },
      os: { name: "Unknown", version: "unknown" },
    },
    performanceSettings,
    setPerformanceLevel,
    isDetectionComplete,
    hasDetectionFailed,
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
