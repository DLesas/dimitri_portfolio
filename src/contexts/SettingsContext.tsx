"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import {
  ANIMATION_CONFIG,
  VISUAL_CONFIG,
} from "@/components/NetworkBackground/constants";
import { useHardwarePerformance } from "./HardwarePerformanceContext";

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
 * localStorage key for persisting settings
 */
const STORAGE_KEY = "dimitri-portfolio-settings";

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
 * Generate default network background settings based on hardware performance
 * This ensures optimal performance across different device types
 */
function generateDefaultNetworkSettings(
  performanceConfig: Record<string, unknown>
): NetworkBackgroundSettings {
  return {
    // Node configuration
    nodeCount: performanceConfig.NODE_COUNT as number,
    nodeRadius: VISUAL_CONFIG.NODE_RADIUS,
    nodeOpacity: VISUAL_CONFIG.NODE_OPACITY,
    organicMovementSpeed: ANIMATION_CONFIG.ORGANIC_MOVEMENT_SPEED,

    // Connection configuration
    connectionDistance: performanceConfig.CONNECTION_DISTANCE as number,
    maxConnections: performanceConfig.MAX_CONNECTIONS as number,
    connectionLineWidth: 2.0,

    // Mouse interaction configuration
    mouseRepulsionRadius: ANIMATION_CONFIG.MOUSE_REPULSION_RADIUS,
    mouseRepulsionStrength: ANIMATION_CONFIG.MOUSE_REPULSION_STRENGTH,

    // DOM collision configuration
    domCollisionPadding: ANIMATION_CONFIG.DOM_COLLISION_PADDING,
    domCollisionStrength: ANIMATION_CONFIG.DOM_REPULSION_FORCE,
    domCollisionThreshold: ANIMATION_CONFIG.DOM_COLLISION_THRESHOLD,
  };
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
 * Manages network background settings with localStorage persistence and reset functionality
 * Now integrates with hardware performance detection for optimal defaults
 */
export function SettingsProvider({ children }: { children: ReactNode }) {
  // ========================================
  // Hardware Performance Integration
  // ========================================

  const { performanceSettings } = useHardwarePerformance();

  // ========================================
  // State Management
  // ========================================

  const [networkSettings, setNetworkSettings] =
    useState<NetworkBackgroundSettings>(() => {
      // Initialize with medium performance defaults
      // These are good defaults that work well on most devices
      const mediumDefaults = generateDefaultNetworkSettings({
        NODE_COUNT: 180,
        CONNECTION_DISTANCE: 5,
        MAX_CONNECTIONS: 100,
      });

      // Try to load from localStorage on first render only
      try {
        if (typeof window !== "undefined") {
          const saved = localStorage.getItem(STORAGE_KEY);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.networkSettings) {
              return {
                ...mediumDefaults,
                ...parsed.networkSettings,
              };
            }
          }
        }
      } catch (error) {
        console.warn("Failed to load settings from localStorage:", error);
      }
      return mediumDefaults;
    });

  const [wordCloudSettings, setWordCloudSettings] = useState<WordCloudSettings>(
    () => {
      // Try to load from localStorage on first render only
      try {
        if (typeof window !== "undefined") {
          const saved = localStorage.getItem(STORAGE_KEY);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.wordCloudSettings) {
              return {
                ...DEFAULT_WORDCLOUD_SETTINGS,
                ...parsed.wordCloudSettings,
              };
            }
          }
        }
      } catch (error) {
        console.warn(
          "Failed to load wordCloud settings from localStorage:",
          error
        );
      }
      return DEFAULT_WORDCLOUD_SETTINGS;
    }
  );

  /**
   * Reset generation counter
   * Incremented on each reset to invalidate pending debounced updates
   * This prevents race conditions between reset operations and slider updates
   */
  const [resetGeneration, setResetGeneration] = useState(0);

  // ========================================
  // Persistence Effect
  // ========================================

  /**
   * Batched localStorage persistence
   * Debounces saves to reduce I/O operations during rapid setting changes
   */
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      try {
        if (typeof window !== "undefined") {
          const settingsToSave = { networkSettings, wordCloudSettings };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(settingsToSave));
        }
      } catch (error) {
        console.warn("Failed to save settings to localStorage:", error);
      }
    }, STORAGE_SAVE_DELAY);

    return () => clearTimeout(timeoutId);
  }, [networkSettings, wordCloudSettings]);

  // ========================================
  // Settings Methods
  // ========================================

  /**
   * Update specific network settings
   * Merges updates with existing settings
   */
  const updateNetworkSettings = (
    updates: Partial<NetworkBackgroundSettings>
  ) => {
    setNetworkSettings((prev) => ({ ...prev, ...updates }));
  };

  /**
   * Reset all network settings to hardware-appropriate defaults
   * Uses current hardware performance level for optimal reset values
   */
  const resetNetworkSettings = () => {
    const currentDefaults = generateDefaultNetworkSettings(
      performanceSettings.network
    );
    setNetworkSettings(currentDefaults);
    setResetGeneration((prev) => prev + 1);

    if (process.env.NODE_ENV === "development") {
      console.log("Reset to hardware-based defaults:", {
        performanceLevel: performanceSettings.level,
        settings: currentDefaults,
      });
    }
  };

  /**
   * Update specific wordCloud settings
   * Merges updates with existing settings
   */
  const updateWordCloudSettings = (updates: Partial<WordCloudSettings>) => {
    setWordCloudSettings((prev) => ({ ...prev, ...updates }));
  };

  /**
   * Reset all wordCloud settings to defaults
   */
  const resetWordCloudSettings = () => {
    setWordCloudSettings(DEFAULT_WORDCLOUD_SETTINGS);
    setResetGeneration((prev) => prev + 1);

    if (process.env.NODE_ENV === "development") {
      console.log("Reset WordCloud to defaults:", DEFAULT_WORDCLOUD_SETTINGS);
    }
  };

  // ========================================
  // Context Value
  // ========================================

  const contextValue: SettingsContextType = {
    networkSettings,
    updateNetworkSettings,
    resetNetworkSettings,
    wordCloudSettings,
    updateWordCloudSettings,
    resetWordCloudSettings,
    resetGeneration,
  };

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
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
