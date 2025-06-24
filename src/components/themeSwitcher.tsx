"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@heroui/button";
import { MdSunny } from "react-icons/md";
import { MdDarkMode } from "react-icons/md";

export function ThemeSwitcher() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <Button
      onPress={() => setTheme(theme === "light" ? "dark" : "light")}
      isIconOnly
      variant="light"
      aria-label="Toggle theme"
    >
      {theme === "light" ? <MdSunny size={20} /> : <MdDarkMode size={20} />}
    </Button>
  );
}
