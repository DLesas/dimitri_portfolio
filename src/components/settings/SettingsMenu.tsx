"use client";

import { useState, useRef, useEffect, type ComponentType } from "react";
import dynamic from "next/dynamic";
import { Popover, Button, Switch, Separator } from "@heroui/react";
import type { IconType } from "react-icons";
import {
  FaCog,
  FaDesktop,
  FaPalette,
  FaChevronLeft,
  FaCloud,
} from "react-icons/fa";
import { useDebug } from "@/contexts/DebugContext";
import { useHardwarePerformance } from "@/contexts/HardwarePerformanceContext";

// ============================================================================
// Lazy Panels
// ============================================================================

/**
 * The panels (sliders, colour picker) load when the menu is first opened rather
 * than with every page; opening the menu starts the download, so a submenu is
 * normally ready by the time it is hovered
 */
const loadPanels = () => import("./panels");
const PanelPlaceholder = () => <div className="w-80 h-40" />;
const NetworkBackgroundSettings = dynamic(
  () => loadPanels().then((m) => m.NetworkBackgroundSettings),
  { ssr: false, loading: PanelPlaceholder }
);
const ColorSettingsPanel = dynamic(
  () => loadPanels().then((m) => m.ColorSettingsPanel),
  { ssr: false, loading: PanelPlaceholder }
);
const WordCloudSettingsPanel = dynamic(
  () => loadPanels().then((m) => m.WordCloudSettingsPanel),
  { ssr: false, loading: PanelPlaceholder }
);

// ============================================================================
// Submenus
// ============================================================================

interface SubmenuConfig {
  key: string;
  /** The menu item's text */
  label: string;
  icon: IconType;
  /** The panel's accessible name */
  panelLabel: string;
  Panel: ComponentType;
}

/** The submenus, in menu order */
const SUBMENUS = [
  {
    key: "network",
    label: "Network Background",
    icon: FaDesktop,
    panelLabel: "Network background settings",
    Panel: NetworkBackgroundSettings,
  },
  {
    key: "wordcloud",
    label: "Word Cloud",
    icon: FaCloud,
    panelLabel: "Word cloud settings",
    Panel: WordCloudSettingsPanel,
  },
  {
    key: "color",
    label: "Color Settings",
    icon: FaPalette,
    panelLabel: "Color settings",
    Panel: ColorSettingsPanel,
  },
] as const satisfies readonly SubmenuConfig[];

type SubmenuKey = (typeof SUBMENUS)[number]["key"];

/**
 * Whether each submenu is open. Kept apart: one closing after its delay can still be
 * open while the next one opens.
 */
type OpenSubmenus = Record<SubmenuKey, boolean>;

const ALL_CLOSED: OpenSubmenus = { network: false, wordcloud: false, color: false };

/**
 * Delay before closing submenus when mouse leaves (in milliseconds)
 * This prevents accidental closures when user briefly moves outside the menu
 */
const SUBMENU_CLOSE_DELAY = 250;

interface SettingsSubmenuProps {
  submenu: SubmenuConfig;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

/**
 * A menu item that opens its panel to the left, on hover or press
 */
function SettingsSubmenu({
  submenu: { label, icon: Icon, panelLabel, Panel },
  isOpen,
  onOpenChange,
  onMouseEnter,
  onMouseLeave,
}: SettingsSubmenuProps) {
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
          <span>{label}</span>
          <Icon className="w-4 h-4" />
        </Button>
        {/* Non-modal: a modal popover makes everything outside it inert, including the
            parent menu, so the hovered item would lose hover and the submenu would
            close and reopen in a loop */}
        <Popover.Content
          isNonModal
          placement="left top"
          offset={5}
          className="p-0"
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        >
          <Popover.Dialog aria-label={panelLabel}>
            <Panel />
          </Popover.Dialog>
        </Popover.Content>
      </Popover>
    </div>
  );
}

// ============================================================================
// Debug Sections
// ============================================================================

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
  const { hardwareInfo, performanceLevel, isDetectionComplete } =
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
            <strong>Inferred Perf. Level:</strong> {performanceLevel}
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
 *   ├── Word Cloud Settings
 *   └── Color Settings
 *
 * Hover Behavior:
 * Submenus open immediately on hover and close after a delay when the mouse
 * leaves. This provides a smooth user experience while preventing accidental
 * menu dismissals during navigation.
 */
export function SettingsMenu() {
  const { isDebugEnabled } = useDebug();

  const [isMainOpen, setIsMainOpen] = useState(false);
  const [openSubmenus, setOpenSubmenus] = useState<OpenSubmenus>(ALL_CLOSED);

  const setSubmenuOpen = (key: SubmenuKey, open: boolean) =>
    setOpenSubmenus((prev) => (prev[key] === open ? prev : { ...prev, [key]: open }));

  /**
   * Timeouts for delayed submenu closing: each submenu has its own, so they open and
   * close independently
   */
  const timeoutRefs = useRef<Map<SubmenuKey, NodeJS.Timeout>>(new Map());

  /** Open a submenu on hover, cancelling any pending delayed close */
  const handleSubmenuEnter = (key: SubmenuKey) => {
    const existingTimeout = timeoutRefs.current.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      timeoutRefs.current.delete(key);
    }
    setSubmenuOpen(key, true);
  };

  /** Close a submenu after a delay when the mouse leaves it */
  const handleSubmenuLeave = (key: SubmenuKey) => {
    const timeout = setTimeout(() => {
      setSubmenuOpen(key, false);
      timeoutRefs.current.delete(key);
    }, SUBMENU_CLOSE_DELAY);
    timeoutRefs.current.set(key, timeout);
  };

  /**
   * Handle main menu open/close state changes
   * Ensures all submenus are closed when main menu closes
   */
  const handleMainOpenChange = (open: boolean) => {
    setIsMainOpen(open);
    if (open) void loadPanels();
    if (!open) {
      setOpenSubmenus(ALL_CLOSED);

      // Clear all pending timeouts
      timeoutRefs.current.forEach((timeout) => clearTimeout(timeout));
      timeoutRefs.current.clear();
    }
  };

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
            {SUBMENUS.map((submenu) => (
              <SettingsSubmenu
                key={submenu.key}
                submenu={submenu}
                isOpen={openSubmenus[submenu.key]}
                onOpenChange={(open) => setSubmenuOpen(submenu.key, open)}
                onMouseEnter={() => handleSubmenuEnter(submenu.key)}
                onMouseLeave={() => handleSubmenuLeave(submenu.key)}
              />
            ))}

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
