/**
 * The Color API Integration Service
 *
 * Integrates with https://www.thecolorapi.com to generate complete theme palettes
 * from a user-selected primary color. Automatically creates harmonious secondary
 * and accent colors, plus generates lightness scales for both light and dark modes.
 *
 * @author Dimitri
 * @version 1.0.0
 */

import { SHADES, hexToRgb, hslToHex, type Shade } from "./color";

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * Color information from The Color API
 */
interface ColorApiResponse {
  hex: {
    value: string;
    clean: string;
  };
  rgb: {
    r: number;
    g: number;
    b: number;
    value: string;
  };
  hsl: {
    h: number;
    s: number;
    l: number;
    value: string;
  };
  name: {
    value: string;
    closest_named_hex: string;
    exact_match_name: boolean;
    distance: number;
  };
  contrast: {
    value: string;
  };
}

/**
 * Color scheme response from The Color API. Its seed is the requested colour, with the
 * same information as an /id request for it.
 */
interface ColorSchemeResponse {
  mode: string;
  count: string;
  colors: ColorApiResponse[];
  seed: ColorApiResponse;
}

/**
 * Generated lightness scale for a color: a hex colour (in capitals) per shade
 */
export type ColorScale = Record<Shade, string>;

/**
 * Complete theme palette for one mode (light or dark)
 */
export interface ThemePalette {
  primary: ColorScale;
  secondary: ColorScale;
  accent: ColorScale;
  background: string;
  foreground: string;
}

/**
 * Complete generated theme with both light and dark modes
 */
export interface GeneratedTheme {
  name: string;
  primaryColorName: string;
  light: ThemePalette;
  dark: ThemePalette;
}

/**
 * Theme generation options
 */
export interface ThemeGenerationOptions {
  /** Primary color as hex (with or without #) */
  primaryColor: string;
  /** Scheme mode for secondary color generation */
  secondaryMode?: "analogic" | "complement" | "triad" | "analogic-complement";
  /** Scheme mode for accent color generation */
  accentMode?: "complement" | "triad" | "quad" | "analogic-complement";
}

// ============================================================================
// Constants & Configuration
// ============================================================================

/**
 * The Color API base URL
 */
const COLOR_API_BASE = "https://www.thecolorapi.com";

/**
 * Default lightness values for generating color scales
 * Based on common design system patterns (Tailwind, Material, etc.)
 */
const LIGHTNESS_SCALE: Record<Shade, number> = {
  50: 95, // Very light
  100: 90, // Light
  200: 80, // Light
  300: 70, // Light-medium
  400: 60, // Medium
  500: 50, // Base (original lightness)
  600: 40, // Medium-dark
  700: 30, // Dark
  800: 20, // Darker
  900: 10, // Very dark
  950: 5, // Darkest
};

/**
 * Dark mode adjustments - slightly different lightness distribution
 * for better contrast in dark themes
 */
const DARK_MODE_LIGHTNESS_SCALE: Record<Shade, number> = {
  50: 5, // Darkest (inverted)
  100: 10, // Very dark
  200: 20, // Darker
  300: 30, // Dark
  400: 40, // Medium-dark
  500: 50, // Base
  600: 60, // Medium
  700: 70, // Light-medium
  800: 80, // Light
  900: 90, // Very light
  950: 95, // Very light (inverted)
};

/**
 * Default scheme modes for color generation
 */
const DEFAULT_MODES = {
  secondary: "triad" as const,
  accent: "complement" as const,
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Clean hex color (remove # if present, ensure uppercase)
 */
function cleanHex(hex: string): string {
  return hex.replace("#", "").toUpperCase();
}

/**
 * A lightness scale for a colour: its hue and saturation at each shade's lightness,
 * worked out locally rather than with API calls
 */
function generateColorScaleLocal(
  baseColor: ColorApiResponse,
  isDarkMode: boolean = false
): ColorScale {
  const scale = isDarkMode ? DARK_MODE_LIGHTNESS_SCALE : LIGHTNESS_SCALE;
  const result: ColorScale = {} as ColorScale;

  // Use the base color's hue and saturation, adjust lightness
  const { h, s } = baseColor.hsl;

  // Each shade as hex in capitals
  for (const shade of SHADES) {
    result[shade] = hslToHex(h, s, scale[shade]).toUpperCase();
  }

  return result;
}

/**
 * Calculate simple RGB distance between two hex colors
 */
function calculateColorDistance(hex1: string, hex2: string): number {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);

  const rDist = rgb1.r - rgb2.r;
  const gDist = rgb1.g - rgb2.g;
  const bDist = rgb1.b - rgb2.b;

  return Math.sqrt(rDist * rDist + gDist * gDist + bDist * bDist);
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Fetch color scheme from The Color API
 */
async function fetchColorScheme(
  primaryColor: string,
  mode: string,
  count: number = 3
): Promise<ColorSchemeResponse> {
  const searchParams = new URLSearchParams({
    hex: cleanHex(primaryColor),
    mode,
    count: count.toString(),
  });

  const url = `${COLOR_API_BASE}/scheme?${searchParams.toString()}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Color scheme API request failed: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

// ============================================================================
// Main Theme Generation Functions
// ============================================================================

/**
 * Generate secondary and accent colors from primary color
 */
async function generateHarmoniousColors(
  primaryColor: string,
  secondaryMode: string,
  accentMode: string
): Promise<{
  primary: ColorApiResponse;
  secondary: ColorApiResponse;
  accent: ColorApiResponse;
}> {
  // Both schemes at once, with more colours than needed for better variety. Each
  // scheme's seed is the primary colour's own information, so no /id request is needed.
  const [secondaryScheme, accentScheme] = await Promise.all([
    fetchColorScheme(primaryColor, secondaryMode, 6),
    fetchColorScheme(primaryColor, accentMode, 6),
  ]);
  const primary = secondaryScheme.seed;

  // Find the most distinct secondary color (not the primary)
  let secondary = secondaryScheme.colors[0];
  let maxDistance = 0;

  for (const color of secondaryScheme.colors) {
    // Skip if it's the same as primary
    if (color.hex.value.toLowerCase() === primary.hex.value.toLowerCase()) {
      continue;
    }

    // Calculate color distance (simple RGB distance)
    const distance = calculateColorDistance(primary.hex.value, color.hex.value);
    if (distance > maxDistance) {
      maxDistance = distance;
      secondary = color;
    }
  }

  // Find the most distinct accent color (not primary or secondary)
  let accent = accentScheme.colors[0];
  maxDistance = 0;

  for (const color of accentScheme.colors) {
    // Skip if it's the same as primary or secondary
    if (
      color.hex.value.toLowerCase() === primary.hex.value.toLowerCase() ||
      color.hex.value.toLowerCase() === secondary.hex.value.toLowerCase()
    ) {
      continue;
    }

    // Calculate combined distance from both primary and secondary
    const distFromPrimary = calculateColorDistance(
      primary.hex.value,
      color.hex.value
    );
    const distFromSecondary = calculateColorDistance(
      secondary.hex.value,
      color.hex.value
    );
    const combinedDistance = distFromPrimary + distFromSecondary;

    if (combinedDistance > maxDistance) {
      maxDistance = combinedDistance;
      accent = color;
    }
  }

  return { primary, secondary, accent };
}

/**
 * Generate complete theme palette for both light and dark modes
 *
 * This is the main function that creates a complete theme from a user-selected primary color.
 * It automatically generates harmonious secondary and accent colors, creates lightness scales
 * for all colors, and produces both light and dark mode variants. It makes one attempt:
 * the caller retries.
 *
 * @param options - Theme generation configuration
 * @returns Complete theme with light and dark mode palettes
 * @throws When a Color API request fails
 *
 * @example
 * ```typescript
 * // Generate theme from user's color selection
 * const theme = await generateThemeFromPrimary({
 *   primaryColor: '#3b82f6', // User selected blue
 *   secondaryMode: 'analogic', // Harmonious secondary
 *   accentMode: 'complement', // Contrasting accent
 * });
 *
 * // Apply to HeroUI CSS variables (both modes at once)
 * applyThemeToCSS(theme);
 * ```
 */
export async function generateThemeFromPrimary(
  options: ThemeGenerationOptions
): Promise<GeneratedTheme> {
  const {
    primaryColor,
    secondaryMode = DEFAULT_MODES.secondary,
    accentMode = DEFAULT_MODES.accent,
  } = options;

  const colors = await generateHarmoniousColors(
    primaryColor,
    secondaryMode,
    accentMode
  );

  return {
    name: `${colors.primary.name.value} Theme`,
    primaryColorName: colors.primary.name.value,
    light: {
      primary: generateColorScaleLocal(colors.primary, false),
      secondary: generateColorScaleLocal(colors.secondary, false),
      accent: generateColorScaleLocal(colors.accent, false),
      background: "#FFFFFF", // White background for light mode
      foreground: "#0F172A", // Dark text for light mode
    },
    dark: {
      primary: generateColorScaleLocal(colors.primary, true),
      secondary: generateColorScaleLocal(colors.secondary, true),
      accent: generateColorScaleLocal(colors.accent, true),
      background: "#0F172A", // Dark background for dark mode
      foreground: "#F8FAFC", // Light text for dark mode
    },
  };
}
