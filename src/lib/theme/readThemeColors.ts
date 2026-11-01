/**
 * The theme's colours as hex, read from HeroUI's CSS variables, for the code that can't
 * use CSS: three.js, canvas, the map pin and the console.
 */
import { SHADES, hslToHex, parseHsl, type Shade } from "./color";
import { devLog } from "@/lib/devLog";

// ============================================================================
// Types
// ============================================================================

/** A single colour value */
interface ColorFormats {
  /** Lowercase hex, for Three.js/Canvas (e.g., "#3b82f6") */
  hex: string;
}

/** HeroUI's shade scale, lightest (50) to darkest (950) */
type ColorShades = Record<Shade, ColorFormats>;

/** A colour with shades: primary, secondary and accent */
interface ColorSystem {
  shades: ColorShades;
}

/** A colour without shades: background and foreground */
interface SingleColorSystem {
  base: ColorFormats;
}

/** The complete theme palette */
export interface ThemeColors {
  primary: ColorSystem;
  secondary: ColorSystem;
  accent: ColorSystem;
  background: SingleColorSystem;
  foreground: SingleColorSystem;
}

type ShadedColor = "primary" | "secondary" | "accent";
type SingleColor = "background" | "foreground";

// ============================================================================
// Constants
// ============================================================================

/**
 * Colours for server rendering, and for any CSS variable that isn't there (HeroUI's
 * HSL format: "220 14.3% 95.9%")
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

// ============================================================================
// Reading
// ============================================================================

/** A CSS variable's value, or null when it isn't set */
type ReadVariable = (name: string) => string | null;

/** A HeroUI HSL string as hex (in lower case), or blue if the string doesn't parse */
function toColorFormats(hslValue: string): ColorFormats {
  const hsl = parseHsl(hslValue);
  if (!hsl) {
    devLog.warn(`Failed to parse HSL string: ${hslValue}`);
    return { hex: "#3b82f6" }; // Fallback to blue
  }
  return { hex: hslToHex(hsl.h, hsl.s, hsl.l) };
}

function readShades(color: ShadedColor, read: ReadVariable): ColorSystem {
  const shades = {} as ColorShades;
  for (const shade of SHADES) {
    const value = read(`--heroui-${color}-${shade}`) ?? FALLBACK_COLORS[color][shade];
    shades[shade] = toColorFormats(value);
  }
  return { shades };
}

function readSingle(color: SingleColor, read: ReadVariable): SingleColorSystem {
  return { base: toColorFormats(read(`--heroui-${color}`) ?? FALLBACK_COLORS[color]) };
}

/** Reads the document's CSS variables; on the server every variable is missing */
function documentVariables(): ReadVariable {
  if (typeof window === "undefined") return () => null;
  let style: CSSStyleDeclaration;
  try {
    style = getComputedStyle(document.documentElement);
  } catch (error) {
    devLog.warn("Failed to read the CSS variables:", error);
    return () => null;
  }
  return (name) => style.getPropertyValue(name).trim() || null;
}

/**
 * The theme's colours, from HeroUI's CSS variables. Never throws: a missing or
 * unparseable variable falls back to its default colour.
 *
 * @param useFallbacks - Use the fallback colours only, so the server render and the
 *   first client render match
 */
export function readThemeColors(useFallbacks: boolean = false): ThemeColors {
  const read: ReadVariable = useFallbacks ? () => null : documentVariables();
  return {
    primary: readShades("primary", read),
    secondary: readShades("secondary", read),
    accent: readShades("accent", read),
    background: readSingle("background", read),
    foreground: readSingle("foreground", read),
  };
}
