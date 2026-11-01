"use client";

import { useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { JOB_TITLE } from "@/lib/seo";

// "D.LESAS" in block letters, one %c per letter (7 a line) so each takes its own colour
const NAME_ART = `%c██████╗ %c █ %c██╗     %c███████╗%c███████╗%c █████╗ %c███████╗
%c██╔══██╗%c   %c██║     %c██╔════╝%c██╔════╝%c██╔══██╗%c██╔════╝
%c██║  ██║%c   %c██║     %c█████╗  %c███████╗%c███████║%c███████╗
%c██║  ██║%c   %c██║     %c██╔══╝  %c╚════██║%c██╔══██║%c╚════██║
%c██████╔╝%c██╗%c███████╗%c███████╗%c███████║%c██║  ██║%c███████║
%c╚═════╝ %c╚═╝%c╚══════╝%c╚══════╝%c╚══════╝%c╚═╝  ╚═╝%c╚══════╝`;
const ART_LINES = 6;

const letterStyle = (color: string) =>
  `color: ${color}; font-weight: bold; font-size: 10px; font-family: monospace;`;

/** Prints the name and role in the browser console, in the theme's colours */
export function ConsoleEasterEgg() {
  const { colors, isInitialized } = useTheme();

  useEffect(() => {
    // Only once the theme's real colours are known
    if (!isInitialized) return;

    // The letters run from the theme's darkest primary shade to its lighter ones
    const shades = colors.primary.shades;
    const letterColors = ([800, 700, 600, 500, 400, 300, 200] as const).map(
      (shade) => shades[shade].hex
    );
    const lineStyles = letterColors.map(letterStyle);

    // Clear console first for a clean look
    console.clear();
    console.log(NAME_ART, ...Array.from({ length: ART_LINES }, () => lineStyles).flat());
    console.log(
      `%c${JOB_TITLE}`,
      `color: ${shades[100].hex}; font-size: 16px; font-weight: bold; font-style: italic;`
    );
  }, [colors, isInitialized]); // Re-run when colors or initialization state changes

  // This component doesn't render anything visible
  return null;
}
