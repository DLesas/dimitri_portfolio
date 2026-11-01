"use client";

import { createContext, useContext, useEffect, useRef } from "react";

interface NavigationSpaceContextType {
  navigationRef: React.RefObject<HTMLElement | null>;
}

const NavigationSpaceContext = createContext<NavigationSpaceContextType | undefined>(
  undefined
);

/**
 * Measures the navigation bar (attached through `navigationRef`) and keeps its height
 * in the `--nav-height` CSS variable on :root, so pages can fill the space below it
 * (PageShell.tsx). Until it's measured, pages fall back to the bar's usual 102px.
 */
export function NavigationSpaceProvider({ children }: { children: React.ReactNode }) {
  const navigationRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const navigation = navigationRef.current;
    if (!navigation) return;
    const root = document.documentElement;

    // Fires once on observe, then whenever the bar's size changes (resizes included)
    const observer = new ResizeObserver(() => {
      root.style.setProperty("--nav-height", `${navigation.offsetHeight}px`);
    });
    observer.observe(navigation);

    return () => {
      observer.disconnect();
      root.style.removeProperty("--nav-height");
    };
  }, []);

  return (
    <NavigationSpaceContext.Provider value={{ navigationRef }}>
      {children}
    </NavigationSpaceContext.Provider>
  );
}

export function useNavigationSpace() {
  const context = useContext(NavigationSpaceContext);
  if (context === undefined) {
    throw new Error("useNavigationSpace must be used within a NavigationSpaceProvider");
  }
  return context;
}
