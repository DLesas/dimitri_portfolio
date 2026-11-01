"use client";

import { ThemeProvider } from "next-themes";
import {
  QueryClient,
  QueryClientProvider,
  environmentManager,
} from "@tanstack/react-query";
import { ThemeColorsProvider } from "@/contexts/ThemeColorsContext";
import { HardwarePerformanceProvider } from "@/contexts/HardwarePerformanceContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { DebugProvider } from "@/contexts/DebugContext";
import { NavigationSpaceProvider } from "@/contexts/NavigationSpaceContext";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

/**
 * TanStack Query's App Router setup (its "Advanced Server Rendering" guide): a new
 * client for every server render, so no request sees another's data, and one for the
 * life of the page in the browser. Not useState: React throws state away if the
 * first render suspends without a Suspense boundary above it.
 */
function getQueryClient() {
  if (environmentManager.isServer()) return makeQueryClient();
  return (browserQueryClient ??= makeQueryClient());
}

/**
 * Global providers for the application
 *
 * Provider hierarchy (outer to inner):
 * 1. QueryClientProvider - Provides React Query functionality for data fetching
 * 2. ThemeProvider - Manages light/dark theme switching
 * 3. ThemeColorsProvider - Provides HeroUI theme colors as hex, and custom theme generation
 * 4. DebugProvider - Manages debug mode state for showing/hiding debug information
 * 5. HardwarePerformanceProvider - Detects device capabilities and provides performance settings
 * 6. NavigationSpaceProvider - Measures the navigation bar, for pages' --nav-height
 * 7. SettingsProvider - Manages user settings with hardware-aware defaults
 *
 * The order is important: SettingsProvider depends on both HardwarePerformanceProvider
 * and DebugProvider for determining appropriate default settings and debug logging.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        <ThemeColorsProvider>
          <DebugProvider>
            <HardwarePerformanceProvider>
              <NavigationSpaceProvider>
                <SettingsProvider>{children}</SettingsProvider>
              </NavigationSpaceProvider>
            </HardwarePerformanceProvider>
          </DebugProvider>
        </ThemeColorsProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
