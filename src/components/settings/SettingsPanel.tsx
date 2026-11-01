"use client";

import type { ReactNode } from "react";
import { Button } from "@heroui/react";
import { FaUndo } from "react-icons/fa";

interface SettingsPanelProps {
  /** Panel title */
  title: string;
  /** Icon shown before the title */
  icon?: ReactNode;
  /** Puts the panel's settings back to their defaults */
  onReset: () => void;
  /** The Reset button's accessible name */
  resetLabel: string;
  /** Whether Reset is unavailable */
  resetDisabled?: boolean;
  /** Spacing classes for the scrolling body */
  bodyClassName: string;
  children: ReactNode;
}

/**
 * A settings submenu's panel: a header with the title and a Reset button, over a body
 * that scrolls when it is taller than 80% of the screen
 */
export function SettingsPanel({
  title,
  icon,
  onReset,
  resetLabel,
  resetDisabled,
  bodyClassName,
  children,
}: SettingsPanelProps) {
  const heading = <h3 className="text-lg font-bold">{title}</h3>;

  return (
    <div className="w-80 max-h-[80vh] flex flex-col">
      {/* Header, fixed at the top */}
      <div className="flex items-center justify-between p-4 flex-shrink-0">
        {icon ? (
          <div className="flex items-center gap-2">
            {icon}
            {heading}
          </div>
        ) : (
          heading
        )}
        <Button
          size="sm"
          variant="tertiary"
          onPress={onReset}
          aria-label={resetLabel}
          isDisabled={resetDisabled}
        >
          <FaUndo className="w-3 h-3" />
          Reset
        </Button>
      </div>

      {/* Scrollable content */}
      <div className={`flex-1 overflow-y-auto p-4 ${bodyClassName}`}>{children}</div>
    </div>
  );
}
