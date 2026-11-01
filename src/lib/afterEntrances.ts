/**
 * Runs `callback` once the page's entrance animations (`enter` in globals.css) have
 * finished and the browser is idle, so heavy embeds (the Contact map) load after the
 * page's text rather than competing with it. Entrances that are paused until scrolled
 * into view are not waited for.
 *
 * @returns A function that cancels the pending callback
 */
export function afterEntrances(callback: () => void): () => void {
  let cancelled = false;
  let idle: number | undefined;

  const entrances = document
    .getAnimations()
    .filter(
      (animation) =>
        animation instanceof CSSAnimation &&
        animation.animationName.startsWith("enter") &&
        animation.playState === "running"
    );

  // allSettled: an animation is cancelled (rejecting `finished`) if its element goes away
  Promise.allSettled(entrances.map((animation) => animation.finished)).then(() => {
    if (cancelled) return;
    idle = window.requestIdleCallback
      ? window.requestIdleCallback(callback, { timeout: 1200 })
      : window.setTimeout(callback, 150);
  });

  return () => {
    cancelled = true;
    if (idle === undefined) return;
    if (window.cancelIdleCallback) window.cancelIdleCallback(idle);
    else window.clearTimeout(idle);
  };
}
