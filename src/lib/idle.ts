interface WhenIdleOptions {
  /** Run by then (ms) even if the browser never goes idle */
  timeout: number;
  /** Delay (ms) in browsers without requestIdleCallback */
  fallbackMs: number;
}

/**
 * Runs `callback` once the browser is idle, or after `fallbackMs` where
 * requestIdleCallback isn't supported. Browser only.
 *
 * @returns A function that cancels the pending callback
 */
export function whenIdle(callback: () => void, { timeout, fallbackMs }: WhenIdleOptions): () => void {
  // Typed as always present, but not every browser has it
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(() => callback(), { timeout });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(callback, fallbackMs);
  return () => window.clearTimeout(id);
}
