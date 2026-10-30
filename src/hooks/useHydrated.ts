import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * Whether the component is rendering on the client after hydration
 *
 * Returns false on the server and during the hydration render, then true, so
 * client-only UI (e.g. anything depending on the resolved theme) doesn't cause
 * a hydration mismatch.
 */
export function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}
