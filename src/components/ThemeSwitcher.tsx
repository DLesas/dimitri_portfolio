"use client";

import { useTheme } from "next-themes";
import { useHydrated } from "@/hooks/useHydrated";
import { MdSunny } from "react-icons/md";
import { MdDarkMode } from "react-icons/md";
import { NavIconButton } from "./NavIconButton";

export function ThemeSwitcher() {
  const mounted = useHydrated();
  const { theme, setTheme } = useTheme();

  if (!mounted) return null;

  return (
    <NavIconButton
      // The theme colours re-read themselves once next-themes has switched the class
      onPress={() => setTheme(theme === "light" ? "dark" : "light")}
      aria-label="Toggle theme"
    >
      {theme === "light" ? <MdSunny size={18} /> : <MdDarkMode size={18} />}
    </NavIconButton>
  );
}
