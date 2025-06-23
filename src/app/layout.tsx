import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "../providers";
import { Navigation } from "@/components/Navigation";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
      >
        <Providers>
          <Navigation />
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
