"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeSwitcher } from "./themeSwitcher";
import { SettingsMenu } from "./settings/SettingsMenu";
import { useNavigationSpace } from "@/contexts/NavigationSpaceContext";
import { useRef, useState } from "react";
import { Button } from "@heroui/react";
import { HiMenu, HiX } from "react-icons/hi";
import Logo from "./Logo";

import HelperPopover from "./HelperPopover";

export default function Navigation() {
  const pathname = usePathname();
  const { navigationRef } = useNavigationSpace();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const settingsAnchorRef = useRef<HTMLSpanElement>(null);

  const navItems = [
    { href: "/", label: "Home" },
    { href: "/about", label: "About" },
    { href: "/cv", label: "CV" },
    { href: "/contact", label: "Contact" },
    { href: "/blog", label: "Blog" },
  ];

  return (
    <nav
      ref={navigationRef}
      className="relative z-50 enter enter-duration-600 [--enter-y:-20px]"
    >
      <div className="flex justify-between items-center p-6 max-w-6xl mx-auto">
        <Link href="/">
          <Logo />
        </Link>

        <div className="flex items-center gap-8">
          {/* Desktop Navigation */}
          <div className="hidden md:flex gap-8 items-center">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`transition-colors ${
                  pathname === item.href
                    ? "text-primary font-medium"
                    : "text-foreground/70 hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Controls - rendered once for every viewport so the helper can point at the visible gear */}
          <div className="flex items-center gap-2 md:ml-4">
            <ThemeSwitcher />
            <span ref={settingsAnchorRef} className="inline-flex">
              <SettingsMenu />
            </span>
            <HelperPopover duration={6000} triggerRef={settingsAnchorRef} />

            {/* Mobile Menu Button */}
            <Button
              isIconOnly
              variant="ghost"
              size="sm"
              className="md:hidden text-foreground/70 hover:text-foreground transition-colors"
              aria-label="Toggle menu"
              onPress={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <HiX className="w-5 h-5" />
              ) : (
                <HiMenu className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay: kept mounted so it can slide out, and hidden (so out of
          the tab order and accessibility tree) once closed */}
      <div
        className={`fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-[opacity,visibility] duration-300 ${
          isMobileMenuOpen ? "opacity-100" : "invisible opacity-0"
        }`}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      {/* Menu Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-64 bg-background/95 backdrop-blur-md border-l border-foreground/10 z-50 shadow-2xl transition-[translate,opacity,visibility] duration-[425ms] ease-(--ease-spring-soft) ${
          isMobileMenuOpen ? "opacity-100" : "invisible translate-x-[300px] opacity-0"
        }`}
      >
        {/* Close button */}
        <div className="flex justify-end p-4">
          <Button
            isIconOnly
            variant="ghost"
            size="sm"
            className="text-foreground/70 hover:text-foreground"
            onPress={() => setIsMobileMenuOpen(false)}
          >
            <HiX className="w-5 h-5" />
          </Button>
        </div>

        {/* Navigation Items, staggered in as the panel opens */}
        <div className="px-6 py-4 space-y-6">
          {navItems.map((item, index) => (
            <div
              key={item.href}
              className={`transition-[translate,opacity] duration-300 ${
                isMobileMenuOpen ? "opacity-100" : "translate-x-5 opacity-0"
              }`}
              style={{ transitionDelay: isMobileMenuOpen ? `${index * 100}ms` : "0ms" }}
            >
              <Link
                href={item.href}
                className={`block text-right text-lg transition-colors ${
                  pathname === item.href
                    ? "text-primary font-medium"
                    : "text-foreground/70 hover:text-foreground"
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </nav>
  );
}
