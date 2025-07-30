"use client";
import { ReactNode, useEffect, useState } from "react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  Checkbox,
} from "@heroui/react";
import { motion } from "framer-motion";

interface Props {
  /** How long (ms) the helper should stay visible */
  duration?: number;
  /** The trigger element that the popover should point to */
  children: ReactNode;
}

/**
 * First-time helper that auto-dismisses after `duration` ms, or when user opts out.
 *
 * To reset for testing: run `resetHelperPopover()` in browser console and refresh the page
 */
export default function HelperPopover({ duration = 6000, children }: Props) {
  const [open, setOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  // Check if user has opted out
  useEffect(() => {
    const hasOptedOut =
      localStorage.getItem("lesas-helper-opted-out") === "true";

    if (!hasOptedOut) {
      setOpen(true);
    }
  }, []);

  // Auto-close timer
  useEffect(() => {
    if (!open) return;
    const timeoutId = setTimeout(() => {
      setOpen(false);
    }, duration);
    return () => clearTimeout(timeoutId);
  }, [open, duration]);

  // const _handleClose = () => {
  //   if (dontShowAgain) {
  //     localStorage.setItem("lesas-helper-opted-out", "true");
  //   }
  //   setOpen(false);
  // };

  // const _handleDismiss = () => {
  //   setOpen(false);
  // };

  return (
    <Popover
      isOpen={open}
      placement="bottom"
      showArrow={true}
      onOpenChange={setOpen}
      offset={20}
    >
      <PopoverTrigger>{children}</PopoverTrigger>
      <PopoverContent className="max-w-xs">
        <div className="p-4 flex flex-col gap-4">
          <p className="mb-3 text-sm">
            Here you can edit this entire website (3D animations, colors, etc.)
            to your liking!
          </p>

          {/* Opt-out controls */}
          <div className="space-y-2">
            <Checkbox
              isSelected={dontShowAgain}
              onValueChange={setDontShowAgain}
              size="sm"
            >
              <span className="text-xs text-foreground-600">
                Don&apos;t show this again
              </span>
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
        </div>
      </PopoverContent>
    </Popover>
  );
}
