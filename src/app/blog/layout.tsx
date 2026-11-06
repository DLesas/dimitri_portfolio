import { Playfair_Display } from "next/font/google";

// The blog's titles are set in Playfair Display italic (the font-display utility in
// globals.css). Loaded here, so only blog pages download it; next/font serves it from the
// site itself and sizes a fallback to match, so the titles don't shift as it arrives.
const playfair = Playfair_Display({
  subsets: ["latin"],
  style: "italic",
  weight: "600",
  variable: "--font-display",
  display: "swap",
});

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${playfair.variable} flex flex-col flex-1`}>{children}</div>;
}
