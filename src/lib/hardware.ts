/**
 * What the visitor's device is capable of: its hardware, read from the browser, and the
 * performance tier the 3D network and its default settings are sized for. Browser only.
 */
import type { PerformanceLevel } from "@/components/NetworkBackground/constants";

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

const MOBILE_USER_AGENT = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i;
const TABLET_USER_AGENT = /iPad|Android(?=.*Tablet)|Tablet/i;

/**
 * Detect device type based on user agent
 */
function detectDeviceType(userAgent: string): {
  isMobile: boolean;
  isTablet: boolean;
} {
  const isTablet = TABLET_USER_AGENT.test(userAgent);
  const isMobile = MOBILE_USER_AGENT.test(userAgent) && !isTablet;
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

let detected: HardwareInfo | null = null;

/**
 * This device's hardware. Detected on the first call and remembered for the page's
 * lifetime: the GPU probe creates a WebGL context, so it runs once.
 */
export function detectHardware(): HardwareInfo {
  if (detected) return detected;

  // deviceMemory is Chromium-only, so not in TypeScript's DOM types
  const nav: (Navigator & { deviceMemory?: number }) | undefined =
    typeof navigator !== "undefined" ? navigator : undefined;
  const userAgent = nav?.userAgent ?? "";

  detected = {
    cores: nav?.hardwareConcurrency || 2,
    memory: nav?.deviceMemory || 4,
    ...detectDeviceType(userAgent),
    browser: detectBrowser(userAgent),
    ...detectGPU(),
  };
  return detected;
}

/**
 * The device's tier: phones, tablets and weak or unaccelerated machines are low; a
 * machine with more than 4 cores and more than 4 GB is high; anything between is medium.
 * Where a browser doesn't report memory it counts as 4 GB, so at most medium.
 */
export function performanceLevelFor(info: HardwareInfo): PerformanceLevel {
  if (info.isMobile || info.isTablet) return "low";
  if (!info.hasHardwareAcceleration || info.cores <= 2 || info.memory <= 2) return "low";
  if (info.cores <= 4 || info.memory <= 4) return "medium";
  return "high";
}
