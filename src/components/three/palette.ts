import * as THREE from "three";
import type { ThemeColors } from "@/lib/theme/readThemeColors";

/** The colours of the site's 3D networks: the background and the diagrams in blog posts */
export interface NetworkPalette {
  core: string;
  rim: string;
  halo: string;
  lineA: string;
  lineB: string;
  packet: string;
  additive: boolean;
}

/** The network's colours for the theme; glows are additive on a dark background */
export function networkPalette(colors: ThemeColors, dark: boolean): NetworkPalette {
  const primary = colors.primary.shades;
  const secondary = colors.secondary.shades;
  const core = new THREE.Color(primary[500].hex).lerp(new THREE.Color(secondary[500].hex), 0.5);
  if (!dark) core.copy(new THREE.Color(primary[600].hex));
  return {
    core: `#${core.getHexString()}`,
    rim: `#${core.clone().multiplyScalar(dark ? 0.55 : 0.7).getHexString()}`,
    halo: dark ? primary[400].hex : primary[500].hex,
    lineA: dark ? primary[500].hex : primary[600].hex,
    lineB: dark ? secondary[500].hex : secondary[600].hex,
    packet: dark ? primary[100].hex : primary[500].hex,
    additive: dark,
  };
}
