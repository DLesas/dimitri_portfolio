"use client";

import React, { useState, useRef, useEffect } from "react";
import { Popover, Button, Switch, Separator } from "@heroui/react";
import {
  FaCog,
  FaDesktop,
  FaPalette,
  FaChevronLeft,
  FaCloud,
} from "react-icons/fa";
import {
  NetworkBackgroundSettings,
  ColorSettingsPanel,
  WordCloudSettingsPanel,
} from "./panels";
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
// Types
// ============================================================================

type SubmenuKey = "network" | "color" | "wordcloud";

interface SubmenuHandlers {
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

interface SubmenuProps extends SubmenuHandlers {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

// ============================================================================
// Submenu Components
// ============================================================================

/**
 * Network Background Settings Submenu Component
 */
function NetworkSettingsSubmenu({
  isOpen,
  onOpenChange,
  onMouseEnter,
  onMouseLeave,
}: SubmenuProps) {
  return (
    <div className="relative">
      <Popover isOpen={isOpen} onOpenChange={onOpenChange}>
        <Button
          variant="ghost"
          className="w-full justify-between text-left h-auto p-2"
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        >
          <FaChevronLeft className="w-3 h-3" />
          <span>Network Background</span>
          <FaDesktop className="w-4 h-4" />
        </Button>
        <Popover.Content
          placement="left top"
          offset={5}
          className="p-0"
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        >
          <Popover.Dialog aria-label="Network background settings">
            <NetworkBackgroundSettings />
          </Popover.Dialog>
        </Popover.Content>
      </Popover>
    </div>
  );
}

/**
 * Color Settings Submenu Component
 */
function ColorSettingsSubmenu({
  isOpen,
  onOpenChange,
  onMouseEnter,
  onMouseLeave,
}: SubmenuProps) {
  return (
    <div className="relative">
      <Popover isOpen={isOpen} onOpenChange={onOpenChange}>
        <Button
          variant="ghost"
          className="w-full justify-between text-left h-auto p-2"
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        >
          <FaChevronLeft className="w-3 h-3" />
          <span>Color Settings</span>
          <FaPalette className="w-4 h-4" />
        </Button>
        <Popover.Content
          placement="left top"
          offset={5}
          className="p-0"
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        >
          <Popover.Dialog aria-label="Color settings">
            <ColorSettingsPanel />
          </Popover.Dialog>
        </Popover.Content>
      </Popover>
    </div>
  );
}

/**
 * Word Cloud Settings Submenu Component
 */
function WordCloudSettingsSubmenu({
  isOpen,
  onOpenChange,
  onMouseEnter,
  onMouseLeave,
}: SubmenuProps) {
  return (
    <div className="relative">
      <Popover isOpen={isOpen} onOpenChange={onOpenChange}>
        <Button
          variant="ghost"
          className="w-full justify-between text-left h-auto p-2"
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        >
          <FaChevronLeft className="w-3 h-3" />
          <span>Word Cloud</span>
          <FaCloud className="w-4 h-4" />
        </Button>
        <Popover.Content
          placement="left top"
          offset={5}
          className="p-0"
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        >
          <Popover.Dialog aria-label="Word cloud settings">
            <WordCloudSettingsPanel />
          </Popover.Dialog>
        </Popover.Content>
      </Popover>
    </div>
  );
}

/**
 * Debug Toggle Section Component
 */
function DebugToggleSection() {
  const { isDebugEnabled, toggleDebug } = useDebug();

  return (
    <div className="px-2 py-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm">Debug Mode</span>
        </div>
        <Switch
          size="sm"
          isSelected={isDebugEnabled}
          onChange={toggleDebug}
          aria-label="Debug mode"
        >
          <Switch.Content>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
          </Switch.Content>
        </Switch>
      </div>
      <p className="text-xs text-foreground/60 mt-1">
        Show performance stats and hardware info
      </p>
    </div>
  );
}

/**
 * Hardware Info Section Component
 */
function HardwareInfoSection() {
  const { hardwareInfo, performanceSettings, isDetectionComplete } =
    useHardwarePerformance();

  return (
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
            <strong>Inferred Perf. Level:</strong> {performanceSettings.level}
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
  );
}

// ============================================================================
// Main Component
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
 *   ├── Color Settings
 *   └── Word Cloud Settings
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

  const { isDebugEnabled } = useDebug();

  // ========================================
  // State Management
  // ========================================

  const [isMainOpen, setIsMainOpen] = useState(false);
  const [isNetworkOpen, setIsNetworkOpen] = useState(false);
  const [isColorOpen, setIsColorOpen] = useState(false);
  const [isWordCloudOpen, setIsWordCloudOpen] = useState(false);

  // ========================================
  // Timeout Management
  // ========================================

  /**
   * Map of timeout references for delayed submenu closing
   * Each submenu has its own timeout to allow independent hover behavior
   */
  const timeoutRefs = useRef<Map<SubmenuKey, NodeJS.Timeout>>(new Map());

  const submenuSetters: Record<SubmenuKey, (open: boolean) => void> = {
    network: setIsNetworkOpen,
    color: setIsColorOpen,
    wordcloud: setIsWordCloudOpen,
  };

  // ========================================
  // Submenu Handlers
  // ========================================

  /**
   * Open a submenu on hover, cancelling any pending delayed close
   *
   * @param menuKey - The submenu being hovered
   */
  const handleSubmenuEnter = (menuKey: SubmenuKey) => {
    const existingTimeout = timeoutRefs.current.get(menuKey);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      timeoutRefs.current.delete(menuKey);
    }
    submenuSetters[menuKey](true);
  };

  /**
   * Close a submenu after a delay when the mouse leaves it
   *
   * @param menuKey - The submenu being left
   */
  const handleSubmenuLeave = (menuKey: SubmenuKey) => {
    const timeout = setTimeout(() => {
      submenuSetters[menuKey](false);
      timeoutRefs.current.delete(menuKey);
    }, SUBMENU_CLOSE_DELAY);
    timeoutRefs.current.set(menuKey, timeout);
  };

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
      setIsWordCloudOpen(false);

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
    const refs = timeoutRefs.current;
    return () => {
      refs.forEach((timeout) => clearTimeout(timeout));
      refs.clear();
    };
  }, []);

  // ========================================
  // Render
  // ========================================

  return (
    <div className="relative">
      {/* Main Settings Popover */}
      <Popover isOpen={isMainOpen} onOpenChange={handleMainOpenChange}>
        <Button
          isIconOnly
          variant="ghost"
          size="sm"
          className="text-foreground/70 hover:text-foreground transition-colors"
          aria-label="Settings"
        >
          <FaCog size={18} />
        </Button>

        <Popover.Content
          placement="bottom end"
          offset={10}
          className="p-2 min-w-[200px]"
        >
          <Popover.Dialog aria-label="Site settings" className="space-y-1">
            {/* Network Background Settings Submenu */}
            <NetworkSettingsSubmenu
              isOpen={isNetworkOpen}
              onOpenChange={setIsNetworkOpen}
              onMouseEnter={() => handleSubmenuEnter("network")}
              onMouseLeave={() => handleSubmenuLeave("network")}
            />

            {/* Word Cloud Settings Submenu */}
            <WordCloudSettingsSubmenu
              isOpen={isWordCloudOpen}
              onOpenChange={setIsWordCloudOpen}
              onMouseEnter={() => handleSubmenuEnter("wordcloud")}
              onMouseLeave={() => handleSubmenuLeave("wordcloud")}
            />

            {/* Color Settings Submenu */}
            <ColorSettingsSubmenu
              isOpen={isColorOpen}
              onOpenChange={setIsColorOpen}
              onMouseEnter={() => handleSubmenuEnter("color")}
              onMouseLeave={() => handleSubmenuLeave("color")}
            />

            {/* Debug Toggle Section */}
            <Separator className="my-2" />
            <DebugToggleSection />

            {/* Hardware Info Section - Only when debug is enabled */}
            {isDebugEnabled && (
              <>
                <Separator className="my-2" />
                <HardwareInfoSection />
              </>
            )}
          </Popover.Dialog>
        </Popover.Content>
      </Popover>
    </div>
  );
}
