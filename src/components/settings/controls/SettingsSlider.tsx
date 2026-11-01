"use client";

import { Label, Slider } from "@heroui/react";
import { useSettings } from "@/contexts/SettingsContext";
import { useDebouncedSetting } from "@/hooks/useDebouncedSetting";
import type { SliderConfig } from "../types";

// ============================================================================
// Types
// ============================================================================

interface SettingsSliderProps {
  /** Range, step, label and help text */
  config: SliderConfig;
  /** The setting's current value */
  value: number;
  /** Saves a new value */
  onCommit: (value: number) => void;
}

/** Changes are committed once the slider has rested this long */
const COMMIT_DELAY_MS = 300;

// ============================================================================
// Component
// ============================================================================

/**
 * Configuration-driven slider for a numeric setting
 *
 * The slider moves at once; the value is committed once it rests (debounced), and a
 * reset during that wait wins over the pending change (see useDebouncedSetting).
 *
 * @example
 * ```tsx
 * <SettingsSlider
 *   config={NETWORK_SETTINGS_CONFIG.nodeCount}
 *   value={networkSettings.nodeCount}
 *   onCommit={(nodeCount) => updateNetworkSettings({ nodeCount })}
 * />
 * ```
 */
export function SettingsSlider({ config, value, onCommit }: SettingsSliderProps) {
  const { resetGeneration } = useSettings();
  const [shownValue, change] = useDebouncedSetting(
    value,
    onCommit,
    resetGeneration,
    COMMIT_DELAY_MS
  );

  // HeroUI sliders can report an array (for ranges)
  const handleChange = (newValue: number | number[]) =>
    change(Array.isArray(newValue) ? newValue[0] : newValue);

  return (
    <div>
      <Slider
        value={shownValue}
        onChange={handleChange}
        minValue={config.min}
        maxValue={config.max}
        step={config.step}
      >
        <Label title={config.tooltip}>{config.label}</Label>
        <Slider.Output />
        <Slider.Track>
          <Slider.Fill />
          <Slider.Thumb />
        </Slider.Track>
      </Slider>
      {config.note && (
        <div className="text-xs text-foreground/60 mt-1 ml-1">
          {config.note}
        </div>
      )}
    </div>
  );
}
