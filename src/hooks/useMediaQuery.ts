import { useCallback, useSyncExternalStore } from "react";

/**
 * Whether the page matches the media `query`. The real value from the first client render
 * (false on the server and while hydrating), and it follows changes.
 */
export function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(subscribe, () => matchMedia(query).matches, () => false);
}
