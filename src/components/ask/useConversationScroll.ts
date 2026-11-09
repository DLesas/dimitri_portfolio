import { useEffect, useRef, type RefObject } from "react";

/** Phones get the palette full screen, its scrolling without the growing height (Tailwind's max-md) */
export const PHONE = "(max-width: 767px)";

/**
 * The conversation's height and scrolling. Away from phones the palette grows with the
 * conversation, smoothly, until it's as tall as it gets; then the conversation scrolls
 * inside it. Either way it follows the newest words, unless the visitor has scrolled up.
 */
export function useConversationScroll(
  { panel, head, scroller, log, foot }: Record<"panel" | "head" | "scroller" | "log" | "foot", RefObject<HTMLDivElement | null>>,
  open: boolean,
  reduced: boolean,
) {
  const controls = useRef({
    /** Settles the height and follows the newest words, at once: on opening */
    reopen() {},
    /** Follows the newest words again, wherever the visitor had scrolled: on asking */
    stick() {},
    /** Scrolls `row` into view */
    reveal(_row: HTMLElement) {},
  });
  const settings = useRef({ open, reduced });
  useEffect(() => {
    settings.current = { open, reduced };
  }, [open, reduced]);

  useEffect(() => {
    const [p, h, s, l, f] = [panel.current!, head.current!, scroller.current!, log.current!, foot.current!];
    let height: number | null = null;
    let lastTop = -1;
    let frame = 0;
    let frames = 0;
    let stick = true;

    // Closed, it changes at once (there's nothing to see)
    const setHeight = (instant: boolean) => {
      if (matchMedia(PHONE).matches) {
        s.style.height = "";
        height = null;
        return;
      }
      const most = parseFloat(getComputedStyle(p).maxHeight) - h.offsetHeight - f.offsetHeight - 2;
      const next = Math.max(0, Math.min(l.offsetHeight, most));
      if (next === height) return;
      height = next;
      if (instant) s.style.transition = "none";
      s.style.height = `${next}px`;
      if (instant) {
        void s.offsetHeight;
        s.style.transition = "";
      }
    };
    const bottom = () => Math.max(0, l.offsetHeight - (height ?? s.clientHeight));
    const setTop = (top: number) => {
      s.scrollTop = top;
      lastTop = s.scrollTop;
    };
    const stopGliding = () => {
      cancelAnimationFrame(frame);
      frame = 0;
    };
    // Eases towards the bottom, a step a frame
    const glide = () => {
      frame = 0;
      if (!stick) return;
      const distance = bottom() - s.scrollTop;
      if (Math.abs(distance) < 1 || ++frames > 90) return setTop(bottom());
      setTop(s.scrollTop + distance * 0.3);
      frame = requestAnimationFrame(glide);
    };
    const follow = (instant: boolean) => {
      if (!stick) return;
      if (instant || settings.current.reduced) {
        stopGliding();
        setTop(bottom());
      } else if (!frame) {
        frames = 0;
        frame = requestAnimationFrame(glide);
      }
    };

    const onChange = () => {
      const instant = !settings.current.open;
      setHeight(instant);
      follow(instant);
    };
    // Scrolling up (more than this script's own scrolling) stops the following, until back at the bottom
    const onScroll = () => {
      if (Math.abs(s.scrollTop - lastTop) <= 2) return;
      stick = bottom() - s.scrollTop < 40;
    };
    const onWheel = (event: WheelEvent) => {
      if (event.deltaY < 0 && s.scrollHeight > s.clientHeight + 1) stick = false;
    };
    const onResize = () => setHeight(true);
    const observer = new ResizeObserver(onChange);
    observer.observe(l);
    observer.observe(h);
    s.addEventListener("scroll", onScroll, { passive: true });
    s.addEventListener("wheel", onWheel, { passive: true });
    addEventListener("resize", onResize);

    controls.current = {
      reopen() {
        setHeight(true);
        stick = true;
        follow(true);
      },
      stick() {
        stick = true;
      },
      reveal(row) {
        const r = row.getBoundingClientRect();
        const box = s.getBoundingClientRect();
        const room = 12;
        const by = r.bottom > box.bottom - room ? r.bottom - box.bottom + room : r.top < box.top + room ? r.top - box.top - room : 0;
        if (!by) return;
        stopGliding();
        s.scrollBy({ top: by, behavior: settings.current.reduced ? "auto" : "smooth" });
      },
    };
    return () => {
      observer.disconnect();
      stopGliding();
      s.removeEventListener("scroll", onScroll);
      s.removeEventListener("wheel", onWheel);
      removeEventListener("resize", onResize);
    };
  }, [panel, head, scroller, log, foot]);

  return controls;
}
