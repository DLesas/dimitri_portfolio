"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeSwitcher } from "./themeSwitcher";
import { SettingsMenu } from "./settings/SettingsMenu";
import { useNavigationSpace } from "@/contexts/NavigationSpaceContext";
import { useState } from "react";
import { Button } from "@heroui/react";
import { HiMenu, HiX } from "react-icons/hi";
import Logo from "./Logo";

import HelperPopover from "./HelperPopover";

export default function Navigation() {
  const pathname = usePathname();
  const { navigationRef } = useNavigationSpace();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { href: "/", label: "Home" },
    { href: "/about", label: "About" },
    { href: "/cv", label: "CV" },
    { href: "/contact", label: "Contact" },
    { href: "/blog", label: "Blog" },
  ];

  return (
    <motion.nav
      ref={navigationRef}
      className="relative z-50"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="flex justify-between items-center p-6 max-w-6xl mx-auto">
        <Link href="/">
          <Logo />
        </Link>

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
          <div className="flex items-center gap-2 ml-4">
            <ThemeSwitcher />
            <SettingsMenu />
            <HelperPopover duration={6000}>
              <div>
              </div>
            </HelperPopover>
          </div>
        </div>

        {/* Mobile Menu Button */}
        <div className="flex md:hidden items-center gap-2">
          <ThemeSwitcher />
          <SettingsMenu />
          <Button
            isIconOnly
            variant="light"
            size="sm"
            className="text-foreground/70 hover:text-foreground transition-colors"
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

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
              onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Menu Panel */}
            <motion.div
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 300 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-64 bg-background/95 backdrop-blur-md border-l border-foreground/10 z-50 shadow-2xl"
            >
              {/* Close button */}
              <div className="flex justify-end p-4">
                <Button
                  isIconOnly
                  variant="light"
                  size="sm"
                  className="text-foreground/70 hover:text-foreground"
                  onPress={() => setIsMobileMenuOpen(false)}
                >
                  <HiX className="w-5 h-5" />
                </Button>
              </div>

              {/* Navigation Items */}
              <div className="px-6 py-4 space-y-6">
                {navItems.map((item, index) => (
                  <motion.div
                    key={item.href}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.1 }}
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
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
