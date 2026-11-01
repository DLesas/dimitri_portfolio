"use client";

import { useCallback } from "react";
import { useSettings, type NetworkBackgroundSettings as Settings } from "@/contexts/SettingsContext";
import { SettingsCategory } from "../SettingsSection";
import { SettingsPanel } from "../SettingsPanel";
import { NETWORK_SETTINGS_CATEGORIES, NETWORK_SETTINGS_CONFIG } from "../config";

/**
 * Network Background Settings Panel
 *
 * Every network background setting, by category, from NETWORK_SETTINGS_CATEGORIES:
 * settings are added, removed or reorganised there rather than here. Reset restores
 * the defaults for the device's performance tier.
 */
export function NetworkBackgroundSettings() {
  const { networkSettings, updateNetworkSettings, resetNetworkSettings } = useSettings();

  const commit = useCallback(
    (key: keyof Settings, value: number) => updateNetworkSettings({ [key]: value }),
    [updateNetworkSettings]
  );

  return (
    <SettingsPanel
      title="Network Background"
      onReset={resetNetworkSettings}
      resetLabel="Reset all network background settings to defaults"
      bodyClassName="space-y-8"
    >
      {NETWORK_SETTINGS_CATEGORIES.map((category) => (
        <SettingsCategory
          key={category.title}
          category={category}
          config={NETWORK_SETTINGS_CONFIG}
          values={networkSettings}
          onCommit={commit}
        />
      ))}
    </SettingsPanel>
  );
}
