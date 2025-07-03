"use client";

import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useEffect,
} from "react";

interface NavigationContextType {
  navigationHeight: number;
  navigationRef: React.RefObject<HTMLElement | null>;
  getAvailableHeight: () => string;
}

const NavigationContext = createContext<NavigationContextType | undefined>(
  undefined
);

export function NavigationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const navigationRef = useRef<HTMLElement>(null);
  const [navigationHeight, setNavigationHeight] = useState(102); // Default fallback (6rem)

  useEffect(() => {
    const updateHeight = () => {
      if (navigationRef.current) {
        const height = navigationRef.current.offsetHeight;
        setNavigationHeight(height);
      }
    };

    // Initial measurement
    updateHeight();

    // Update on window resize
    window.addEventListener("resize", updateHeight);

    // Update when navigation ref changes
    const observer = new ResizeObserver(updateHeight);
    if (navigationRef.current) {
      observer.observe(navigationRef.current);
    }

    return () => {
      window.removeEventListener("resize", updateHeight);
      observer.disconnect();
    };
  }, []);

  const getAvailableHeight = () => {
    return `calc(100vh - ${navigationHeight + 10}px)`;
  };

  return (
    <NavigationContext.Provider
      value={{
        navigationHeight,
        navigationRef,
        getAvailableHeight,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigationSpace() {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error(
      "useNavigationSpace must be used within a NavigationProvider"
    );
  }
  return context;
}
