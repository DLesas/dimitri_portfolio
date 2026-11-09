import type { ReactNode } from "react";

/** A key, as the palette's hints show it; `round` for the nav button's shortcut */
export function Kbd({ children, round, className = "" }: { children: ReactNode; round?: boolean; className?: string }) {
  return (
    <kbd
      className={`inline-grid h-5 min-w-5 place-items-center border border-foreground/10 bg-foreground/[0.035] font-sans text-[11px] leading-none font-medium text-default-600 dark:bg-foreground/5 dark:text-default-500 ${round ? "rounded-full px-[7px]" : "rounded-md px-[5px]"} ${className}`}
    >
      {children}
    </kbd>
  );
}
