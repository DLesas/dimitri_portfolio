"use client";

import React, { useEffect, useRef } from "react";
import { Button, Slider } from "@heroui/react";
import { FaUndo, FaCloud } from "react-icons/fa";
import { useSettings } from "@/contexts/SettingsContext";
import { SettingsSection } from "../SettingsSection";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { WORDCLOUD_SETTINGS_CONFIG } from "../config";
import type { WordCloudSettings } from "@/contexts/SettingsContext";

// ============================================================================
// Types
// ============================================================================

interface WordCloudSettingsSliderProps {
  /** The setting key from WordCloudSettings */
  setting: keyof WordCloudSettings;
  /** Optional CSS class name */
  className?: string;
}

// ============================================================================
// WordCloud Settings Slider Component
// ============================================================================

/**
 * Configuration-driven slider component for word cloud settings
 */
function WordCloudSettingsSlider({
  setting,
  className = "",
}: WordCloudSettingsSliderProps) {
  const { wordCloudSettings, updateWordCloudSettings, resetGeneration } =
    useSettings();
  const config = WORDCLOUD_SETTINGS_CONFIG[setting];
  const currentValue = wordCloudSettings[setting];

  const { localValue, debouncedValue, setLocalValue } = useDebouncedValue(
    currentValue,
    300
  );

  const debouncedResetGeneration = useRef(resetGeneration);

  useEffect(() => {
    if (debouncedValue !== currentValue) {
      if (debouncedResetGeneration.current === resetGeneration) {
        updateWordCloudSettings({ [setting]: debouncedValue });
      }
    }
  }, [
    debouncedValue,
    currentValue,
    setting,
    updateWordCloudSettings,
    resetGeneration,
  ]);

  const handleChange = (newValue: number | number[]) => {
    debouncedResetGeneration.current = resetGeneration;
    const numValue = Array.isArray(newValue) ? newValue[0] : newValue;
    setLocalValue(numValue);
  };

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

// ============================================================================
// Component
// ============================================================================

/**
 * WordCloud Settings Panel
 *
 * A settings panel for controlling word cloud visualization parameters.
 * Currently supports rotation speed controls for X and Y axes.
 */
export function WordCloudSettingsPanel() {
  const { resetWordCloudSettings } = useSettings();

  return (
    <div className="w-80 max-h-[80vh] flex flex-col">
      {/* Panel Header with Reset Button - Fixed at top */}
      <div className="flex items-center justify-between p-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <FaCloud className="w-4 h-4 text-primary/70" />
          <h3 className="text-lg font-bold">Word Cloud</h3>
        </div>
        <Button
          size="sm"
          variant="flat"
          color="default"
          startContent={<FaUndo className="w-3 h-3" />}
          onPress={resetWordCloudSettings}
          aria-label="Reset all word cloud settings to defaults"
        >
          Reset
        </Button>
      </div>

      {/* Scrollable Settings Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-8">
        <SettingsSection title="Rotation" icon={null}>
          <WordCloudSettingsSlider setting="rotationSpeedX" />
          <WordCloudSettingsSlider setting="rotationSpeedY" />
        </SettingsSection>

        <SettingsSection title="Appearance" icon={null}>
          <WordCloudSettingsSlider setting="baseFontSize" />
        </SettingsSection>
      </div>
    </div>
  );
}
