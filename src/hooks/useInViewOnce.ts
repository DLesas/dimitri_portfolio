import { useEffect, useState, type RefObject } from "react";

/**
 * Whether the element has come within `rootMargin` of the viewport. Stays true once it has.
 */
export function useInViewOnce(
  ref: RefObject<Element | null>,
  rootMargin = "0px"
) {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setInView(true);
      },
      { rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, rootMargin, inView]);

  return inView;
}
