"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

// ============================================================================
// Types & Interfaces
// ============================================================================

interface DebugContextType {
  /** Whether debug mode is enabled */
  isDebugEnabled: boolean;
  /** Toggle debug mode on/off */
  toggleDebug: () => void;
  /** Set debug mode to a specific value */
  setDebugEnabled: (enabled: boolean) => void;
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
  const [isDebugEnabled, setIsDebugEnabledState] = useState(false);

  const toggleDebug = () => {
    setIsDebugEnabledState((prev) => !prev);
  };

  const setDebugEnabled = (enabled: boolean) => {
    setIsDebugEnabledState(enabled);
  };

  const contextValue: DebugContextType = {
    isDebugEnabled,
    toggleDebug,
    setDebugEnabled,
  };

  return (
    <DebugContext.Provider value={contextValue}>
      {children}
    </DebugContext.Provider>
  );
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
