/**
 * localStorage, made safe: on the server, and where storage is blocked or full, reads
 * return null and writes do nothing (with a warning, in development) rather than throwing.
 */
import { devLog } from "./devLog";

/** Every key the site stores. Never rename one: visitors' saved data lives under it. */
export const STORAGE_KEYS = {
  /** The custom primary colour and the theme generated from it */
  customTheme: "dimitri-portfolio-custom-theme",
  /** Network background and word cloud settings */
  settings: "dimitri-portfolio-settings",
  /** "Don't show this again" on the settings helper */
  helperOptedOut: "lesas-helper-opted-out",
  /** This browser's anonymous animal for live cursors */
  visitorAnimal: "lesas-visitor-animal",
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

/** The value saved under `key`, or null when there is none or it can't be read */
export function readJSON<T>(key: StorageKey): T | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem(key);
    return saved ? (JSON.parse(saved) as T) : null;
  } catch (error) {
    devLog.warn(`Failed to read "${key}" from localStorage:`, error);
    return null;
  }
}

/** Saves `value` under `key`; returns whether it was saved */
export function writeJSON(key: StorageKey, value: unknown): boolean {
  if (typeof window === "undefined") return false;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    devLog.warn(`Failed to save "${key}" to localStorage:`, error);
    return false;
  }
}

export function remove(key: StorageKey): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch {
    // Nothing saved that can be reached, so nothing to remove
  }
}
