import React from "react";

// ============================================================================
// Settings Configuration Types
// ============================================================================

/**
 * Configuration for individual slider controls in the settings system
 *
 * This interface defines the metadata needed to render a settings slider
 * without repetitive component code. Each setting can be declaratively
 * configured with constraints, labels, and help text.
 */
export interface SliderConfig {
  /** Display label for the slider */
  label: string;
  /** Minimum allowed value */
  min: number;
  /** Maximum allowed value */
  max: number;
  /** Step size for value increments/decrements */
  step: number;
  /** Optional tooltip text explaining what this setting does */
  tooltip?: string;
  /** Optional note displayed below the slider (e.g., warnings, tips) */
  note?: string;
}

/**
 * Complete configuration mapping for all network background settings
 *
 * This type ensures that every setting in NetworkBackgroundSettings has
 * a corresponding SliderConfig. It provides compile-time safety and
 * centralizes all slider configurations for maintainability.
 */
export type NetworkSettingsConfig = {
  [K in keyof import("@/contexts/SettingsContext").NetworkBackgroundSettings]: SliderConfig;
};

/**
 * Complete configuration mapping for all wordCloud settings
 *
 * This type ensures that every setting in WordCloudSettings has
 * a corresponding SliderConfig. It provides compile-time safety and
 * centralizes all slider configurations for maintainability.
 */
export type WordCloudSettingsConfig = {
  [K in keyof import("@/contexts/SettingsContext").WordCloudSettings]: SliderConfig;
};

// ============================================================================
// Settings Organization Types
// ============================================================================

/**
 * Settings category configuration for organizing related controls
 *
 * Categories provide logical grouping of settings in the UI, making the
 * settings interface more navigable and intuitive. Each category includes
 * visual elements (title, icon) and defines which settings belong to it.
 */
export interface SettingsCategory {
  /** Category display name */
  title: string;
  /** Icon component to display next to title */
  icon: React.ReactNode;
  /** List of setting keys that belong to this category */
  settings: string[];
}
