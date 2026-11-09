"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { SettingsMenu } from "./settings/SettingsMenu";
import { useNavigationSpace } from "@/contexts/NavigationSpaceContext";
import { useRef, useState } from "react";
import { Button } from "@heroui/react";
import { HiMenu, HiX } from "react-icons/hi";
import { Logo } from "./Logo";
import { AskButton } from "./ask/AskButton";
import { HelperPopover } from "./HelperPopover";
import { NavIconButton } from "./NavIconButton";
import { SITE_PAGES } from "@/lib/site";

/** A nav link's colours: the current page's stands out */
const navLinkClass = (active: boolean) =>
  active ? "text-primary font-medium" : "text-foreground/70 hover:text-foreground";

/** Whether a nav link is for the page shown, or the section it's in (Blog, on a post) */
const isCurrent = (pathname: string, href: string) =>
  pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));

export function Navigation() {
  const pathname = usePathname();
  const { navigationRef } = useNavigationSpace();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const settingsAnchorRef = useRef<HTMLSpanElement>(null);

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
            {SITE_PAGES.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`transition-colors ${navLinkClass(isCurrent(pathname, item.href))}`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Controls - rendered once for every viewport so the helper can point at the visible gear */}
          <div className="flex items-center gap-2 md:ml-4">
            <AskButton />
            <ThemeSwitcher />
            <span ref={settingsAnchorRef} className="inline-flex">
              <SettingsMenu />
            </span>
            <HelperPopover triggerRef={settingsAnchorRef} />

            {/* Mobile Menu Button */}
            <NavIconButton
              className="md:hidden"
              aria-label="Toggle menu"
              onPress={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <HiX className="w-5 h-5" />
              ) : (
                <HiMenu className="w-5 h-5" />
              )}
            </NavIconButton>
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
        {/* Close button: not a NavIconButton, as it keeps the button's own transitions
            (transition-colors would replace its press animation) */}
        <div className="flex justify-end p-4">
          <Button
            isIconOnly
            variant="ghost"
            size="sm"
            className="text-foreground/70 hover:text-foreground"
            aria-label="Close menu"
            onPress={() => setIsMobileMenuOpen(false)}
          >
            <HiX className="w-5 h-5" />
          </Button>
        </div>

        {/* Navigation Items, staggered in as the panel opens */}
        <div className="px-6 py-4 space-y-6">
          {SITE_PAGES.map((item, index) => (
            <div
              key={item.href}
              className={`transition-[translate,opacity] duration-300 ${
                isMobileMenuOpen ? "opacity-100" : "translate-x-5 opacity-0"
              }`}
              style={{ transitionDelay: isMobileMenuOpen ? `${index * 100}ms` : "0ms" }}
            >
              <Link
                href={item.href}
                className={`block text-right text-lg transition-colors ${navLinkClass(isCurrent(pathname, item.href))}`}
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
