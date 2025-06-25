"use client";

import React, { useEffect, useRef } from "react";
import { Slider } from "@heroui/react";
import { useSettings } from "@/contexts/SettingsContext";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { NETWORK_SETTINGS_CONFIG } from "../config";
import type { NetworkBackgroundSettings } from "@/contexts/SettingsContext";

// ============================================================================
// Types
// ============================================================================

interface SettingsSliderProps {
  /** The setting key from NetworkBackgroundSettings */
  setting: keyof NetworkBackgroundSettings;
  /** Optional CSS class name */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Configuration-driven slider component for network background settings
 *
 * Features:
 * - Automatic value retrieval from settings context
 * - Debounced updates to prevent excessive context updates
 * - Centralized configuration for min/max/step values via NETWORK_SETTINGS_CONFIG
 * - Reset-safe operation using generation-based update invalidation
 * - Tooltips and notes from configuration
 *
 * Reset Safety:
 * This component implements a generation-based approach to prevent race conditions
 * between user interactions and reset operations. Each debounced update carries
 * a "generation" number that must match the current reset generation for the
 * update to be applied. This prevents stale updates from overriding reset values.
 *
 * @example
 * ```tsx
 * <SettingsSlider setting="nodeCount" />
 * <SettingsSlider setting="connectionDistance" className="my-4" />
 * ```
 */
export function SettingsSlider({
  setting,
  className = "",
}: SettingsSliderProps) {
  // ========================================
  // Context & Configuration
  // ========================================

  const { networkSettings, updateNetworkSettings, resetGeneration } =
    useSettings();
  const config = NETWORK_SETTINGS_CONFIG[setting];
  const currentValue = networkSettings[setting];

  // ========================================
  // Debounced Value Management
  // ========================================

  const { localValue, debouncedValue, setLocalValue } = useDebouncedValue(
    currentValue,
    300 // 300ms debounce delay
  );

  /**
   * Reset generation tracking
   * Captures the reset generation when a user interaction occurs.
   * Debounced updates will only apply if their generation matches the current one.
   */
  const debouncedResetGeneration = useRef(resetGeneration);

  // ========================================
  // Effects
  // ========================================

  /**
   * Apply debounced settings updates
   * Only applies updates if they're from the current reset generation
   * to prevent stale updates from overriding reset operations
   */
  useEffect(() => {
    if (debouncedValue !== currentValue) {
      // Generation check prevents race conditions with reset operations
      if (debouncedResetGeneration.current === resetGeneration) {
        updateNetworkSettings({ [setting]: debouncedValue });
      }
    }
  }, [
    debouncedValue,
    currentValue,
    setting,
    updateNetworkSettings,
    resetGeneration,
  ]);

  // ========================================
  // Event Handlers
  // ========================================

  /**
   * Handle slider value changes
   * Captures the current reset generation to ensure this update is valid
   */
  const handleChange = (newValue: number | number[]) => {
    // Capture current generation for this interaction
    debouncedResetGeneration.current = resetGeneration;

    // Extract numeric value (Hero UI sliders can return arrays)
    const numValue = Array.isArray(newValue) ? newValue[0] : newValue;
    setLocalValue(numValue);
  };

  // ========================================
  // Render
  // ========================================

  return (
    <div className={className}>
      <Slider
        label={config.label}
        value={localValue}
        onChange={handleChange}
        minValue={config.min}
        maxValue={config.max}
        step={config.step}
        size="sm"
        color="primary"
        showTooltip={true}
        tooltipProps={{
          placement: "top",
          content: config.tooltip || localValue.toString(),
        }}
      />
      {config.note && (
        <div className="text-xs text-foreground/60 mt-1 ml-1">
          {config.note}
        </div>
      )}
    </div>
  );
}
