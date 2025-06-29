"use client";

import React, { useEffect } from "react";
import { ColorPicker, useColor, type IColor } from "react-color-palette";
import "react-color-palette/css";
import { Button, Spinner, Card, CardBody } from "@heroui/react";
import { FaUndo, FaPalette } from "react-icons/fa";
import { useTheme } from "@/contexts/ThemeContext";
import { useTheme as useNextTheme } from "next-themes";

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

  const { theme: currentThemeMode } = useNextTheme(); // Get light/dark mode from next-themes
  const {
    primaryColor,
    setPrimaryColor,
    isGeneratingTheme,
    themeGenerationError,
    resetTheme,
    colors, // Get the current theme colors for preview
  } = useTheme();

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

  /**
   * Handle theme reset
   * Resets to default color (the hook will update primaryColor)
   */
  const handleReset = () => {
    resetTheme();
  };

  // ========================================
  // Render
  // ========================================

  return (
    <div className="w-80 max-h-[80vh] flex flex-col">
      {/* Panel Header */}
      <div className="flex items-center justify-between p-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <FaPalette className="w-4 h-4 text-primary" />
          <h3 className="text-lg font-bold">Color Settings</h3>
        </div>
        <Button
          size="sm"
          variant="flat"
          color="default"
          startContent={<FaUndo className="w-3 h-3" />}
          onPress={handleReset}
          aria-label="Reset to default theme"
          isDisabled={isGeneratingTheme}
        >
          Reset
        </Button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
              <Spinner size="sm" color="primary" />
              <span>Generating theme...</span>
            </div>
          )}

          {/* Error State */}
          {themeGenerationError && (
            <Card className="border-danger">
              <CardBody className="py-3">
                <div className="text-sm text-danger">
                  Failed to generate theme. Please try again.
                </div>
              </CardBody>
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

                {/* Primary Colors */}
                <div className="space-y-1">
                  <div className="text-xs text-foreground/60">Primary</div>
                  <div className="grid grid-cols-11 gap-1">
                    {Object.entries(colors.primary.shades).map(
                      ([shade, colorFormats]) => (
                        <div
                          key={shade}
                          className="aspect-square rounded border border-divider/50"
                          style={{ backgroundColor: colorFormats.hex }}
                          title={`Primary ${shade}: ${colorFormats.hex}`}
                        />
                      )
                    )}
                  </div>
                </div>

                {/* Secondary Colors */}
                <div className="space-y-1">
                  <div className="text-xs text-foreground/60">Secondary</div>
                  <div className="grid grid-cols-11 gap-1">
                    {Object.entries(colors.secondary.shades).map(
                      ([shade, colorFormats]) => (
                        <div
                          key={shade}
                          className="aspect-square rounded border border-divider/50"
                          style={{ backgroundColor: colorFormats.hex }}
                          title={`Secondary ${shade}: ${colorFormats.hex}`}
                        />
                      )
                    )}
                  </div>
                </div>

                {/* Accent Colors */}
                <div className="space-y-1">
                  <div className="text-xs text-foreground/60">Accent</div>
                  <div className="grid grid-cols-11 gap-1">
                    {Object.entries(colors.accent.shades).map(
                      ([shade, colorFormats]) => (
                        <div
                          key={shade}
                          className="aspect-square rounded border border-divider/50"
                          style={{ backgroundColor: colorFormats.hex }}
                          title={`Accent ${shade}: ${colorFormats.hex}`}
                        />
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Theme Details */}
          {/* <div className="pt-2 space-y-2 text-xs text-foreground/60">
            <div>
              <strong>Secondary:</strong> Triad (distinct)
            </div>
            <div>
              <strong>Accent:</strong> Complement (contrasting)
            </div>
          </div> */}
        </div>
      </div>
    </div>
  );
}
