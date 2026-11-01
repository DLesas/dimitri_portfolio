import type { Metadata } from "next";
import { Providers } from "./provider";
import { ConsoleEasterEgg } from "@/components/ConsoleEasterEgg";
import "./globals.css";
import Navigation from "@/components/Navigation";


export const metadata: Metadata = {
  title: "Dimitri Lesas - Full Stack Engineer & Data Scientist",
  description:
    "Portfolio of Dimitri Lesas, a passionate full-stack engineer and data scientist specializing in intelligent solutions and modern web technologies.",
  keywords:
    "Full Stack Engineer, Data Scientist, React, Python, Machine Learning, TypeScript, Next.js",
  authors: [{ name: "Dimitri Lesas" }],
  creator: "Dimitri Lesas",
  openGraph: {
    title: "Dimitri Lesas - Full Stack Engineer & Data Scientist",
    description: "Building bridges between complex data and elegant solutions",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning lang="en">
      {/* Text uses the system font stack (HeroUI's --font-sans) */}
      <body className="antialiased min-h-screen flex flex-col">
        <Providers>
            <ConsoleEasterEgg />
            <Navigation />
            <main className="flex-1">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
