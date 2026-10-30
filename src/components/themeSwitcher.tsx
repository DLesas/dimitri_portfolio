"use client";

import { useTheme as useThemeContext } from "@/contexts/ThemeContext";
import { useTheme } from "next-themes";
import { Button } from "@heroui/react";
import { useHydrated } from "@/hooks/useHydrated";
import { MdSunny } from "react-icons/md";
import { MdDarkMode } from "react-icons/md";

export function ThemeSwitcher() {
  const mounted = useHydrated();
  const { theme, setTheme } = useTheme();
  const { updateTheme } = useThemeContext();

  if (!mounted) return null;

  return (
    <Button
      onPress={() => {
        setTheme(theme === "light" ? "dark" : "light");
        updateTheme();
      }}
      isIconOnly
      variant="ghost"
      size="sm"
      className="text-foreground/70 hover:text-foreground transition-colors"
      aria-label="Toggle theme"
    >
      {theme === "light" ? <MdSunny size={18} /> : <MdDarkMode size={18} />}
    </Button>
  );
}
