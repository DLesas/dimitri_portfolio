"use client";

import React from "react";
import { Button } from "@heroui/react";
import { FaUndo } from "react-icons/fa";
import { useSettings } from "@/contexts/SettingsContext";
import { SettingsCategory } from "../controls/SettingsCategory";
import { SETTINGS_CATEGORIES } from "../config";

// ============================================================================
// Component
// ============================================================================

/**
 * Network Background Settings Panel
 *
 * A configuration-driven settings panel that automatically renders all
 * network background settings organized by category. The panel includes
 * a reset button to restore all settings to their default values.
 *
 * Features:
 * - Fully configuration-driven using SETTINGS_CATEGORIES
 * - Automatic rendering of all settings without repetitive code
 * - Reset functionality to restore defaults
 * - Organized by logical setting categories
 *
 * The panel structure is entirely driven by the SETTINGS_CATEGORIES
 * configuration, making it easy to add, remove, or reorganize settings
 * without modifying this component.
 */
export function NetworkBackgroundSettings() {
  // ========================================
  // Context & Handlers
  // ========================================

  const { resetNetworkSettings } = useSettings();

  // ========================================
  // Render
  // ========================================

  return (
    <div className="w-80 p-4 space-y-6">
      {/* Panel Header with Reset Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Network Background</h3>
        <Button
          size="sm"
          variant="flat"
          color="default"
          startContent={<FaUndo className="w-3 h-3" />}
          onPress={resetNetworkSettings}
          aria-label="Reset all network background settings to defaults"
        >
          Reset
        </Button>
      </div>

      {/* Settings Categories */}
      <div className="space-y-6">
        {SETTINGS_CATEGORIES.map((category) => (
          <SettingsCategory key={category.title} category={category} />
        ))}
      </div>
    </div>
  );
}
