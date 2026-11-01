import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

let mediaQuery: MediaQueryList | undefined;
const getMediaQuery = () => (mediaQuery ??= window.matchMedia(QUERY));

function subscribe(onChange: () => void) {
  const mq = getMediaQuery();
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

const getSnapshot = () => getMediaQuery().matches;
const getServerSnapshot = () => false;

/**
 * Whether the visitor asks for reduced motion. The real value from the first client
 * render (false on the server and while hydrating), and it follows changes.
 */
export function useReducedMotion() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
