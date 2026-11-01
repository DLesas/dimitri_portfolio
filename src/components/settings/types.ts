import type { IconType } from "react-icons";
import type { NetworkBackgroundSettings, WordCloudSettings } from "@/contexts/SettingsContext";

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
 * A slider for every network background setting, checked at compile time
 */
export type NetworkSettingsConfig = Record<keyof NetworkBackgroundSettings, SliderConfig>;

/**
 * A slider for every word cloud setting, checked at compile time
 */
export type WordCloudSettingsConfig = Record<keyof WordCloudSettings, SliderConfig>;

// ============================================================================
// Settings Organization Types
// ============================================================================

/**
 * A group of related settings, shown under a heading in a settings panel
 *
 * @template K - The settings' keys
 */
export interface SettingsCategory<K extends string = string> {
  /** Category display name */
  title: string;
  /** Icon shown next to the title */
  icon?: IconType;
  /** The settings in this category, in order */
  settings: K[];
}
