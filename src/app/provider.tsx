"use client";

import { HeroUIProvider } from "@heroui/react";
import { ThemeProvider } from "next-themes";
import { ThemeProvider as HeroUIThemeProvider } from "@/contexts/ThemeContext";
import { HardwarePerformanceProvider } from "@/contexts/HardwarePerformanceContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { DebugProvider } from "@/contexts/DebugContext";

/**
 * Global providers for the application
 *
 * Provider hierarchy (outer to inner):
 * 1. ThemeProvider - Manages light/dark theme switching
 * 2. HeroUIProvider - Provides Hero UI component system
 * 3. HeroUIThemeProvider - Extracts and provides HeroUI theme colors in multiple formats
 * 4. HardwarePerformanceProvider - Detects device capabilities and provides performance settings
 * 5. SettingsProvider - Manages user settings with hardware-aware defaults
 * 6. DebugProvider - Manages debug mode state for showing/hiding debug information
 *
 * The order is important: SettingsProvider depends on HardwarePerformanceProvider
 * for determining appropriate default settings based on device performance.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <HeroUIProvider>
        <HeroUIThemeProvider>
          <HardwarePerformanceProvider>
            <SettingsProvider>
              <DebugProvider>{children}</DebugProvider>
            </SettingsProvider>
          </HardwarePerformanceProvider>
        </HeroUIThemeProvider>
      </HeroUIProvider>
    </ThemeProvider>
  );
}
