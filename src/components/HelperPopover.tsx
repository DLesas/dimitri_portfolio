"use client";
import { RefObject, useEffect, useState, useSyncExternalStore } from "react";
import { Popover, Checkbox, popoverVariants } from "@heroui/react";
import { motion } from "framer-motion";

const OPT_OUT_KEY = "lesas-helper-opted-out";

// Read once per page load, so ticking "Don't show this again" applies to the next
// visit rather than closing the helper that is already showing
let optedOutAtLoad: boolean | undefined;
const readOptedOut = () =>
  (optedOutAtLoad ??= localStorage.getItem(OPT_OUT_KEY) === "true");
const subscribe = () => () => {};

// Standalone popover (no trigger of its own), so HeroUI's slot classes are applied directly
const popoverStyles = popoverVariants();

interface Props {
  /** How long (ms) the helper should stay visible */
  duration?: number;
  /** The element the popover points to (positioned against it, without becoming its trigger) */
  triggerRef: RefObject<HTMLElement | null>;
}

/**
 * First-time helper that auto-dismisses after `duration` ms, or when user opts out.
 *
 * To reset for testing: run `localStorage.removeItem("lesas-helper-opted-out")` in the
 * browser console and refresh the page
 */
export default function HelperPopover({ duration = 6000, triggerRef }: Props) {
  // Treated as opted out on the server, so the helper only ever appears client-side
  const hasOptedOut = useSyncExternalStore(subscribe, readOptedOut, () => true);
  const [dismissed, setDismissed] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const open = !hasOptedOut && !dismissed;

  // Auto-close timer
  useEffect(() => {
    if (!open) return;
    const timeoutId = setTimeout(() => {
      setDismissed(true);
    }, duration);
    return () => clearTimeout(timeoutId);
  }, [open, duration]);

  return (
    <Popover.Content
      triggerRef={triggerRef}
      isOpen={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) setDismissed(true);
      }}
      placement="bottom"
      offset={20}
      className={popoverStyles.base({ className: "max-w-xs" })}
    >
      <Popover.Dialog
        aria-label="Site settings tip"
        className={popoverStyles.dialog({ className: "p-4 flex flex-col gap-4" })}
      >
        <Popover.Arrow />
        <p className="mb-3 text-sm">
          Here you can edit this entire website (3D animations, colors, etc.)
          to your liking!
        </p>

        {/* Opt-out controls */}
        <div className="space-y-2">
          <Checkbox
            isSelected={dontShowAgain}
            onChange={(selected) => {
              setDontShowAgain(selected);
              if (selected) {
                localStorage.setItem(OPT_OUT_KEY, "true");
              } else {
                localStorage.removeItem(OPT_OUT_KEY);
              }
            }}
          >
            <Checkbox.Content>
              <Checkbox.Control>
                <Checkbox.Indicator />
              </Checkbox.Control>
              <span className="text-xs text-foreground-600">
                Don&apos;t show this again
              </span>
            </Checkbox.Content>
          </Checkbox>
        </div>
        {/* Progress bar */}
        <div className="h-1 w-full rounded-full bg-default-200 overflow-hidden mb-3">
          <motion.div
            className="h-full bg-primary-500"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ ease: "linear", duration: duration / 1000 }}
          />
        </div>
      </Popover.Dialog>
    </Popover.Content>
  );
}
