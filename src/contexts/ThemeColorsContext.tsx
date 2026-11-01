"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useMutation } from "@tanstack/react-query";
import { generateThemeFromPrimary, type GeneratedTheme } from "@/lib/theme/colorApi";
import { applyThemeToCSS, clearThemeFromCSS } from "@/lib/theme/applyTheme";
import { readThemeColors, type ThemeColors } from "@/lib/theme/readThemeColors";
import { STORAGE_KEYS, readJSON, remove, writeJSON } from "@/lib/storage";
import { whenIdle } from "@/lib/idle";
import { devLog } from "@/lib/devLog";

// ============================================================================
// Types & Constants
// ============================================================================

interface ThemeColorsContextValue {
  /** Current theme colors */
  colors: ThemeColors;
  /** Re-read the colours from the CSS variables, on the next task */
  updateTheme: () => void;
  /** Whether the colours have been read from the CSS (rather than the fallbacks) */
  isInitialized: boolean;
  /** Pick a primary colour: a theme is generated from it once picking pauses */
  setPrimaryColor: (color: string) => void;
  /** The picked primary colour */
  primaryColor: string;
  /** Whether a theme is being generated */
  isGeneratingTheme: boolean;
  /** Why the last theme generation failed, if it did */
  themeGenerationError: Error | null;
  /** Back to the default theme */
  resetTheme: () => void;
}

/** The colour picker's colour for the default theme */
const DEFAULT_PRIMARY_COLOR = "#3b82f6";
/** A theme is generated once the picked colour has stayed put this long */
const GENERATION_DEBOUNCE_MS = 350;
/** The colours are re-read this long after a theme's CSS variables change */
const REREAD_DELAY_MS = 100;

/** A custom theme, as saved */
interface SavedTheme {
  primaryColor: string;
  theme: GeneratedTheme;
  generatedAt: number;
}

const readSavedTheme = () => readJSON<SavedTheme>(STORAGE_KEYS.customTheme);

const ThemeColorsContext = createContext<ThemeColorsContextValue | undefined>(undefined);

// ============================================================================
// Provider
// ============================================================================

/**
 * Provides the theme's colours as hex, read from HeroUI's CSS variables, and the custom
 * theme: one generated from a picked primary colour, saved and applied on later visits.
 *
 * - Server-safe: fallback colours until the first read on the client, so hydration matches
 * - The colours are read once at mount (when the browser is idle), and again whenever the
 *   light/dark class changes or a theme is applied or reset
 * - Themes are generated through React Query, retrying failed requests
 *
 * Must be inside a QueryClientProvider.
 */
export function ThemeColorsProvider({ children }: { children: ReactNode }) {
  const [colors, setColors] = useState<ThemeColors>(() => readThemeColors(true));
  const [isInitialized, setIsInitialized] = useState(false);
  // The saved colour is only rendered client-side, inside the colour picker
  const [primaryColor, setPrimaryColorState] = useState(
    () => readSavedTheme()?.primaryColor ?? DEFAULT_PRIMARY_COLOR
  );
  const rereadTimerRef = useRef<number | undefined>(undefined);
  const generationTimerRef = useRef<number | undefined>(undefined);

  // ========================================
  // Reading the colours
  // ========================================

  /** Reads the colours from the CSS variables; never throws */
  const readColors = useCallback(() => {
    const next = readThemeColors();
    setColors(next);
    setIsInitialized(true);
    devLog.log("Theme colors extracted:", {
      primaryBase: next.primary.shades[500].hex,
      backgroundBase: next.background.base.hex,
      foregroundBase: next.foreground.base.hex,
    });
  }, []);

  /** Re-reads the colours after `delay` ms; a later request replaces a pending one */
  const scheduleReread = useCallback(
    (delay: number) => {
      window.clearTimeout(rereadTimerRef.current);
      rereadTimerRef.current = window.setTimeout(readColors, delay);
    },
    [readColors]
  );

  const updateTheme = useCallback(() => scheduleReread(0), [scheduleReread]);

  /** Shows a theme (or, with null, the default one), then re-reads the colours */
  const showTheme = useCallback(
    (theme: GeneratedTheme | null) => {
      if (theme) applyThemeToCSS(theme);
      else clearThemeFromCSS();
      scheduleReread(REREAD_DELAY_MS);
    },
    [scheduleReread]
  );

  // ========================================
  // Generating a theme
  // ========================================

  // Every request that completes applies and saves its theme. Failed requests are
  // retried three times, after 1, 2 and 4 seconds, whether or not the browser is online.
  const {
    mutate: generateTheme,
    reset: clearGenerationError,
    isPending: isGeneratingTheme,
    isError,
    error: themeGenerationError,
  } = useMutation({
    mutationFn: (color: string) => generateThemeFromPrimary({ primaryColor: color }),
    retry: 3,
    networkMode: "always",
    onSuccess: (theme, color) => {
      const saved: SavedTheme = { primaryColor: color, theme, generatedAt: Date.now() };
      writeJSON(STORAGE_KEYS.customTheme, saved);
      showTheme(theme);
      devLog.log(`Theme "${theme.name}" generated`);
    },
    onError: (error) => devLog.error("Failed to generate theme:", error),
  });

  /** Picks a primary colour; its theme is generated once picking pauses */
  const setPrimaryColor = useCallback(
    (color: string) => {
      setPrimaryColorState(color);
      // Only clear a failure: a request still running keeps showing as running
      if (isError) clearGenerationError();
      window.clearTimeout(generationTimerRef.current);
      generationTimerRef.current = window.setTimeout(
        () => generateTheme(color),
        GENERATION_DEBOUNCE_MS
      );
    },
    [isError, clearGenerationError, generateTheme]
  );

  /** Back to exactly the default theme: the stylesheet's, as on a first visit */
  const resetTheme = useCallback(() => {
    window.clearTimeout(generationTimerRef.current);
    remove(STORAGE_KEYS.customTheme);
    setPrimaryColorState(DEFAULT_PRIMARY_COLOR);
    if (isError) clearGenerationError();
    showTheme(null);
  }, [isError, clearGenerationError, showTheme]);

  // ========================================
  // Effects
  // ========================================

  // At mount: apply the saved theme, then read the colours once the browser is idle, so
  // the first render is never delayed
  useEffect(() => {
    const saved = readSavedTheme();
    if (saved) applyThemeToCSS(saved.theme);
    return whenIdle(readColors, { timeout: 5000, fallbackMs: 50 });
  }, [readColors]);

  // Light/dark switches: next-themes changes the root element's class, which changes the
  // stylesheet's variables. A custom theme covers both modes, so only a re-read is needed.
  useEffect(() => {
    const root = document.documentElement;
    let className = root.className;
    const observer = new MutationObserver(() => {
      // next-themes swaps the class in two steps, and rewrites it unchanged at mount
      if (root.className === className) return;
      className = root.className;
      updateTheme();
    });
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, [updateTheme]);

  // Nothing left pending after unmount
  useEffect(
    () => () => {
      window.clearTimeout(rereadTimerRef.current);
      window.clearTimeout(generationTimerRef.current);
    },
    []
  );

  const value = useMemo<ThemeColorsContextValue>(
    () => ({
      colors,
      updateTheme,
      isInitialized,
      setPrimaryColor,
      primaryColor,
      isGeneratingTheme,
      themeGenerationError,
      resetTheme,
    }),
    [
      colors,
      updateTheme,
      isInitialized,
      setPrimaryColor,
      primaryColor,
      isGeneratingTheme,
      themeGenerationError,
      resetTheme,
    ]
  );

  return <ThemeColorsContext value={value}>{children}</ThemeColorsContext>;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * The theme's colours as hex, and the custom theme controls
 *
 * @throws Error if used outside ThemeColorsProvider
 *
 * @example
 * ```tsx
 * const { colors } = useThemeColors();
 *
 * // Shades, 50 (lightest) to 950 (darkest)
 * const nodeColor = colors.primary.shades[600].hex;
 *
 * // Background and foreground
 * const bgColor = colors.background.base.hex;
 * ```
 */
export function useThemeColors(): ThemeColorsContextValue {
  const context = useContext(ThemeColorsContext);
  if (context === undefined) {
    throw new Error("useThemeColors must be used within a ThemeColorsProvider");
  }
  return context;
}
