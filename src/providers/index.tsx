"use client";

import { HeroUIProvider } from "@heroui/react";
import { ThemeProvider } from "next-themes";
import { HardwarePerformanceProvider } from "@/contexts/HardwarePerformanceContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { DebugProvider } from "@/contexts/DebugContext";

/**
 * Global providers for the application
 *
 * Provider hierarchy (outer to inner):
 * 1. ThemeProvider - Manages light/dark theme switching
 * 2. HeroUIProvider - Provides Hero UI component system
 * 3. HardwarePerformanceProvider - Detects device capabilities and provides performance settings
 * 4. SettingsProvider - Manages user settings with hardware-aware defaults
 * 5. DebugProvider - Manages debug mode state for showing/hiding debug information
 *
 * The order is important: SettingsProvider depends on HardwarePerformanceProvider
 * for determining appropriate default settings based on device performance.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <HeroUIProvider>
        <HardwarePerformanceProvider>
          <SettingsProvider>
            <DebugProvider>{children}</DebugProvider>
          </SettingsProvider>
        </HardwarePerformanceProvider>
      </HeroUIProvider>
    </ThemeProvider>
  );
}
