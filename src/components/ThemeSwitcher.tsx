"use client";

import { useTheme as useThemeContext } from "@/contexts/ThemeContext";
import { useTheme } from "next-themes";
import { useHydrated } from "@/hooks/useHydrated";
import { MdSunny } from "react-icons/md";
import { MdDarkMode } from "react-icons/md";
import { NavIconButton } from "./NavIconButton";

export function ThemeSwitcher() {
  const mounted = useHydrated();
  const { theme, setTheme } = useTheme();
  const { updateTheme } = useThemeContext();

  if (!mounted) return null;

  return (
    <NavIconButton
      onPress={() => {
        setTheme(theme === "light" ? "dark" : "light");
        updateTheme();
      }}
      aria-label="Toggle theme"
    >
      {theme === "light" ? <MdSunny size={18} /> : <MdDarkMode size={18} />}
    </NavIconButton>
  );
}
