/**
 * Logging for development only. In a production build these do nothing, so the only
 * thing the site prints to a visitor's console is the easter egg (and what a visitor
 * asks for by turning on debug mode).
 */
const enabled = process.env.NODE_ENV !== "production";

export const devLog = {
  log: (...args: unknown[]) => {
    if (enabled) console.log(...args);
  },
  warn: (...args: unknown[]) => {
    if (enabled) console.warn(...args);
  },
  error: (...args: unknown[]) => {
    if (enabled) console.error(...args);
  },
};
