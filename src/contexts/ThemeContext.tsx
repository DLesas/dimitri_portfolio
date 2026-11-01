"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  ReactNode,
  useEffect,
} from "react";
import {
  generateThemeFromPrimary,
  applyThemeToCSS,
  type GeneratedTheme,
} from "@/lib/colorApi";
import { SHADES, hslToHex, parseHsl, type Shade } from "@/lib/theme/color";
import { STORAGE_KEYS, readJSON, remove, writeJSON } from "@/lib/storage";
import { whenIdle } from "@/lib/idle";

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * A single color value
 */
interface ColorFormats {
  /** Lowercase hex, for Three.js/Canvas (e.g., "#3b82f6") */
  hex: string;
}

/**
 * HeroUI color shade scale (lightness variants)
 * From lightest (50) to darkest (950)
 */
type ColorShades = Record<Shade, ColorFormats>;

/**
 * Color system with shades
 * Used for primary, secondary, and accent colors
 */
interface ColorSystem {
  /** HeroUI color shades (lightness variants 50-950) */
  shades: ColorShades;
}

/**
 * Single color system (base color only)
 * Used for background and foreground (no shade variants in HeroUI)
 */
interface SingleColorSystem {
  /** Single base color */
  base: ColorFormats;
}

/**
 * Complete theme color palette
 */
export interface ThemeColors {
  primary: ColorSystem;
  secondary: ColorSystem;
  accent: ColorSystem;
  background: SingleColorSystem;
  foreground: SingleColorSystem;
}

/**
 * Theme context interface
 */
interface ThemeContextType {
  /** Current theme colors */
  colors: ThemeColors;
  /** Manually trigger theme color extraction */
  updateTheme: () => void;
  /** Whether theme has been initialized with real colors */
  isInitialized: boolean;
  /** Set primary color for theme generation */
  setPrimaryColor: (color: string) => void;
  /** Current primary color being used */
  primaryColor: string;
  /** Whether theme is being generated */
  isGeneratingTheme: boolean;
  /** Error from theme generation */
  themeGenerationError: Error | null;
  /** Reset theme to default */
  resetTheme: () => void;
}

// ============================================================================
// Constants & Configuration
// ============================================================================

/**
 * Fallback color values for server-side rendering and when CSS variables aren't available
 * Based on common design system color scales
 */
const FALLBACK_COLORS = {
  // Primary color shades (blue scale)
  primary: {
    50: "214 100% 97%", // Very light blue
    100: "214 95% 93%", // Light blue
    200: "213 97% 87%", // Light blue
    300: "212 96% 78%", // Light-medium blue
    400: "213 94% 68%", // Medium blue
    500: "217 91% 60%", // Base blue
    600: "221 83% 53%", // Medium-dark blue
    700: "224 76% 48%", // Dark blue
    800: "226 71% 40%", // Darker blue
    900: "224 64% 33%", // Very dark blue
    950: "226 55% 20%", // Darkest blue
  },
  // Secondary color shades (gray scale)
  secondary: {
    50: "220 14.3% 95.9%", // Very light gray
    100: "220 13.0% 91.0%", // Light gray
    200: "220 9.6% 84.3%", // Light gray
    300: "220 8.8% 76.9%", // Light-medium gray
    400: "220 8.6% 64.1%", // Medium gray
    500: "220 8.9% 46.1%", // Base gray
    600: "220 9.2% 30.0%", // Medium-dark gray
    700: "220 9.6% 22.9%", // Dark gray
    800: "220 12.4% 15.1%", // Darker gray
    900: "220 20.6% 7.8%", // Very dark gray
    950: "224 71.4% 4.1%", // Darkest gray
  },
  // Accent color shades (purple scale)
  accent: {
    50: "280 100% 97%", // Very light purple
    100: "280 87% 94%", // Light purple
    200: "280 85% 87%", // Light purple
    300: "280 84% 78%", // Light-medium purple
    400: "280 82% 68%", // Medium purple
    500: "280 100% 70%", // Base purple
    600: "280 85% 60%", // Medium-dark purple
    700: "280 80% 50%", // Dark purple
    800: "280 75% 40%", // Darker purple
    900: "280 70% 30%", // Very dark purple
    950: "280 65% 20%", // Darkest purple
  },
  // Single colors (no shade variants)
  background: "0 0% 100%", // White
  foreground: "224 71.4% 4.1%", // Near black
} as const;

/**
 * HeroUI CSS custom property names
 */
const CSS_VARIABLES = {
  primary: "--heroui-primary",
  secondary: "--heroui-secondary",
  accent: "--heroui-accent",
  background: "--heroui-background",
  foreground: "--heroui-foreground",
} as const;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Creates the color value for a HeroUI HSL string ("220 14.3% 95.9%")
 *
 * @param hslValue - HSL color string in HeroUI format
 * @returns The color as hex (in lower case), or blue if the string doesn't parse
 */
const createColorFormats = (hslValue: string): ColorFormats => {
  const hsl = parseHsl(hslValue);
  if (!hsl) {
    console.warn(`Failed to parse HSL string: ${hslValue}`);
    return { hex: "#3b82f6" }; // Fallback to blue
  }
  return { hex: hslToHex(hsl.h, hsl.s, hsl.l) };
};

/**
 * Gets CSS custom property value from the DOM
 * Returns null if not available (server-side or variable doesn't exist)
 *
 * @param cssVar - CSS custom property name
 * @returns HSL value or null
 */
const getCSSVariable = (cssVar: string): string | null => {
  if (typeof window === "undefined") return null;

  try {
    const style = getComputedStyle(document.documentElement);
    const value = style.getPropertyValue(cssVar).trim();
    return value || null;
  } catch (error) {
    console.warn(`Failed to get CSS variable ${cssVar}:`, error);
    return null;
  }
};

// ============================================================================
// Color System Creation Functions
// ============================================================================

/**
 * Creates color shades from HeroUI CSS variables or fallbacks
 *
 * @param colorName - Color name (primary, secondary, accent)
 * @param forceFallback - Force use of fallback colors (for SSR)
 * @returns Object with color shades (50-950)
 */
const createColorShades = (
  colorName: "primary" | "secondary" | "accent",
  forceFallback: boolean = false
): ColorShades => {
  const fallbackShades = FALLBACK_COLORS[colorName];
  const shades = {} as ColorShades;

  SHADES.forEach((shade) => {
    let hslValue = fallbackShades[shade] as string;

    // Try to get real CSS variable value if not forcing fallback
    if (!forceFallback) {
      const cssValue = getCSSVariable(`${CSS_VARIABLES[colorName]}-${shade}`);
      if (cssValue) {
        hslValue = cssValue;
      }
    }

    shades[shade] = createColorFormats(hslValue);
  });

  return shades;
};

/**
 * Creates a single color value from CSS variable or fallback
 *
 * @param colorName - Color name
 * @param fallbackValue - Fallback HSL value
 * @param forceFallback - Force use of fallback
 * @returns HSL color string
 */
const createSingleColor = (
  colorName: keyof typeof CSS_VARIABLES,
  fallbackValue: string,
  forceFallback: boolean = false
): string => {
  if (forceFallback) {
    return fallbackValue;
  }

  const cssValue = getCSSVariable(CSS_VARIABLES[colorName]);
  return cssValue || fallbackValue;
};

/**
 * Creates color system with shades
 * Used for primary, secondary, and accent colors
 *
 * @param colorName - Color name
 * @param forceFallback - Force use of fallback colors
 * @returns Color system
 */
const createColorSystem = (
  colorName: "primary" | "secondary" | "accent",
  forceFallback: boolean = false
): ColorSystem => {
  return { shades: createColorShades(colorName, forceFallback) };
};

/**
 * Creates single color system (base only)
 * Used for background and foreground
 *
 * @param colorName - Color name
 * @param forceFallback - Force use of fallback colors
 * @returns Single color system
 */
const createSingleColorSystem = (
  colorName: "background" | "foreground",
  forceFallback: boolean = false
): SingleColorSystem => {
  const baseHsl = createSingleColor(
    colorName,
    FALLBACK_COLORS[colorName],
    forceFallback
  );
  return { base: createColorFormats(baseHsl) };
};

/**
 * Extracts complete theme colors from HeroUI CSS variables
 * Server-safe: uses fallbacks during SSR, real colors on client
 *
 * @param forceFallback - Force use of fallback colors (for SSR consistency)
 * @returns Complete theme color palette
 */
const extractThemeColors = (forceFallback: boolean = false): ThemeColors => {
  return {
    primary: createColorSystem("primary", forceFallback),
    secondary: createColorSystem("secondary", forceFallback),
    accent: createColorSystem("accent", forceFallback),
    background: createSingleColorSystem("background", forceFallback),
    foreground: createSingleColorSystem("foreground", forceFallback),
  };
};

// ============================================================================
// Context Implementation
// ============================================================================

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const DEFAULT_PRIMARY_COLOR = "#3b82f6";

/**
 * Read the user's saved custom theme from localStorage
 *
 * @returns The saved primary color and generated theme, or null if none/unavailable
 */
const readSavedTheme = () =>
  readJSON<{ primaryColor: string; theme: GeneratedTheme }>(
    STORAGE_KEYS.customTheme
  );

/**
 * Theme context provider component
 *
 * Provides HeroUI theme colors as hex with server-safe hydration.
 * Colors are extracted from CSS custom properties and converted to hex.
 *
 * Features:
 * - Server-safe: Uses fallback colors during SSR to prevent hydration mismatches
 * - Manual updates: Call updateTheme() when theme changes
 * - Complete color systems: Shades (50-950) for primary, secondary and accent
 * - Custom theme generation from primary color
 *
 * @param children - React children
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  // Start with fallback colors for server-safe hydration
  const [colors, setColors] = useState<ThemeColors>(() => {
    return extractThemeColors(true); // Force fallbacks for SSR consistency
  });

  const [isInitialized, setIsInitialized] = useState(false);
  const extractionRequestedRef = useRef(false);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Theme generation state (the saved color is only rendered client-side, inside the color picker)
  const [primaryColor, setPrimaryColorState] = useState(
    () => readSavedTheme()?.primaryColor ?? DEFAULT_PRIMARY_COLOR
  );
  const [isGeneratingTheme, setIsGeneratingTheme] = useState(false);
  const [themeGenerationError, setThemeGenerationError] =
    useState<Error | null>(null);
  const generationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Extract theme colors from the CSS variables. Never throws: a missing or unparseable
   * variable falls back to its default colour.
   */
  const runExtraction = useCallback((immediate: boolean = false) => {
    const extractThemeColorsIdle = () => {
      const newColors = extractThemeColors(false); // Extract real colors
      setColors(newColors);
      setIsInitialized(true);

      // Log extraction results in development
      if (process.env.NODE_ENV === "development") {
        console.log("Theme colors extracted:", {
          primaryBase: newColors.primary.shades[500].hex,
          backgroundBase: newColors.background.base.hex,
          foregroundBase: newColors.foreground.base.hex,
          immediate,
        });
      }
    };

    if (immediate) {
      // For manual updates - run immediately
      extractThemeColorsIdle();
    } else {
      // For automatic extraction - once idle (allowing more time for theme extraction)
      whenIdle(extractThemeColorsIdle, { timeout: 5000, fallbackMs: 50 });
    }
  }, []);

  /**
   * Manually trigger theme color extraction
   * Call this when the theme changes (e.g., dark/light mode switch)
   * Includes a delay to allow CSS custom properties to propagate
   */
  const updateTheme = useCallback(() => {
    // Clear any existing timeout to prevent multiple extractions
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    // Add delay to allow CSS custom properties to propagate after theme change
    updateTimeoutRef.current = setTimeout(() => {
      runExtraction(true); // Run after CSS has updated
      updateTimeoutRef.current = null;
    }, 0); // Next task, so the new CSS custom properties have applied
  }, [runExtraction]);

  // Apply the saved theme on mount
  useEffect(() => {
    const savedTheme = readSavedTheme();
    if (savedTheme) {
      // Apply the saved theme (now applies both light and dark modes)
      applyThemeToCSS(savedTheme.theme);
      // Update theme extraction after applying CSS variables
      setTimeout(() => updateTheme(), 100);
    }
  }, [updateTheme]);

  /**
   * Set primary color and generate theme after debounce
   */
  const setPrimaryColor = useCallback(
    (color: string) => {
      setPrimaryColorState(color);
      setThemeGenerationError(null);

      // Clear any existing timeout
      if (generationTimeoutRef.current) {
        clearTimeout(generationTimeoutRef.current);
      }

      // Don't show loading immediately - wait for debounce
      generationTimeoutRef.current = setTimeout(async () => {
        setIsGeneratingTheme(true);

        try {
          const theme = await generateThemeFromPrimary({
            primaryColor: color,
            secondaryMode: "triad",
            accentMode: "complement",
          });

          // Save to localStorage
          writeJSON(STORAGE_KEYS.customTheme, {
            primaryColor: color,
            theme,
            generatedAt: Date.now(),
          });

          // Apply theme to CSS variables (now applies both light and dark modes)
          applyThemeToCSS(theme);

          // Update theme extraction after applying CSS variables
          setTimeout(() => updateTheme(), 100);
        } catch (error) {
          console.error("Failed to generate theme:", error);
          setThemeGenerationError(error as Error);
        } finally {
          setIsGeneratingTheme(false);
        }
      }, 350); // 350ms debounce
    },
    [updateTheme]
  );

  /**
   * Reset theme to default
   */
  const resetTheme = useCallback(() => {
    remove(STORAGE_KEYS.customTheme);

    // Clear any existing timeout
    if (generationTimeoutRef.current) {
      clearTimeout(generationTimeoutRef.current);
    }

    // Set state and trigger theme generation
    setPrimaryColorState(DEFAULT_PRIMARY_COLOR);
    setThemeGenerationError(null);

    // Generate default theme
    generationTimeoutRef.current = setTimeout(async () => {
      setIsGeneratingTheme(true);

      try {
        const theme = await generateThemeFromPrimary({
          primaryColor: DEFAULT_PRIMARY_COLOR,
          secondaryMode: "triad",
          accentMode: "complement",
        });

        // Apply theme to CSS variables (now applies both light and dark modes)
        applyThemeToCSS(theme);

        // Update theme extraction after applying CSS variables
        setTimeout(() => updateTheme(), 100);
      } catch (error) {
        console.error("Failed to generate default theme:", error);
        setThemeGenerationError(error as Error);
      } finally {
        setIsGeneratingTheme(false);
      }
    }, 100); // Small delay for reset
  }, [updateTheme]);

  // Update theme when mode changes (light/dark)
  useEffect(() => {
    const handleThemeChange = () => {
      const savedTheme = readSavedTheme();
      if (savedTheme) {
        try {
          // Apply theme (now applies both light and dark modes automatically)
          applyThemeToCSS(savedTheme.theme);
          setTimeout(() => updateTheme(), 100);
        } catch (error) {
          console.error("Failed to apply theme for mode change:", error);
        }
      }
    };

    // Watch for class changes on the document element
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "class") {
          handleThemeChange();
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, [updateTheme]);

  /**
   * Automatically extract real theme colors on component mount during idle time
   * This ensures theme colors are available without blocking initial render
   */
  React.useEffect(() => {
    // Only request the initial extraction once (effects can run twice in Strict Mode)
    if (!extractionRequestedRef.current) {
      extractionRequestedRef.current = true;
      runExtraction(false);
    }

    // Cleanup function to clear any pending timeout on unmount
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
        updateTimeoutRef.current = null;
      }
      if (generationTimeoutRef.current) {
        clearTimeout(generationTimeoutRef.current);
        generationTimeoutRef.current = null;
      }
    };
  }, [runExtraction]);

  const contextValue: ThemeContextType = {
    colors,
    updateTheme,
    isInitialized,
    setPrimaryColor,
    primaryColor,
    isGeneratingTheme,
    themeGenerationError,
    resetTheme,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to access theme context
 *
 * @returns Theme context with colors, updateTheme function, and initialization status
 * @throws Error if used outside ThemeProvider
 *
 * @example
 * ```tsx
 * const { colors, updateTheme, isInitialized } = useTheme();
 *
 * // Use color shades
 * const nodeColor = colors.primary.shades[600].hex;
 * const lightBg = colors.primary.shades[50].hex;
 *
 * // Use background/foreground
 * const bgColor = colors.background.base.hex;
 * const textColor = colors.foreground.base.hex;
 *
 * // Update theme when it changes
 * const handleThemeChange = () => updateTheme();
 * ```
 */
export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error(
      "useTheme must be used within a ThemeProvider. " +
        "Make sure to wrap your app with <ThemeProvider>."
    );
  }

  return context;
}
