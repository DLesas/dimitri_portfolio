"use client";

import React, { useState, useEffect } from "react";
import { Slider } from "@heroui/react";

interface DebouncedSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  className?: string;
}

export function DebouncedSlider({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  className = "",
}: DebouncedSliderProps) {
  const [localValue, setLocalValue] = useState(value);

  // Update local value when prop value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounced update to parent
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [localValue, onChange, value]);

  const handleChange = (newValue: number | number[]) => {
    const numValue = Array.isArray(newValue) ? newValue[0] : newValue;
    setLocalValue(numValue);
  };

  return (
    <Slider
      label={label}
      value={localValue}
      onChange={handleChange}
      minValue={min}
      maxValue={max}
      step={step}
      className={className}
      size="sm"
      color="primary"
      showTooltip={true}
      tooltipProps={{
        placement: "top",
        content: localValue.toString(),
      }}
    />
  );
}
