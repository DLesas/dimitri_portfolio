"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ANIMATION_CONFIG,
  EFFECTS_CONFIG,
  VISUAL_CONFIG,
  PERFORMANCE_CONFIGS,
  type PerformanceLevel,
} from "@/components/NetworkBackground/constants";
import { STORAGE_KEYS, readJSON, writeJSON } from "@/lib/storage";
import { useHardwarePerformance } from "./HardwarePerformanceContext";
import { useDebug } from "./DebugContext";

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * Network background settings interface
 * Contains all configurable parameters for the network visualization
 */
export interface NetworkBackgroundSettings {
  // Node settings
  nodeCount: number;
  nodeRadius: number;
  nodeOpacity: number;
  organicMovementSpeed: number;

  // Connection settings
  connectionDistance: number;
  maxConnections: number;
  connectionLineWidth: number;

  // Mouse interaction settings
  mouseRepulsionRadius: number;
  mouseRepulsionStrength: number;

  // DOM collision settings
  domCollisionPadding: number;
  domCollisionStrength: number;
  domCollisionThreshold: number;

  // Effects (0 = the classic look)
  glowIntensity: number;
  pulseDensity: number;
  pulseSpeed: number;
}

/**
 * WordCloud settings interface
 * Contains all configurable parameters for the word cloud visualization
 */
export interface WordCloudSettings {
  // Rotation settings
  rotationSpeedX: number;
  rotationSpeedY: number;
  /**
   * Base font size scaling factor applied to every word before length compensation
   * This controls the overall size of words in the 3D word cloud.
   */
  baseFontSize: number;
}

/**
 * Settings context interface
 * Provides settings state and methods to update/reset settings
 */
interface SettingsContextType {
  networkSettings: NetworkBackgroundSettings;
  updateNetworkSettings: (updates: Partial<NetworkBackgroundSettings>) => void;
  resetNetworkSettings: () => void;
  wordCloudSettings: WordCloudSettings;
  updateWordCloudSettings: (updates: Partial<WordCloudSettings>) => void;
  resetWordCloudSettings: () => void;
  resetGeneration: number; // Counter that increments on reset to invalidate pending debounced updates
}

// ============================================================================
// Constants & Defaults
// ============================================================================

/**
 * Debounce delay for localStorage saves (milliseconds)
 */
const STORAGE_SAVE_DELAY = 500;

/**
 * Default WordCloud settings
 */
const DEFAULT_WORDCLOUD_SETTINGS: WordCloudSettings = {
  rotationSpeedX: -0.003,
  rotationSpeedY: 0.004,
  baseFontSize: 1.3,
};

/**
 * Default network background settings for a performance tier
 * This ensures optimal performance across different device types
 */
function generateDefaultNetworkSettings(
  performanceConfig: (typeof PERFORMANCE_CONFIGS)[PerformanceLevel]
): NetworkBackgroundSettings {
  return {
    // Node configuration
    nodeCount: performanceConfig.NODE_COUNT,
    nodeRadius: VISUAL_CONFIG.NODE_RADIUS,
    nodeOpacity: VISUAL_CONFIG.NODE_OPACITY,
    organicMovementSpeed: ANIMATION_CONFIG.ORGANIC_MOVEMENT_SPEED,

    // Connection configuration
    connectionDistance: performanceConfig.CONNECTION_DISTANCE,
    maxConnections: performanceConfig.MAX_CONNECTIONS,
    connectionLineWidth: ANIMATION_CONFIG.CONNECTION_LINE_WIDTH,

    // Mouse interaction configuration
    mouseRepulsionRadius: ANIMATION_CONFIG.MOUSE_REPULSION_RADIUS,
    mouseRepulsionStrength: ANIMATION_CONFIG.MOUSE_REPULSION_STRENGTH,

    // DOM collision configuration
    domCollisionPadding: ANIMATION_CONFIG.DOM_COLLISION_PADDING,
    domCollisionStrength: ANIMATION_CONFIG.DOM_REPULSION_FORCE,
    domCollisionThreshold: ANIMATION_CONFIG.DOM_COLLISION_THRESHOLD,

    // Effects configuration
    glowIntensity: EFFECTS_CONFIG.GLOW_INTENSITY,
    pulseDensity: EFFECTS_CONFIG.PULSE_DENSITY,
    pulseSpeed: EFFECTS_CONFIG.PULSE_SPEED,
  };
}

/**
 * Medium performance defaults, used until hardware detection completes
 * These are good defaults that work well on most devices
 */
const MEDIUM_DEFAULT_NETWORK_SETTINGS = generateDefaultNetworkSettings(
  PERFORMANCE_CONFIGS.medium
);

/**
 * Earlier default values of settings whose defaults have since changed.
 *
 * Settings are saved on first load, defaults included, so a saved value equal to an
 * earlier default was never chosen by the visitor. Dropping it lets the current
 * default apply; values the visitor actually picked are kept.
 */
const SUPERSEDED_NETWORK_DEFAULTS: Partial<
  Record<keyof NetworkBackgroundSettings, number[]>
> = {
  pulseDensity: [0.35],
  pulseSpeed: [60],
};

interface SavedSettings {
  networkSettings?: Partial<NetworkBackgroundSettings>;
  wordCloudSettings?: Partial<WordCloudSettings>;
}

/**
 * Read previously saved settings from localStorage
 *
 * @returns The saved settings object, or null if none/unavailable
 */
function readSavedSettings(): SavedSettings | null {
  const saved = readJSON<SavedSettings>(STORAGE_KEYS.settings);
  const network = saved?.networkSettings as Record<string, unknown> | undefined;
  if (network) {
    for (const [key, oldDefaults] of Object.entries(SUPERSEDED_NETWORK_DEFAULTS)) {
      if (oldDefaults?.includes(network[key] as number)) delete network[key];
    }
  }
  return saved;
}

// ============================================================================
// Context Creation
// ============================================================================

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined
);

// ============================================================================
// Provider Component
// ============================================================================

/**
 * Settings provider component
 * Manages network background and word cloud settings with localStorage persistence and
 * reset, with network defaults sized for the device's performance tier
 */
export function SettingsProvider({ children }: { children: ReactNode }) {
  // ========================================
  // Hardware Performance Integration
  // ========================================

  const { performanceLevel, isDetectionComplete } = useHardwarePerformance();
  const { isDebugEnabled } = useDebug();

  // ========================================
  // State Management
  // ========================================

  // Read from localStorage once, on first render
  const [saved] = useState(readSavedSettings);

  // Saved settings count as user-modified, so hardware defaults never override them
  const [hasUserModifiedSettings, setHasUserModifiedSettings] = useState(
    () => !!saved?.networkSettings
  );

  // Saved settings, falling back to medium defaults
  const [networkSettings, setNetworkSettings] =
    useState<NetworkBackgroundSettings>(() => ({
      ...MEDIUM_DEFAULT_NETWORK_SETTINGS,
      ...saved?.networkSettings,
    }));

  const [wordCloudSettings, setWordCloudSettings] = useState<WordCloudSettings>(
    () => ({
      ...DEFAULT_WORDCLOUD_SETTINGS,
      ...saved?.wordCloudSettings,
    })
  );

  /**
   * Reset generation counter
   * Incremented on each reset to invalidate pending debounced updates
   * This prevents race conditions between reset operations and slider updates
   */
  const [resetGeneration, setResetGeneration] = useState(0);

  /** Performance level the hardware defaults were last checked against */
  const [checkedPerformanceLevel, setCheckedPerformanceLevel] =
    useState<PerformanceLevel | null>(null);

  // ========================================
  // Hardware-Based Auto-Update
  // ========================================

  /**
   * Automatically update to hardware-appropriate defaults once detection completes
   * (and again if the performance level changes). Only updates if the user hasn't
   * modified settings from the initial medium defaults. Adjusted during render
   * rather than in an effect, so the canvas never renders the stale defaults.
   */
  if (isDetectionComplete && checkedPerformanceLevel !== performanceLevel) {
    setCheckedPerformanceLevel(performanceLevel);

    if (!hasUserModifiedSettings) {
      // Check if current settings are still the initial medium defaults
      const currentSettingsMatch =
        JSON.stringify(networkSettings) ===
        JSON.stringify(MEDIUM_DEFAULT_NETWORK_SETTINGS);

      if (currentSettingsMatch) {
        // Generate hardware-appropriate defaults
        const hardwareDefaults = generateDefaultNetworkSettings(
          PERFORMANCE_CONFIGS[performanceLevel]
        );

        // Only update if the hardware defaults are different from current
        if (
          JSON.stringify(hardwareDefaults) !== JSON.stringify(networkSettings)
        ) {
          setNetworkSettings(hardwareDefaults);

          if (isDebugEnabled) {
            console.log("Auto-updated to hardware-appropriate defaults:", {
              performanceLevel,
              settings: hardwareDefaults,
            });
          }
        }
      }
    }
  }

  // ========================================
  // Persistence Effect
  // ========================================

  /**
   * Batched localStorage persistence
   * Debounces saves to reduce I/O operations during rapid setting changes
   */
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      writeJSON(STORAGE_KEYS.settings, { networkSettings, wordCloudSettings });
    }, STORAGE_SAVE_DELAY);

    return () => clearTimeout(timeoutId);
  }, [networkSettings, wordCloudSettings]);

  // ========================================
  // Settings Methods
  // ========================================

  /**
   * Update specific network settings
   * Merges updates with existing settings and marks as user-modified
   */
  const updateNetworkSettings = useCallback(
    (updates: Partial<NetworkBackgroundSettings>) => {
      setHasUserModifiedSettings(true);
      setNetworkSettings((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  /**
   * Reset all network settings to hardware-appropriate defaults
   * Uses current hardware performance level for optimal reset values
   */
  const resetNetworkSettings = useCallback(() => {
    const currentDefaults = generateDefaultNetworkSettings(
      PERFORMANCE_CONFIGS[performanceLevel]
    );
    setNetworkSettings(currentDefaults);
    setResetGeneration((prev) => prev + 1);

    if (isDebugEnabled) {
      console.log("Reset to hardware-based defaults:", {
        performanceLevel,
        settings: currentDefaults,
      });
    }
  }, [performanceLevel, isDebugEnabled]);

  /**
   * Update specific wordCloud settings
   * Merges updates with existing settings
   */
  const updateWordCloudSettings = useCallback(
    (updates: Partial<WordCloudSettings>) => {
      setWordCloudSettings((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  /**
   * Reset all wordCloud settings to defaults
   */
  const resetWordCloudSettings = useCallback(() => {
    setWordCloudSettings(DEFAULT_WORDCLOUD_SETTINGS);
    setResetGeneration((prev) => prev + 1);

    if (isDebugEnabled) {
      console.log("Reset WordCloud to defaults:", DEFAULT_WORDCLOUD_SETTINGS);
    }
  }, [isDebugEnabled]);

  // ========================================
  // Context Value
  // ========================================

  const contextValue = useMemo<SettingsContextType>(
    () => ({
      networkSettings,
      updateNetworkSettings,
      resetNetworkSettings,
      wordCloudSettings,
      updateWordCloudSettings,
      resetWordCloudSettings,
      resetGeneration,
    }),
    [
      networkSettings,
      updateNetworkSettings,
      resetNetworkSettings,
      wordCloudSettings,
      updateWordCloudSettings,
      resetWordCloudSettings,
      resetGeneration,
    ]
  );

  return <SettingsContext value={contextValue}>{children}</SettingsContext>;
}

// ============================================================================
// Context Hook
// ============================================================================

/**
 * Hook to access settings context
 * Must be used within a SettingsProvider
 */
export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
