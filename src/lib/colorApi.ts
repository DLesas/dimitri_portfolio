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

import { retryWithBackoff, RetryPresets } from "../utils/retry";

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
 * Color scheme response from The Color API
 */
interface ColorSchemeResponse {
  mode: string;
  count: string;
  colors: ColorApiResponse[];
  seed: ColorApiResponse;
}

/**
 * Generated lightness scale for a color
 */
interface ColorScale {
  50: string; // Very light
  100: string; // Light
  200: string; // Light
  300: string; // Light-medium
  400: string; // Medium
  500: string; // Base/default
  600: string; // Medium-dark
  700: string; // Dark
  800: string; // Darker
  900: string; // Very dark
  950: string; // Darkest
}

/**
 * Complete theme palette for light mode
 */
interface LightThemePalette {
  primary: ColorScale;
  secondary: ColorScale;
  accent: ColorScale;
  background: string;
  foreground: string;
}

/**
 * Complete theme palette for dark mode
 */
interface DarkThemePalette {
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
  light: LightThemePalette;
  dark: DarkThemePalette;
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
  /** Custom theme name (defaults to primary color name) */
  customName?: string;
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
const LIGHTNESS_SCALE = {
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
} as const;

/**
 * Dark mode adjustments - slightly different lightness distribution
 * for better contrast in dark themes
 */
const DARK_MODE_LIGHTNESS_SCALE = {
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
} as const;

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
 * Ensure hex color has # prefix
 */
function _ensureHexPrefix(hex: string): string {
  return hex.startsWith("#") ? hex : `#${hex}`;
}

/**
 * Convert HSL values to CSS HSL string format
 */
function _hslToCssString(h: number, s: number, l: number): string {
  return `${h} ${s}% ${l}%`;
}

/**
 * Generate a color scale by adjusting lightness of a base color
 * Now calculates shades locally instead of making API calls
 */
function generateColorScaleLocal(
  baseColor: ColorApiResponse,
  isDarkMode: boolean = false
): ColorScale {
  const scale = isDarkMode ? DARK_MODE_LIGHTNESS_SCALE : LIGHTNESS_SCALE;
  const result: ColorScale = {} as ColorScale;

  // Use the base color's hue and saturation, adjust lightness
  const { h, s } = baseColor.hsl;

  // Generate each shade locally (no API calls needed)
  Object.entries(scale).forEach(([shade, lightness]) => {
    result[shade as unknown as keyof ColorScale] = hslToHex(h, s, lightness);
  });

  return result;
}

/**
 * Manual HSL to Hex conversion as fallback
 */
function hslToHex(h: number, s: number, l: number): string {
  const hNorm = h / 360;
  const sNorm = s / 100;
  const lNorm = l / 100;

  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((hNorm * 6) % 2) - 1));
  const m = lNorm - c / 2;

  let r = 0,
    g = 0,
    b = 0;

  if (0 <= hNorm && hNorm < 1 / 6) {
    r = c;
    g = x;
    b = 0;
  } else if (1 / 6 <= hNorm && hNorm < 2 / 6) {
    r = x;
    g = c;
    b = 0;
  } else if (2 / 6 <= hNorm && hNorm < 3 / 6) {
    r = 0;
    g = c;
    b = x;
  } else if (3 / 6 <= hNorm && hNorm < 4 / 6) {
    r = 0;
    g = x;
    b = c;
  } else if (4 / 6 <= hNorm && hNorm < 5 / 6) {
    r = x;
    g = 0;
    b = c;
  } else if (5 / 6 <= hNorm && hNorm < 1) {
    r = c;
    g = 0;
    b = x;
  }

  const rHex = Math.round((r + m) * 255)
    .toString(16)
    .padStart(2, "0");
  const gHex = Math.round((g + m) * 255)
    .toString(16)
    .padStart(2, "0");
  const bHex = Math.round((b + m) * 255)
    .toString(16)
    .padStart(2, "0");

  return `#${rHex}${gHex}${bHex}`.toUpperCase();
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Fetch color information from The Color API
 */
async function fetchColorInfo(params: {
  hex?: string;
  rgb?: string;
  hsl?: string;
  cmyk?: string;
}): Promise<ColorApiResponse> {
  const searchParams = new URLSearchParams();

  // Add provided parameters
  if (params.hex) searchParams.set("hex", cleanHex(params.hex));
  if (params.rgb) searchParams.set("rgb", params.rgb);
  if (params.hsl) searchParams.set("hsl", params.hsl);
  if (params.cmyk) searchParams.set("cmyk", params.cmyk);

  const url = `${COLOR_API_BASE}/id?${searchParams.toString()}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Color API request failed: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

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
  secondaryMode: string = DEFAULT_MODES.secondary,
  accentMode: string = DEFAULT_MODES.accent
): Promise<{
  primary: ColorApiResponse;
  secondary: ColorApiResponse;
  accent: ColorApiResponse;
}> {
  // First get primary color info
  const primary = await fetchColorInfo({ hex: primaryColor });

  // Then fetch both color schemes in parallel
  // Request more colors for better variety
  const [secondaryScheme, accentScheme] = await Promise.all([
    // Use the provided secondaryMode (now defaults to triad)
    fetchColorScheme(primaryColor, secondaryMode, 6),
    // Keep complement for accent for high contrast
    fetchColorScheme(primaryColor, accentMode, 6),
  ]);

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

/**
 * Convert hex to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleanedHex = hex.replace("#", "");
  const r = parseInt(cleanedHex.substr(0, 2), 16);
  const g = parseInt(cleanedHex.substr(2, 2), 16);
  const b = parseInt(cleanedHex.substr(4, 2), 16);
  return { r, g, b };
}

/**
 * Generate complete theme palette for both light and dark modes
 *
 * This is the main function that creates a complete theme from a user-selected primary color.
 * It automatically generates harmonious secondary and accent colors, creates lightness scales
 * for all colors, and produces both light and dark mode variants.
 *
 * @param options - Theme generation configuration
 * @returns Complete theme with light and dark mode palettes
 *
 * @example
 * ```typescript
 * // Generate theme from user's color selection
 * const theme = await generateThemeFromPrimary({
 *   primaryColor: '#3b82f6', // User selected blue
 *   secondaryMode: 'analogic', // Harmonious secondary
 *   accentMode: 'complement', // Contrasting accent
 *   customName: 'Ocean Blue'
 * });
 *
 * // Apply to HeroUI CSS variables
 * applyThemeToCSS(theme.light); // For light mode
 * applyThemeToCSS(theme.dark);  // For dark mode
 * ```
 */
export async function generateThemeFromPrimary(
  options: ThemeGenerationOptions
): Promise<GeneratedTheme> {
  const {
    primaryColor,
    secondaryMode = DEFAULT_MODES.secondary,
    accentMode = DEFAULT_MODES.accent,
    customName,
  } = options;

  // Use retry utility for robust API calls
  const result = await retryWithBackoff(
    async () => {
      // Generate harmonious colors (only uses API for color schemes)
      const colors = await generateHarmoniousColors(
        primaryColor,
        secondaryMode,
        accentMode
      );

      // Generate all color scales locally (no API calls needed)
      const primaryScaleLight = generateColorScaleLocal(colors.primary, false);
      const secondaryScaleLight = generateColorScaleLocal(
        colors.secondary,
        false
      );
      const accentScaleLight = generateColorScaleLocal(colors.accent, false);
      const primaryScaleDark = generateColorScaleLocal(colors.primary, true);
      const secondaryScaleDark = generateColorScaleLocal(
        colors.secondary,
        true
      );
      const accentScaleDark = generateColorScaleLocal(colors.accent, true);

      // Create complete theme
      const theme: GeneratedTheme = {
        name: customName || `${colors.primary.name.value} Theme`,
        primaryColorName: colors.primary.name.value,
        light: {
          primary: primaryScaleLight,
          secondary: secondaryScaleLight,
          accent: accentScaleLight,
          background: "#FFFFFF", // White background for light mode
          foreground: "#0F172A", // Dark text for light mode
        },
        dark: {
          primary: primaryScaleDark,
          secondary: secondaryScaleDark,
          accent: accentScaleDark,
          background: "#0F172A", // Dark background for dark mode
          foreground: "#F8FAFC", // Light text for dark mode
        },
      };

      return theme;
    },
    {
      ...RetryPresets.standard,
      retryDelay: 1000, // 1 second between retries for API calls
      maxRetries: 3,
      onRetry: (error, attempt, delay) => {
        console.log(
          `Retrying theme generation in ${delay}ms (attempt ${attempt + 1}/3):`,
          error.message
        );
      },
      onSuccess: (theme, totalAttempts) => {
        console.log(
          `Theme "${theme.name}" generated successfully in ${totalAttempts} attempt(s)`
        );
      },
      onMaxRetriesReached: (error, totalAttempts) => {
        console.error(
          `Theme generation failed after ${totalAttempts} attempts:`,
          error
        );
      },
    }
  );

  if (!result.success) {
    throw new Error(`Failed to generate theme: ${result.error?.message}`);
  }

  return result.data!;
}

/**
 * Convert theme palette to HeroUI CSS variable format
 *
 * This function converts the generated theme palette into the HSL format
 * expected by HeroUI CSS custom properties.
 *
 * @param palette - Light or dark theme palette
 * @returns Object with HeroUI-compatible CSS variable values
 *
 * @example
 * ```typescript
 * const cssVars = convertThemeToHeroUIFormat(theme.light);
 * // Apply to CSS
 * document.documentElement.style.setProperty('--heroui-primary-50', cssVars.primary[50]);
 * ```
 */
export function convertThemeToHeroUIFormat(
  palette: LightThemePalette | DarkThemePalette
): {
  primary: Record<keyof ColorScale, string>;
  secondary: Record<keyof ColorScale, string>;
  accent: Record<keyof ColorScale, string>;
  background: string;
  foreground: string;
} {
  const convertScale = (scale: ColorScale) => {
    const result: Record<keyof ColorScale, string> = {} as Record<
      keyof ColorScale,
      string
    >;

    for (const [shade, hex] of Object.entries(scale)) {
      // Convert hex to HSL format for HeroUI
      result[shade as unknown as keyof ColorScale] = hexToHslString(hex);
    }

    return result;
  };

  return {
    primary: convertScale(palette.primary),
    secondary: convertScale(palette.secondary),
    accent: convertScale(palette.accent),
    background: hexToHslString(palette.background),
    foreground: hexToHslString(palette.foreground),
  };
}

/**
 * Apply theme to CSS variables for HeroUI
 *
 * This function takes a generated theme and applies it to the document root
 * as CSS custom properties in the format expected by HeroUI.
 * Applies both light and dark mode variables simultaneously.
 *
 * @param theme - The generated theme object
 */
export function applyThemeToCSS(theme: GeneratedTheme): void {
  const root = document.documentElement;

  // ------------------------------
  // Light mode ( :root )
  // ------------------------------
  const lightVars = convertThemeToHeroUIFormat(theme.light);

  Object.entries(lightVars.primary).forEach(([shade, hsl]) => {
    root.style.setProperty(`--heroui-primary-${shade}`, hsl);
    root.style.setProperty(`--primary-${shade}`, hsl);
  });
  Object.entries(lightVars.secondary).forEach(([shade, hsl]) => {
    root.style.setProperty(`--heroui-secondary-${shade}`, hsl);
    root.style.setProperty(`--secondary-${shade}`, hsl);
  });
  Object.entries(lightVars.accent).forEach(([shade, hsl]) => {
    root.style.setProperty(`--heroui-accent-${shade}`, hsl);
    root.style.setProperty(`--accent-${shade}`, hsl);
  });
  root.style.setProperty("--heroui-primary", lightVars.primary[500]);
  root.style.setProperty("--heroui-secondary", lightVars.secondary[500]);
  root.style.setProperty("--heroui-accent", lightVars.accent[500]);
  root.style.setProperty("--primary", lightVars.primary[500]);
  root.style.setProperty("--secondary", lightVars.secondary[500]);
  root.style.setProperty("--accent", lightVars.accent[500]);

  // ------------------------------
  // Dark mode ( .dark class )
  // ------------------------------
  const darkVars = convertThemeToHeroUIFormat(theme.dark);

  // Build CSS string for dark variables
  let css = `.dark{`;
  Object.entries(darkVars.primary).forEach(([shade, hsl]) => {
    css += `--heroui-primary-${shade}:${hsl};--primary-${shade}:${hsl};`;
  });
  Object.entries(darkVars.secondary).forEach(([shade, hsl]) => {
    css += `--heroui-secondary-${shade}:${hsl};--secondary-${shade}:${hsl};`;
  });
  Object.entries(darkVars.accent).forEach(([shade, hsl]) => {
    css += `--heroui-accent-${shade}:${hsl};--accent-${shade}:${hsl};`;
  });
  css += `--heroui-primary:${darkVars.primary[500]};--heroui-secondary:${darkVars.secondary[500]};--heroui-accent:${darkVars.accent[500]};--primary:${darkVars.primary[500]};--secondary:${darkVars.secondary[500]};--accent:${darkVars.accent[500]};}`;

  // Inject or replace style tag
  let styleTag = document.getElementById(
    "dynamic-dark-theme"
  ) as HTMLStyleElement | null;
  if (!styleTag) {
    styleTag = document.createElement("style");
    styleTag.id = "dynamic-dark-theme";
    document.head.appendChild(styleTag);
  }
  styleTag.textContent = css;

  // NOTE: We do NOT modify background or foreground CSS variables
  // Those remain controlled by the existing theme system
}

/**
 * Simple hex to HSL conversion for HeroUI format
 * This is a basic implementation - for production, consider using The Color API
 */
function hexToHslString(hex: string): string {
  // Remove # if present
  const cleanedHex = hex.replace("#", "");

  // Convert to RGB
  const r = parseInt(cleanedHex.substr(0, 2), 16) / 255;
  const g = parseInt(cleanedHex.substr(2, 2), 16) / 255;
  const b = parseInt(cleanedHex.substr(4, 2), 16) / 255;

  // Convert RGB to HSL
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0,
    s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  // Convert to degrees and percentages
  const hDeg = Math.round(h * 360);
  const sPercent = Math.round(s * 100);
  const lPercent = Math.round(l * 100);

  return `${hDeg} ${sPercent}% ${lPercent}%`;
}

// ============================================================================
// Preset Theme Generators
// ============================================================================

/**
 * Generate popular theme presets
 */
export const ThemePresets = {
  /**
   * Generate a blue-based professional theme
   */
  professional: () =>
    generateThemeFromPrimary({
      primaryColor: "#3b82f6",
      secondaryMode: "analogic",
      accentMode: "complement",
      customName: "Professional Blue",
    }),

  /**
   * Generate a purple-based creative theme
   */
  creative: () =>
    generateThemeFromPrimary({
      primaryColor: "#8b5cf6",
      secondaryMode: "analogic-complement",
      accentMode: "triad",
      customName: "Creative Purple",
    }),

  /**
   * Generate a green-based nature theme
   */
  nature: () =>
    generateThemeFromPrimary({
      primaryColor: "#10b981",
      secondaryMode: "analogic",
      accentMode: "complement",
      customName: "Nature Green",
    }),

  /**
   * Generate a warm orange-based theme
   */
  warm: () =>
    generateThemeFromPrimary({
      primaryColor: "#f59e0b",
      secondaryMode: "analogic",
      accentMode: "complement",
      customName: "Warm Sunset",
    }),
} as const;
