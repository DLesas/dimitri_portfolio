"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { ThemeSwitcher } from "./themeSwitcher";

export function Navigation() {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "Home" },
    { href: "/about", label: "About" },
    { href: "/skills", label: "Skills" },
    { href: "/projects", label: "Projects" },
    { href: "/contact", label: "Contact" },
    { href: "/blog", label: "Blog" },
  ];

  return (
    <motion.nav
      className="flex justify-between items-center p-6 max-w-6xl mx-auto"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <Link href="/" className="transition-opacity hover:opacity-80">
        <Image
          src="/dlLogo.png"
          alt="DL Logo"
          width={40}
          height={40}
          className="object-contain"
        />
      </Link>
      <div className="flex gap-8 items-center">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`transition-colors ${
              pathname === item.href
                ? "text-blue-600 font-medium"
                : "text-gray-700 hover:text-blue-600 dark:text-gray-200 dark:hover:text-blue-400"
            }`}
          >
            {item.label}
          </Link>
        ))}
        <ThemeSwitcher />
      </div>
    </motion.nav>
  );
}
