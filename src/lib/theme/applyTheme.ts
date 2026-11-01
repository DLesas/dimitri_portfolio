/**
 * Writes a generated theme into HeroUI's CSS variables, and takes it out again.
 *
 * Only the --heroui-* palette is written: HeroUI v3 owns the unprefixed --accent token
 * (as a full colour), and src/styles/heroui-palette.css derives it from these.
 * Background and foreground stay with the stylesheet's light and dark themes.
 */
import { hexToHsl } from "./color";
import type { GeneratedTheme, ThemePalette } from "./colorApi";

/** The colours a generated theme sets */
const THEMED_COLORS = ["primary", "secondary", "accent"] as const;

/** Any variable a generated theme sets: a shade ("--heroui-primary-500") or a base colour */
const THEMED_VARIABLE = /^--heroui-(primary|secondary|accent)(-|$)/;

/** The style element holding the dark mode variables */
const DARK_STYLE_ID = "dynamic-dark-theme";

/** Hex to HeroUI's HSL format, in whole degrees and percent (e.g. "220 14% 96%") */
function hexToHslString(hex: string): string {
  const { h, s, l } = hexToHsl(hex);
  return `${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%`;
}

/**
 * A palette's CSS variables, as [name, value]: every shade the (possibly saved) theme
 * has, as they are, then each base colour (its 500 shade)
 */
function themeVariables(palette: ThemePalette): [string, string][] {
  const shades: [string, string][] = [];
  const bases: [string, string][] = [];
  for (const color of THEMED_COLORS) {
    const scale = palette[color];
    for (const [shade, hex] of Object.entries(scale)) {
      shades.push([`--heroui-${color}-${shade}`, hexToHslString(hex)]);
    }
    bases.push([`--heroui-${color}`, hexToHslString(scale[500])]);
  }
  return [...shades, ...bases];
}

/**
 * Applies a generated theme to HeroUI's CSS variables: the light palette on the root
 * element, the dark one in a `.dark` rule, both at once.
 */
export function applyThemeToCSS(theme: GeneratedTheme): void {
  const root = document.documentElement;
  for (const [name, value] of themeVariables(theme.light)) {
    root.style.setProperty(name, value);
  }

  const css = `.dark{${themeVariables(theme.dark)
    .map(([name, value]) => `${name}:${value};`)
    .join("")}}`;
  let styleTag = document.getElementById(DARK_STYLE_ID) as HTMLStyleElement | null;
  if (!styleTag) {
    styleTag = document.createElement("style");
    styleTag.id = DARK_STYLE_ID;
    document.head.appendChild(styleTag);
  }
  styleTag.textContent = css;
}

/** Removes a generated theme's CSS variables, so the stylesheet's default palette shows */
export function clearThemeFromCSS(): void {
  const { style } = document.documentElement;
  for (const name of Array.from(style)) {
    if (THEMED_VARIABLE.test(name)) style.removeProperty(name);
  }
  document.getElementById(DARK_STYLE_ID)?.remove();
}
