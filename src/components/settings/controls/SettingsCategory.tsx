"use client";

import React from "react";
import { SettingsSection } from "../SettingsSection";
import { SettingsSlider } from "./SettingsSlider";
import type { SettingsCategory } from "../types";
import type { NetworkBackgroundSettings } from "@/contexts/SettingsContext";

// ============================================================================
// Types
// ============================================================================

interface SettingsCategoryProps {
  /** Category configuration object */
  category: SettingsCategory;
  /** Optional CSS class name */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Settings category component for grouping related settings
 *
 * This component takes a category configuration and automatically renders
 * all the settings sliders for that category, eliminating the need to
 * manually list each slider. It provides a clean, organized way to display
 * groups of related settings.
 *
 * Features:
 * - Automatic rendering of all settings in a category
 * - Configuration-driven approach eliminates repetitive code
 * - Consistent styling and organization via SettingsSection wrapper
 * - Type-safe setting key handling
 *
 * @example
 * ```tsx
 * <SettingsCategory category={SETTINGS_CATEGORIES[0]} />
 * ```
 */
export function SettingsCategory({
  category,
  className = "",
}: SettingsCategoryProps) {
  // ========================================
  // Render
  // ========================================

  return (
    <SettingsSection
      title={category.title}
      icon={category.icon}
      className={className}
    >
      {/* Render all sliders for this category */}
      <div className="space-y-3">
        {category.settings.map((settingKey) => (
          <SettingsSlider
            key={settingKey}
            setting={settingKey as keyof NetworkBackgroundSettings}
          />
        ))}
      </div>
    </SettingsSection>
  );
}
