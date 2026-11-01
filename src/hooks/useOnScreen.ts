import { useEffect, useState, type RefObject } from "react";

interface OnScreenOptions {
  /** How far outside the viewport still counts as on screen, e.g. "50px" */
  rootMargin?: string;
  /** Share of the element that must be within it (0: any part) */
  threshold?: number;
}

/**
 * Whether the element is on screen (within `rootMargin` of the viewport) and the tab is
 * in front. True until the first observation says otherwise.
 */
export function useOnScreen(
  ref: RefObject<Element | null>,
  { rootMargin = "0px", threshold = 0 }: OnScreenOptions = {}
): boolean {
  const [inView, setInView] = useState(true);
  const [tabVisible, setTabVisible] = useState(true);

  useEffect(() => {
    const el = ref.current;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      rootMargin,
      threshold,
    });
    if (el) observer.observe(el);
    const onVisibilityChange = () => setTabVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [ref, rootMargin, threshold]);

  return inView && tabVisible;
}
