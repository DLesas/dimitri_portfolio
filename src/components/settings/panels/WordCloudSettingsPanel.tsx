"use client";

import { useCallback } from "react";
import { FaCloud } from "react-icons/fa";
import { useSettings, type WordCloudSettings } from "@/contexts/SettingsContext";
import { SettingsCategory } from "../SettingsSection";
import { SettingsPanel } from "../SettingsPanel";
import { WORDCLOUD_SETTINGS_CATEGORIES, WORDCLOUD_SETTINGS_CONFIG } from "../config";

/**
 * WordCloud Settings Panel
 *
 * The word cloud's rotation and text size, by category, from
 * WORDCLOUD_SETTINGS_CATEGORIES
 */
export function WordCloudSettingsPanel() {
  const { wordCloudSettings, updateWordCloudSettings, resetWordCloudSettings } = useSettings();

  const commit = useCallback(
    (key: keyof WordCloudSettings, value: number) => updateWordCloudSettings({ [key]: value }),
    [updateWordCloudSettings]
  );

  return (
    <SettingsPanel
      title="Word Cloud"
      icon={<FaCloud className="w-4 h-4 text-primary/70" />}
      onReset={resetWordCloudSettings}
      resetLabel="Reset all word cloud settings to defaults"
      bodyClassName="space-y-8"
    >
      {WORDCLOUD_SETTINGS_CATEGORIES.map((category) => (
        <SettingsCategory
          key={category.title}
          category={category}
          config={WORDCLOUD_SETTINGS_CONFIG}
          values={wordCloudSettings}
          onCommit={commit}
        />
      ))}
    </SettingsPanel>
  );
}
