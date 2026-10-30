"use client";

import React, { useState, useEffect } from "react";
import { Label, Slider } from "@heroui/react";

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
  const [prevValue, setPrevValue] = useState(value);

  // Update local value when prop value changes (adjusted during render rather than in an effect)
  if (value !== prevValue) {
    setPrevValue(value);
    setLocalValue(value);
  }

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
      value={localValue}
      onChange={handleChange}
      minValue={min}
      maxValue={max}
      step={step}
      className={className}
    >
      <Label>{label}</Label>
      <Slider.Output />
      <Slider.Track>
        <Slider.Fill />
        <Slider.Thumb />
      </Slider.Track>
    </Slider>
  );
}
