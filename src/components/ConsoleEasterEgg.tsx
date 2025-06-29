"use client";

import { useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";

export function ConsoleEasterEgg() {
  const { colors, isInitialized } = useTheme();

  useEffect(() => {
    // Only run in browser environment and when theme is initialized
    if (typeof window !== "undefined" && isInitialized) {
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
          "%cFull Stack Engineer & Data Scientist",
          `color: ${nameColors[7]}; font-size: 16px; font-weight: bold; font-style: italic;`
        );

        // // Divider using accent color
        // console.log(
        //   "%c" + "═".repeat(50),
        //   `color: ${colors.accent.shades[500].hex}; font-weight: bold;`
        // );

        // // Tech stack header using primary color
        // console.log(
        //   "%c💻 Tech Stack:",
        //   `color: ${colors.primary.shades[600].hex}; font-size: 14px; font-weight: bold;`
        // );

        // const techStack = [
        //   "⚡ React & Next.js",
        //   "🐍 Python & Machine Learning",
        //   "📊 Data Science & Analytics",
        //   "🎨 Three.js & WebGL",
        //   "☁️ Cloud Architecture",
        // ];

        // // Use a mix of primary, secondary, and accent colors for tech stack
        // const techStackColors = [
        //   colors.primary.shades[500].hex, // React - primary
        //   colors.secondary.shades[600].hex, // Python - secondary
        //   colors.accent.shades[500].hex, // Data Science - accent
        //   colors.primary.shades[400].hex, // Three.js - lighter primary
        //   colors.secondary.shades[500].hex, // Cloud - lighter secondary
        // ];

        // techStack.forEach((tech, index) => {
        //   console.log(
        //     `%c${tech}`,
        //     `color: ${techStackColors[index]}; font-size: 12px; margin-left: 10px;`
        //   );
        // });
      };

      printConsoleEasterEgg();
    }
  }, [colors, isInitialized]); // Re-run when colors or initialization state changes

  // This component doesn't render anything visible
  return null;
}
