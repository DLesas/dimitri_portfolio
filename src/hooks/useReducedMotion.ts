import { useMediaQuery } from "./useMediaQuery";

/**
 * Whether the visitor asks for reduced motion. The real value from the first client
 * render (false on the server and while hydrating), and it follows changes.
 */
export function useReducedMotion() {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}
