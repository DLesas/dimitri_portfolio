"use client";

import { useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { JOB_TITLE } from "@/lib/seo";

export function ConsoleEasterEgg() {
  const { colors, isInitialized } = useTheme();

  useEffect(() => {
    // Only once the theme's real colours are known
    if (isInitialized) {
      // Console Easter Egg Function that uses theme colors
      const printConsoleEasterEgg = () => {
        // Clear console first for a clean look
        console.clear();

        // Get color shades from the current theme (darkest to lightest)
        const nameColors = [
          colors.primary.shades[800].hex, // D - darkest
          colors.primary.shades[700].hex, // . - very dark
          colors.primary.shades[600].hex, // L - dark
          colors.primary.shades[500].hex, // e - medium-dark
          colors.primary.shades[400].hex, // s - medium
          colors.primary.shades[300].hex, // s - lightest
          colors.primary.shades[200].hex, // s - lightest
          colors.primary.shades[100].hex, // s - lightest
        ];

        // ASCII Art Name arranged horizontally - each character gets different theme color
        console.log(
          `%c██████╗ %c █ %c██╗     %c███████╗%c███████╗%c █████╗ %c███████╗
%c██╔══██╗%c   %c██║     %c██╔════╝%c██╔════╝%c██╔══██╗%c██╔════╝
%c██║  ██║%c   %c██║     %c█████╗  %c███████╗%c███████║%c███████╗
%c██║  ██║%c   %c██║     %c██╔══╝  %c╚════██║%c██╔══██║%c╚════██║
%c██████╔╝%c██╗%c███████╗%c███████╗%c███████║%c██║  ██║%c███████║
%c╚═════╝ %c╚═╝%c╚══════╝%c╚══════╝%c╚══════╝%c╚═╝  ╚═╝%c╚══════╝`,
          // Line 1
          `color: ${nameColors[0]}; font-weight: bold; font-size: 10px; font-family: monospace;`, // D
          `color: ${nameColors[1]}; font-weight: bold; font-size: 10px; font-family: monospace;`, // .
          `color: ${nameColors[2]}; font-weight: bold; font-size: 10px; font-family: monospace;`, // L
          `color: ${nameColors[3]}; font-weight: bold; font-size: 10px; font-family: monospace;`, // e
          `color: ${nameColors[4]}; font-weight: bold; font-size: 10px; font-family: monospace;`, // s
          `color: ${nameColors[5]}; font-weight: bold; font-size: 10px; font-family: monospace;`, // a
          `color: ${nameColors[6]}; font-weight: bold; font-size: 10px; font-family: monospace;`, // s
          // Line 2
          `color: ${nameColors[0]}; font-weight: bold; font-size: 10px; font-family: monospace;`,
          `color: ${nameColors[1]}; font-weight: bold; font-size: 10px; font-family: monospace;`,
          `color: ${nameColors[2]}; font-weight: bold; font-size: 10px; font-family: monospace;`,
          `color: ${nameColors[3]}; font-weight: bold; font-size: 10px; font-family: monospace;`,
          `color: ${nameColors[4]}; font-weight: bold; font-size: 10px; font-family: monospace;`,
          `color: ${nameColors[5]}; font-weight: bold; font-size: 10px; font-family: monospace;`,
          `color: ${nameColors[6]}; font-weight: bold; font-size: 10px; font-family: monospace;`,
          // Line 3
          `color: ${nameColors[0]}; font-weight: bold; font-size: 10px; font-family: monospace;`,
          `color: ${nameColors[1]}; font-weight: bold; font-size: 10px; font-family: monospace;`,
          `color: ${nameColors[2]}; font-weight: bold; font-size: 10px; font-family: monospace;`,
          `color: ${nameColors[3]}; font-weight: bold; font-size: 10px; font-family: monospace;`,
          `color: ${nameColors[4]}; font-weight: bold; font-size: 10px; font-family: monospace;`,
          `color: ${nameColors[5]}; font-weight: bold; font-size: 10px; font-family: monospace;`,
          `color: ${nameColors[6]}; font-weight: bold; font-size: 10px; font-family: monospace;`,
          // Line 4
          `color: ${nameColors[0]}; font-weight: bold; font-size: 10px; font-family: monospace;`,
          `color: ${nameColors[1]}; font-weight: bold; font-size: 10px; font-family: monospace;`,
          `color: ${nameColors[2]}; font-weight: bold; font-size: 10px; font-family: monospace;`,
          `color: ${nameColors[3]}; font-weight: bold; font-size: 10px; font-family: monospace;`,
          `color: ${nameColors[4]}; font-weight: bold; font-size: 10px; font-family: monospace;`,
          `color: ${nameColors[5]}; font-weight: bold; font-size: 10px; font-family: monospace;`,
          `color: ${nameColors[6]}; font-weight: bold; font-size: 10px; font-family: monospace;`,
          // Line 5
          `color: ${nameColors[0]}; font-weight: bold; font-size: 10px; font-family: monospace;`,
          `color: ${nameColors[1]}; font-weight: bold; font-size: 10px; font-family: monospace;`,
          `color: ${nameColors[2]}; font-weight: bold; font-size: 10px; font-family: monospace;`,
          `color: ${nameColors[3]}; font-weight: bold; font-size: 10px; font-family: monospace;`,
          `color: ${nameColors[4]}; font-weight: bold; font-size: 10px; font-family: monospace;`,
          `color: ${nameColors[5]}; font-weight: bold; font-size: 10px; font-family: monospace;`,
          `color: ${nameColors[6]}; font-weight: bold; font-size: 10px; font-family: monospace;`,
          // Line 6
          `color: ${nameColors[0]}; font-weight: bold; font-size: 10px; font-family: monospace;`,
          `color: ${nameColors[1]}; font-weight: bold; font-size: 10px; font-family: monospace;`,
          `color: ${nameColors[2]}; font-weight: bold; font-size: 10px; font-family: monospace;`,
          `color: ${nameColors[3]}; font-weight: bold; font-size: 10px; font-family: monospace;`,
          `color: ${nameColors[4]}; font-weight: bold; font-size: 10px; font-family: monospace;`,
          `color: ${nameColors[5]}; font-weight: bold; font-size: 10px; font-family: monospace;`,
          `color: ${nameColors[6]}; font-weight: bold; font-size: 10px; font-family: monospace;`
        );

        // Subtitle using secondary color
        console.log(
          `%c${JOB_TITLE}`,
          `color: ${nameColors[7]}; font-size: 16px; font-weight: bold; font-style: italic;`
        );
      };

      printConsoleEasterEgg();
    }
  }, [colors, isInitialized]); // Re-run when colors or initialization state changes

  // This component doesn't render anything visible
  return null;
}
