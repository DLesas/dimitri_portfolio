"use client";

import React, { ReactNode } from "react";

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

// ============================================================================
// Component
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
      <div className="flex items-center gap-2 text-sm font-medium text-foreground/80 border-b border-divider pb-2">
        {icon}
        <span>{title}</span>
      </div>

      {/* Section Content */}
      <div className="space-y-3 pl-1">{children}</div>
    </div>
  );
}
