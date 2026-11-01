"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

// ============================================================================
// Types & Interfaces
// ============================================================================

interface DebugContextType {
  /** Whether debug mode is enabled */
  isDebugEnabled: boolean;
  /** Toggle debug mode on/off */
  toggleDebug: () => void;
}

// ============================================================================
// Context Creation
// ============================================================================

const DebugContext = createContext<DebugContextType | undefined>(undefined);

// ============================================================================
// Provider Component
// ============================================================================

/**
 * Debug context provider component
 *
 * Manages global debug state for the application, controlling visibility
 * of debug information like performance stats, hardware info, etc.
 */
export function DebugProvider({ children }: { children: ReactNode }) {
  const [isDebugEnabled, setIsDebugEnabled] = useState(false);

  const toggleDebug = useCallback(() => setIsDebugEnabled((prev) => !prev), []);

  const contextValue = useMemo<DebugContextType>(
    () => ({ isDebugEnabled, toggleDebug }),
    [isDebugEnabled, toggleDebug]
  );

  return <DebugContext value={contextValue}>{children}</DebugContext>;
}

// ============================================================================
// Context Hook
// ============================================================================

/**
 * Hook to access debug context
 * Must be used within a DebugProvider
 */
export function useDebug() {
  const context = useContext(DebugContext);
  if (context === undefined) {
    throw new Error("useDebug must be used within a DebugProvider");
  }
  return context;
}
