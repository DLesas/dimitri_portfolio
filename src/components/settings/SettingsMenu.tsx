"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  Button,
  Switch,
  Divider,
} from "@heroui/react";
import { FaCog, FaDesktop, FaPalette, FaChevronLeft } from "react-icons/fa";
import { NetworkBackgroundSettings } from "./panels/NetworkBackgroundSettings";
import { useDebug } from "@/contexts/DebugContext";
import { useHardwarePerformance } from "@/contexts/HardwarePerformanceContext";

// ============================================================================
// Constants
// ============================================================================

/**
 * Delay before closing submenus when mouse leaves (in milliseconds)
 * This prevents accidental closures when user briefly moves outside the menu
 */
const SUBMENU_CLOSE_DELAY = 250;

// ============================================================================
// Component
// ============================================================================

/**
 * Main settings menu component with nested submenu navigation
 *
 * Features:
 * - Hierarchical menu structure with hover-triggered submenus
 * - Delayed closing to prevent accidental submenu dismissal
 * - Proper cleanup of timers on unmount
 * - Responsive placement using Hero UI Popover
 *
 * Menu Structure:
 * - Main Settings (gear icon)
 *   ├── Network Background Settings
 *   └── Color Settings (placeholder)
 *
 * Hover Behavior:
 * Submenus open immediately on hover and close after a delay when the mouse
 * leaves. This provides a smooth user experience while preventing accidental
 * menu dismissals during navigation.
 */
export function SettingsMenu() {
  // ========================================
  // Context Hooks
  // ========================================

  const { isDebugEnabled, toggleDebug } = useDebug();
  const { hardwareInfo, performanceSettings, isDetectionComplete } =
    useHardwarePerformance();

  // ========================================
  // State Management
  // ========================================

  const [isMainOpen, setIsMainOpen] = useState(false);
  const [isNetworkOpen, setIsNetworkOpen] = useState(false);
  const [isColorOpen, setIsColorOpen] = useState(false);

  // ========================================
  // Timeout Management
  // ========================================

  /**
   * Map of timeout references for delayed submenu closing
   * Each submenu has its own timeout to allow independent hover behavior
   */
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  /**
   * Create hover handlers for submenu with delayed closing behavior
   *
   * @param menuKey - Unique identifier for the submenu
   * @param setOpen - State setter for the submenu's open state
   * @returns Object with onMouseEnter and onMouseLeave handlers
   */
  const createSubmenuHandlers = (
    menuKey: string,
    setOpen: (open: boolean) => void
  ) => ({
    onMouseEnter: () => {
      // Clear any existing timeout for this menu to prevent closure
      const existingTimeout = timeoutRefs.current.get(menuKey);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
        timeoutRefs.current.delete(menuKey);
      }
      setOpen(true);
    },
    onMouseLeave: () => {
      // Set delayed close for this menu
      const timeout = setTimeout(() => {
        setOpen(false);
        timeoutRefs.current.delete(menuKey);
      }, SUBMENU_CLOSE_DELAY);
      timeoutRefs.current.set(menuKey, timeout);
    },
  });

  // ========================================
  // Submenu Handlers
  // ========================================

  const networkHandlers = createSubmenuHandlers("network", setIsNetworkOpen);
  const colorHandlers = createSubmenuHandlers("color", setIsColorOpen);

  // ========================================
  // Main Menu Handlers
  // ========================================

  /**
   * Handle main menu open/close state changes
   * Ensures all submenus are closed when main menu closes
   */
  const handleMainOpenChange = (open: boolean) => {
    setIsMainOpen(open);
    if (!open) {
      // Close all submenus
      setIsNetworkOpen(false);
      setIsColorOpen(false);

      // Clear all pending timeouts
      timeoutRefs.current.forEach((timeout) => clearTimeout(timeout));
      timeoutRefs.current.clear();
    }
  };

  // ========================================
  // Cleanup Effect
  // ========================================

  /**
   * Cleanup all timeouts on component unmount
   * Prevents memory leaks from pending timeout operations
   */
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach((timeout) => clearTimeout(timeout));
      timeoutRefs.current.clear();
    };
  }, []);

  // ========================================
  // Render
  // ========================================

  return (
    <div className="relative">
      {/* Main Settings Popover */}
      <Popover
        isOpen={isMainOpen}
        onOpenChange={handleMainOpenChange}
        placement="bottom-end"
        offset={10}
      >
        <PopoverTrigger>
          <Button
            isIconOnly
            variant="light"
            size="sm"
            className="text-foreground/70 hover:text-foreground transition-colors"
            aria-label="Settings"
          >
            <FaCog className="w-4 h-4" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="p-2 min-w-[200px]">
          <div className="space-y-1">
            {/* Network Background Settings Submenu */}
            <div className="relative">
              <Popover
                isOpen={isNetworkOpen}
                onOpenChange={setIsNetworkOpen}
                placement="left-start"
                offset={5}
                triggerType="grid"
              >
                <PopoverTrigger>
                  <Button
                    variant="light"
                    className="w-full justify-between text-left h-auto p-2"
                    startContent={<FaChevronLeft className="w-3 h-3" />}
                    endContent={<FaDesktop className="w-4 h-4" />}
                    onMouseEnter={networkHandlers.onMouseEnter}
                    onMouseLeave={networkHandlers.onMouseLeave}
                  >
                    <span>Network Background</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="p-0"
                  onMouseEnter={networkHandlers.onMouseEnter}
                  onMouseLeave={networkHandlers.onMouseLeave}
                >
                  <NetworkBackgroundSettings />
                </PopoverContent>
              </Popover>
            </div>

            {/* Color Settings Submenu (Placeholder) */}
            <div className="relative">
              <Popover
                isOpen={isColorOpen}
                onOpenChange={setIsColorOpen}
                placement="left-start"
                offset={5}
                triggerType="grid"
              >
                <PopoverTrigger>
                  <Button
                    variant="light"
                    className="w-full justify-between text-left h-auto p-2"
                    startContent={<FaChevronLeft className="w-3 h-3" />}
                    endContent={<FaPalette className="w-4 h-4" />}
                    onMouseEnter={colorHandlers.onMouseEnter}
                    onMouseLeave={colorHandlers.onMouseLeave}
                  >
                    <span>Color Settings</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="p-4"
                  onMouseEnter={colorHandlers.onMouseEnter}
                  onMouseLeave={colorHandlers.onMouseLeave}
                >
                  <div className="w-60">
                    <h3 className="text-lg font-semibold mb-3">
                      Color Settings
                    </h3>
                    <p className="text-sm text-foreground/70">
                      Color customization coming soon...
                    </p>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Debug Toggle Section */}
            <Divider className="my-2" />
            <div className="px-2 py-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm">Debug Mode</span>
                </div>
                <Switch
                  size="sm"
                  isSelected={isDebugEnabled}
                  onValueChange={toggleDebug}
                />
              </div>
              <p className="text-xs text-foreground/60 mt-1">
                Show performance stats and hardware info
              </p>
            </div>

            {/* Hardware Info Section - Only when debug is enabled */}
            {isDebugEnabled && (
              <>
                <Divider className="my-2" />
                <div className="px-2 py-1">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground/70 mb-2">
                    <span>Detected Hardware</span>
                    {!isDetectionComplete && (
                      <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                    )}
                  </div>
                  {isDetectionComplete ? (
                    <div className="text-xs text-foreground/60 space-y-1">
                      <div>
                        <strong>Inferred Perf. Level:</strong>{" "}
                        {performanceSettings.level}
                      </div>
                      <div>
                        <strong>Device:</strong>{" "}
                        {hardwareInfo.isMobile
                          ? "Mobile"
                          : hardwareInfo.isTablet
                          ? "Tablet"
                          : "Desktop"}
                      </div>
                      <div>
                        <strong>Cores:</strong> {hardwareInfo.cores} |{" "}
                        <strong>Memory:</strong> {hardwareInfo.memory}GB
                      </div>
                      <div>
                        <strong>Browser:</strong> {hardwareInfo.browser.name}{" "}
                        {hardwareInfo.browser.version}
                      </div>
                      <div>
                        <strong>HW Acceleration:</strong>{" "}
                        {hardwareInfo.hasHardwareAcceleration ? "Yes" : "No"}
                      </div>
                      {hardwareInfo.gpu && (
                        <div>
                          <strong>GPU:</strong>{" "}
                          {hardwareInfo.gpu.length > 40
                            ? hardwareInfo.gpu.substring(0, 40) + "..."
                            : hardwareInfo.gpu}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-foreground/50">
                      Detecting hardware capabilities...
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
