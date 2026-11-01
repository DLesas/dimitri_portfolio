import type { ComponentPropsWithoutRef } from "react";

const SHELL =
  "flex items-center justify-center enter enter-duration-500 [--enter-y:20px] min-h-[calc(100vh-var(--nav-height,102px)-10px)]";

/**
 * A page centred in the space below the navigation bar (less 10px; the bar's height is
 * kept in --nav-height by NavigationSpaceContext), fading and rising in
 */
export function PageShell({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return <div {...props} className={className ? `${className} ${SHELL}` : SHELL} />;
}
