"use client";

import type { ReactNode } from "react";
import { SettingsSlider } from "./controls/SettingsSlider";
import type { SettingsCategory as SettingsCategoryConfig, SliderConfig } from "./types";

// ============================================================================
// Types
// ============================================================================

interface SettingsSectionProps {
  /** Section title displayed in the header */
  title: string;
  /** Icon displayed next to the title */
  icon: ReactNode;
  /** Content to render within the section */
  children: ReactNode;
}

interface SettingsCategoryProps<K extends string> {
  /** The category: its title, icon and settings */
  category: SettingsCategoryConfig<K>;
  /** Every setting's slider configuration */
  config: Record<K, SliderConfig>;
  /** Every setting's current value */
  values: Record<K, number>;
  /** Saves a setting's new value */
  onCommit: (key: K, value: number) => void;
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
 * @example
 * ```tsx
 * <SettingsSection title="Network" icon={<FaNetworkWired />}>
 *   <SettingsSlider config={...} value={...} onCommit={...} />
 * </SettingsSection>
 * ```
 */
export function SettingsSection({ title, icon, children }: SettingsSectionProps) {
  return (
    <div className="space-y-3">
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
 * A category of settings: a section with a slider for each of its settings, from the
 * configuration rather than listed by hand
 *
 * @example
 * ```tsx
 * <SettingsCategory
 *   category={NETWORK_SETTINGS_CATEGORIES[0]}
 *   config={NETWORK_SETTINGS_CONFIG}
 *   values={networkSettings}
 *   onCommit={(key, value) => updateNetworkSettings({ [key]: value })}
 * />
 * ```
 */
export function SettingsCategory<K extends string>({
  category,
  config,
  values,
  onCommit,
}: SettingsCategoryProps<K>) {
  const { title, icon: Icon, settings } = category;
  return (
    <SettingsSection
      title={title}
      icon={Icon ? <Icon className="w-4 h-4 text-primary/70" /> : null}
    >
      {settings.map((key) => (
        <SettingsSlider
          key={key}
          config={config[key]}
          value={values[key]}
          onCommit={(value) => onCommit(key, value)}
        />
      ))}
    </SettingsSection>
  );
}
