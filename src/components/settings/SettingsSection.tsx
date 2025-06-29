"use client";

import React, { ReactNode } from "react";
import { SettingsSlider } from "./controls/SettingsSlider";
import type { SettingsCategory as SettingsCategoryType } from "./types";
import type { NetworkBackgroundSettings } from "@/contexts/SettingsContext";

// ============================================================================
// Types
// ============================================================================

interface SettingsSectionProps {
  /** Section title displayed in the header */
  title: string;
  /** Icon component displayed next to the title */
  icon: ReactNode;
  /** Content to render within the section */
  children: ReactNode;
  /** Optional CSS class name */
  className?: string;
}

interface SettingsCategoryProps {
  /** Category configuration object */
  category: SettingsCategoryType;
  /** Optional CSS class name */
  className?: string;
}

// ============================================================================
// Components
// ============================================================================

/**
 * Settings section component for organizing groups of related settings
 *
 * Provides a consistent visual structure for settings groups with:
 * - Icon and title header with bottom border
 * - Padded content area for child components
 * - Consistent spacing and styling
 *
 * This component serves as a visual wrapper that groups related settings
 * together and provides clear section boundaries in the settings interface.
 *
 * @example
 * ```tsx
 * <SettingsSection title="Network" icon={<FaNetworkWired />}>
 *   <SettingsSlider setting="nodeCount" />
 *   <SettingsSlider setting="connectionDistance" />
 * </SettingsSection>
 * ```
 */
export function SettingsSection({
  title,
  icon,
  children,
  className = "",
}: SettingsSectionProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {/* Section Header */}
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground/80 border-b border-divider pb-2">
        {icon}
        <span>{title}</span>
      </div>

      {/* Section Content */}
      <div className="space-y-3 pl-1">{children}</div>
    </div>
  );
}

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
