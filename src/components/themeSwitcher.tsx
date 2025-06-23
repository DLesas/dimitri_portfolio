"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeSwitcher() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <button
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      className="ml-4 p-2 rounded transition-colors bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
      aria-label="Toggle theme"
    >
      {theme === "light" ? "🌞" : "🌙"}
    </button>
  );
}
