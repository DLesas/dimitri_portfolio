"use client";

import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider as HeroUIThemeProvider } from "@/contexts/ThemeContext";
import { HardwarePerformanceProvider } from "@/contexts/HardwarePerformanceContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { DebugProvider } from "@/contexts/DebugContext";
import { NavigationProvider } from "@/contexts/NavigationSpaceContext";

// Create a client instance outside component to ensure it's stable
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

/**
 * Global providers for the application
 *
 * Provider hierarchy (outer to inner):
 * 1. QueryClientProvider - Provides React Query functionality for data fetching
 * 2. ThemeProvider - Manages light/dark theme switching
 * 3. HeroUIThemeProvider - Extracts and provides HeroUI theme colors in multiple formats
 * 4. DebugProvider - Manages debug mode state for showing/hiding debug information
 * 5. HardwarePerformanceProvider - Detects device capabilities and provides performance settings
 * 6. NavigationProvider - Manages the navigation space
 * 7. SettingsProvider - Manages user settings with hardware-aware defaults
 *
 * The order is important: SettingsProvider depends on both HardwarePerformanceProvider
 * and DebugProvider for determining appropriate default settings and debug logging.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        <HeroUIThemeProvider>
          <DebugProvider>
            <HardwarePerformanceProvider>
              <NavigationProvider>
                <SettingsProvider>{children}</SettingsProvider>
              </NavigationProvider>
            </HardwarePerformanceProvider>
          </DebugProvider>
        </HeroUIThemeProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
