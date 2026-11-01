"use client";

import { Button, type ButtonProps } from "@heroui/react";

const ICON_BUTTON = "text-foreground/70 hover:text-foreground transition-colors";

type NavIconButtonProps = Omit<ButtonProps, "isIconOnly" | "className"> & {
  className?: string;
};

/** A small icon-only button for the navigation bar (theme toggle, mobile menu toggle) */
export function NavIconButton({ className, ...props }: NavIconButtonProps) {
  return (
    <Button
      isIconOnly
      variant="ghost"
      size="sm"
      {...props}
      className={className ? `${className} ${ICON_BUTTON}` : ICON_BUTTON}
    />
  );
}
