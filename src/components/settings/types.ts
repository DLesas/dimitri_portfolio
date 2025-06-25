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

// ============================================================================
// Menu System Types
// ============================================================================

/**
 * Submenu configuration for the settings menu system
 *
 * Defines the structure for nested menu items in the settings interface.
 * Each submenu can have its own component and visual representation.
 */
export interface SubmenuConfig {
  /** Unique identifier for the submenu */
  key: string;
  /** Display title for the menu item */
  title: string;
  /** Icon component for the menu item */
  icon: React.ReactNode;
  /** Component to render when the submenu is opened */
  component: React.ComponentType;
}
