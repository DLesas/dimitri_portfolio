"use client";

import { useEffect } from "react";
import { ColorPicker, useColor, type IColor } from "react-color-palette";
import "react-color-palette/dist/css/rcp.css";
import { Spinner, Card } from "@heroui/react";
import { FaPalette } from "react-icons/fa";
import { useThemeColors } from "@/contexts/ThemeColorsContext";
import { SettingsPanel } from "../SettingsPanel";

// ============================================================================
// Component
// ============================================================================

/**
 * Color Settings Panel
 *
 * Main settings panel for theme customization. Allows users to:
 * - Select a primary color using an intuitive color picker
 * - See real-time theme updates (with debouncing)
 * - Reset to the default theme
 * - View loading states during theme generation
 */
export function ColorSettingsPanel() {
  // ========================================
  // Hooks
  // ========================================

  const {
    primaryColor,
    setPrimaryColor,
    isGeneratingTheme,
    themeGenerationError,
    resetTheme,
    colors, // Get the current theme colors for preview
  } = useThemeColors();

  // Initialize color picker with current primary color
  const [color, setColor] = useColor(primaryColor);

  // Update color picker when primary color changes (e.g., on reset)
  useEffect(() => {
    // Manually update the color object when primaryColor changes
    // This avoids calling useColor inside useEffect
    setColor((prevColor: IColor) => ({
      ...prevColor,
      hex: primaryColor,
      // The ColorPicker will handle updating the other color formats (rgb, hsv)
    }));
  }, [primaryColor, setColor]);

  // ========================================
  // Handlers
  // ========================================

  /**
   * Handle color changes from the picker
   * Updates both the local color state and triggers theme generation
   */
  const handleColorChange = (newColor: typeof color) => {
    setColor(newColor);
    setPrimaryColor(newColor.hex);
  };

  /** The preview's rows of swatches */
  const swatchRows = [
    ["Primary", colors.primary],
    ["Secondary", colors.secondary],
    ["Accent", colors.accent],
  ] as const;

  // ========================================
  // Render
  // ========================================

  return (
    <SettingsPanel
      title="Color Settings"
      icon={<FaPalette className="w-4 h-4 text-primary" />}
      onReset={resetTheme}
      resetLabel="Reset to default theme"
      resetDisabled={isGeneratingTheme}
      bodyClassName="space-y-4"
    >
      {/* Color Picker Section */}
      <div className="space-y-3">
        {/* Color Picker */}
        <div className="rounded-lg overflow-hidden border border-divider">
          <ColorPicker
            color={color}
            hideAlpha={true}
            onChange={handleColorChange}
            height={180}
            hideInput={["rgb", "hsv", "hex"]}
          />
        </div>

        {/* Loading State */}
        {isGeneratingTheme && (
          <div className="flex items-center gap-2 text-sm text-foreground/70">
            <Spinner size="sm" color="accent" />
            <span>Generating theme...</span>
          </div>
        )}

        {/* Error State */}
        {themeGenerationError && (
          <Card className="border-danger">
            <Card.Content className="py-3">
              <div className="text-sm text-danger">
                Failed to generate theme. Please try again.
              </div>
            </Card.Content>
          </Card>
        )}

        {/* Color Preview - Show when not loading */}
        {!isGeneratingTheme && (
          <div className="space-y-6">
            {/* Color Preview Grid */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground/80">
                Current Theme Colors
              </div>

              {swatchRows.map(([name, system]) => (
                <div key={name} className="space-y-1">
                  <div className="text-xs text-foreground/60">{name}</div>
                  <div className="grid grid-cols-11 gap-1">
                    {Object.entries(system.shades).map(([shade, { hex }]) => (
                      <div
                        key={shade}
                        className="aspect-square rounded border border-divider/50"
                        style={{ backgroundColor: hex }}
                        title={`${name} ${shade}: ${hex}`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </SettingsPanel>
  );
}
