/**
 * Colour maths for the theme: HeroUI's shade scale, and conversions between hex and HSL.
 * HSL values are in degrees (h) and percent (s, l), as in HeroUI's "220 14.3% 95.9%".
 */

/** HeroUI's shade scale, lightest (50) to darkest (950) */
export const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
export type Shade = (typeof SHADES)[number];

export interface Hsl {
  /** Hue in degrees, 0 to 360 */
  h: number;
  /** Saturation in percent */
  s: number;
  /** Lightness in percent */
  l: number;
}

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

const HSL_PATTERN = /(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%/;

/** Parses HeroUI's HSL format ("220 14.3% 95.9%"); null when it doesn't match */
export function parseHsl(value: string): Hsl | null {
  const match = value.match(HSL_PATTERN);
  if (!match) return null;
  return { h: parseFloat(match[1]), s: parseFloat(match[2]), l: parseFloat(match[3]) };
}

/** HSL to a hex colour in lower case, e.g. "#3b82f6" */
export function hslToHex(h: number, s: number, l: number): string {
  const sat = s / 100;
  const light = l / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = light - c / 2;

  let r: number, g: number, b: number;
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

  const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** A hex colour ("#rrggbb" or "rrggbb", any case) to 0–255 channels */
export function hexToRgb(hex: string): Rgb {
  const digits = hex.replace("#", "");
  return {
    r: parseInt(digits.slice(0, 2), 16),
    g: parseInt(digits.slice(2, 4), 16),
    b: parseInt(digits.slice(4, 6), 16),
  };
}

/** A hex colour to HSL, unrounded */
export function hexToHsl(hex: string): Hsl {
  const rgb = hexToRgb(hex);
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
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

  return { h: h * 360, s: s * 100, l: l * 100 };
}
