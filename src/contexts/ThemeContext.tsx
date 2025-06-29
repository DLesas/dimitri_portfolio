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
import { retryWithBackoff, RetryPresets } from "@/utils/retry";
import {
  generateThemeFromPrimary,
  applyThemeToCSS,
  type GeneratedTheme,
} from "@/lib/colorApi";

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * Color formats for a single color value
 * Provides the same color in multiple formats for different use cases
 */
interface ColorFormats {
  /** Hex format for Three.js/Canvas (e.g., "#3b82f6") */
  hex: string;
  /** HSL format for CSS (e.g., "hsl(220 14.3% 95.9%)") */
  hsl: string;
  /** RGBA format with opacity (e.g., "rgba(59, 130, 246, 0.5)") */
  rgba: string;
  /** HSLA format for CSS with alpha (e.g., "hsl(220 14.3% 95.9% / 0.5)") */
  hsla: string;
}

/**
 * HeroUI color shade scale (lightness variants)
 * From lightest (50) to darkest (950)
 */
interface ColorShades {
  50: ColorFormats; // Very light
  100: ColorFormats; // Light
  200: ColorFormats; // Light
  300: ColorFormats; // Light-medium
  400: ColorFormats; // Medium
  500: ColorFormats; // Base/default
  600: ColorFormats; // Medium-dark
  700: ColorFormats; // Dark
  800: ColorFormats; // Darker
  900: ColorFormats; // Very dark
  950: ColorFormats; // Darkest
}

/**
 * Opacity variants of a single color
 * From 10% to 90% opacity
 */
interface OpacityVariants {
  10: ColorFormats; // 10% opacity
  20: ColorFormats; // 20% opacity
  30: ColorFormats; // 30% opacity
  40: ColorFormats; // 40% opacity
  50: ColorFormats; // 50% opacity
  60: ColorFormats; // 60% opacity
  70: ColorFormats; // 70% opacity
  80: ColorFormats; // 80% opacity
  90: ColorFormats; // 90% opacity
}

/**
 * Complete color system with shades and opacity variants
 * Used for primary, secondary, and accent colors
 */
interface ColorSystem {
  /** HeroUI color shades (lightness variants 50-950) */
  shades: ColorShades;
  /** Opacity variants (10-90%) of the base shade (500) */
  opacity: OpacityVariants;
}

/**
 * Simple color system with base color and opacity variants
 * Used for foreground color (no shade variants in HeroUI)
 */
interface SimpleColorSystem {
  /** Single base color */
  base: ColorFormats;
  /** Opacity variants (10-90%) of the base color */
  opacity: OpacityVariants;
}

/**
 * Background color system (base color only)
 * Background doesn't have opacity variants in HeroUI
 */
interface BackgroundColorSystem {
  /** Single base color */
  base: ColorFormats;
}

/**
 * Complete theme color palette
 */
interface ThemeColors {
  primary: ColorSystem;
  secondary: ColorSystem;
  accent: ColorSystem;
  background: BackgroundColorSystem;
  foreground: SimpleColorSystem;
}

/**
 * Theme context interface
 */
interface ThemeContextType {
  /** Current theme colors in multiple formats */
  colors: ThemeColors;
  /** Manually trigger theme color extraction */
  updateTheme: () => void;
  /** Whether theme has been initialized with real colors */
  isInitialized: boolean;
  /** Whether theme extraction failed */
  hasExtractionFailed: boolean;
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

/**
 * Color shade keys for iteration
 */
const SHADE_KEYS = [
  50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950,
] as const;

/**
 * Opacity levels for iteration
 */
const OPACITY_LEVELS = [10, 20, 30, 40, 50, 60, 70, 80, 90] as const;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Converts HSL color string to hex format
 * Handles HeroUI's HSL format: "220 14.3% 95.9%"
 *
 * @param hslString - HSL color string in HeroUI format
 * @returns Hex color string (e.g., "#3b82f6")
 */
const hslToHex = (hslString: string): string => {
  // Parse HSL string to extract H, S, L values
  const match = hslString.match(
    /(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%/
  );

  if (!match) {
    console.warn(`Failed to parse HSL string: ${hslString}`);
    return "#3b82f6"; // Fallback to blue
  }

  const h = parseFloat(match[1]);
  const s = parseFloat(match[2]) / 100;
  const l = parseFloat(match[3]) / 100;

  // Convert HSL to RGB using standard algorithm
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r: number, g: number, b: number;

  // Determine RGB values based on hue
  if (h >= 0 && h < 60) {
    [r, g, b] = [c, x, 0];
  } else if (h >= 60 && h < 120) {
    [r, g, b] = [x, c, 0];
  } else if (h >= 120 && h < 180) {
    [r, g, b] = [0, c, x];
  } else if (h >= 180 && h < 240) {
    [r, g, b] = [0, x, c];
  } else if (h >= 240 && h < 300) {
    [r, g, b] = [x, 0, c];
  } else {
    [r, g, b] = [c, 0, x];
  }

  // Convert to 0-255 range and format as hex
  const red = Math.round((r + m) * 255);
  const green = Math.round((g + m) * 255);
  const blue = Math.round((b + m) * 255);

  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
};

/**
 * Converts HSL to RGBA format
 *
 * @param hslString - HSL color string
 * @param opacity - Opacity value (0-1)
 * @returns RGBA color string
 */
const hslToRgba = (hslString: string, opacity: number = 1): string => {
  const hex = hslToHex(hslString);
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

/**
 * Creates all color formats from an HSL value
 *
 * @param hslValue - HSL color string
 * @param opacity - Opacity value (0-1)
 * @returns Object with all color formats
 */
const createColorFormats = (
  hslValue: string,
  opacity: number = 1
): ColorFormats => {
  const hex = hslToHex(hslValue);
  const hsl = `hsl(${hslValue})`;
  const hsla = `hsl(${hslValue} / ${opacity})`;
  const rgba = hslToRgba(hslValue, opacity);

  return { hex, hsl, rgba, hsla };
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
 * Creates opacity variants for a given color
 *
 * @param hslValue - Base HSL color string
 * @returns Object with opacity variants (10-90%)
 */
const createOpacityVariants = (hslValue: string): OpacityVariants => {
  const variants = {} as OpacityVariants;

  OPACITY_LEVELS.forEach((level) => {
    variants[level] = createColorFormats(hslValue, level / 100);
  });

  return variants;
};

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

  SHADE_KEYS.forEach((shade) => {
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
 * Creates complete color system with shades and opacity variants
 * Used for primary, secondary, and accent colors
 *
 * @param colorName - Color name
 * @param forceFallback - Force use of fallback colors
 * @returns Complete color system
 */
const createColorSystem = (
  colorName: "primary" | "secondary" | "accent",
  forceFallback: boolean = false
): ColorSystem => {
  const shades = createColorShades(colorName, forceFallback);

  // Use the 500 shade as base for opacity variants
  const baseShade = shades[500];
  const baseHsl = baseShade.hsl.replace("hsl(", "").replace(")", "");
  const opacity = createOpacityVariants(baseHsl);

  return { shades, opacity };
};

/**
 * Creates simple color system with base color and opacity variants
 * Used for foreground color
 *
 * @param forceFallback - Force use of fallback colors
 * @returns Simple color system
 */
const createSimpleColorSystem = (
  forceFallback: boolean = false
): SimpleColorSystem => {
  const baseHsl = createSingleColor(
    "foreground",
    FALLBACK_COLORS.foreground,
    forceFallback
  );
  const base = createColorFormats(baseHsl);
  const opacity = createOpacityVariants(baseHsl);

  return { base, opacity };
};

/**
 * Creates background color system (base only)
 * Background doesn't have opacity variants in HeroUI
 *
 * @param forceFallback - Force use of fallback colors
 * @returns Background color system
 */
const createBackgroundColorSystem = (
  forceFallback: boolean = false
): BackgroundColorSystem => {
  const baseHsl = createSingleColor(
    "background",
    FALLBACK_COLORS.background,
    forceFallback
  );
  const base = createColorFormats(baseHsl);

  return { base };
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
    background: createBackgroundColorSystem(forceFallback),
    foreground: createSimpleColorSystem(forceFallback),
  };
};

// ============================================================================
// Context Implementation
// ============================================================================

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Storage key for custom theme
const CUSTOM_THEME_KEY = "dimitri-portfolio-custom-theme";
const DEFAULT_PRIMARY_COLOR = "#3b82f6";

/**
 * Theme context provider component
 *
 * Provides HeroUI theme colors in multiple formats with server-safe hydration.
 * Colors are extracted from CSS custom properties and converted to hex, hsl, rgba, hsla.
 *
 * Features:
 * - Server-safe: Uses fallback colors during SSR to prevent hydration mismatches
 * - Manual updates: Call updateTheme() when theme changes
 * - Multiple formats: Each color available in hex, hsl, rgba, hsla
 * - Complete color systems: Shades (50-950) and opacity variants (10-90%)
 * - Retry capability when extraction fails
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
  const [hasExtractionFailed, setHasExtractionFailed] = useState(false);
  const [isExtractionRequested, setIsExtractionRequested] = useState(false);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Theme generation state
  const [primaryColor, setPrimaryColorState] = useState(DEFAULT_PRIMARY_COLOR);
  const [isGeneratingTheme, setIsGeneratingTheme] = useState(false);
  const [themeGenerationError, setThemeGenerationError] =
    useState<Error | null>(null);
  const generationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Extract theme colors with error handling and automatic retry
   */
  const runExtraction = useCallback((immediate: boolean = false) => {
    const extractThemeColorsIdle = async () => {
      // Use the generalized retry utility for theme extraction
      const result = await retryWithBackoff(
        async () => {
          const newColors = extractThemeColors(false); // Extract real colors
          return newColors;
        },
        {
          ...RetryPresets.standard, // Use standard preset for theme extraction
          retryDelay: 3000, // 3 second delay between retries
          maxRetries: immediate ? 0 : 3, // No retries for manual updates, 3 for automatic
          onRetry: (error, attempt, delay) => {
            console.log(
              `Retrying theme extraction in ${delay}ms (attempt ${
                attempt + 1
              }/3): ${error.message}`
            );
            setHasExtractionFailed(false); // Clear failure state during retry
          },
          onSuccess: (newColors, totalAttempts) => {
            setColors(newColors);
            setIsInitialized(true);
            setHasExtractionFailed(false);

            // Log extraction results in development
            if (process.env.NODE_ENV === "development") {
              console.log("Theme colors extracted:", {
                primaryBase: newColors.primary.shades[500].hex,
                backgroundBase: newColors.background.base.hex,
                foregroundBase: newColors.foreground.base.hex,
                totalAttempts,
                immediate,
              });
            }
          },
          onMaxRetriesReached: (lastError, totalAttempts) => {
            console.warn(
              `Theme extraction failed after ${totalAttempts} attempts, using fallback colors:`,
              lastError
            );
            setHasExtractionFailed(true);
            setIsInitialized(true);
            // Keep existing fallback colors
          },
        }
      );

      // Handle the result for immediate extractions (manual updates)
      if (immediate && !result.success) {
        console.warn("Manual theme extraction failed:", result.error);
        setHasExtractionFailed(true);
        setIsInitialized(true);
      }
    };

    if (immediate) {
      // For manual updates - run immediately
      extractThemeColorsIdle();
    } else {
      // For automatic extraction - use idle callback
      if (typeof window !== "undefined" && "requestIdleCallback" in window) {
        window.requestIdleCallback(() => extractThemeColorsIdle(), {
          timeout: 5000, // Allow more time for theme extraction
        });
      } else {
        // Fallback for older browsers - use setTimeout with small delay
        setTimeout(() => extractThemeColorsIdle(), 50);
      }
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
    }, 0); // 200ms to ensure CSS custom properties have fully propagated
  }, [runExtraction]);

  // Load saved theme on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem(CUSTOM_THEME_KEY);
      if (savedTheme) {
        try {
          const { primaryColor: savedColor, theme } = JSON.parse(savedTheme);
          setPrimaryColorState(savedColor);
          // Apply the saved theme (now applies both light and dark modes)
          applyThemeToCSS(theme);
          // Update theme extraction after applying CSS variables
          setTimeout(() => updateTheme(), 100);
        } catch (error) {
          console.error("Failed to load saved theme:", error);
        }
      }
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
          localStorage.setItem(
            CUSTOM_THEME_KEY,
            JSON.stringify({
              primaryColor: color,
              theme,
              generatedAt: Date.now(),
            })
          );

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
    localStorage.removeItem(CUSTOM_THEME_KEY);

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
      const savedTheme = localStorage.getItem(CUSTOM_THEME_KEY);
      if (savedTheme) {
        try {
          const { theme } = JSON.parse(savedTheme);
          // Apply theme (now applies both light and dark modes automatically)
          applyThemeToCSS(theme);
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
    // Only run if extraction hasn't been completed yet
    if (!isInitialized && !isExtractionRequested) {
      setIsExtractionRequested(true);
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
  }, [isInitialized, isExtractionRequested, runExtraction]);

  const contextValue: ThemeContextType = {
    colors,
    updateTheme,
    isInitialized,
    hasExtractionFailed,
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
 * // Use opacity variants
 * const transparentPrimary = colors.primary.opacity[30].hex;
 * const semiTransparentText = colors.foreground.opacity[70].rgba;
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
