import { useState, useEffect, useRef } from "react";

/**
 * Custom hook for debouncing value changes with configurable delay
 *
 * This hook is particularly useful for settings that need to update frequently
 * during user interaction but should only persist/trigger expensive operations
 * after the user stops changing them. It also handles external value changes
 * (like resets) by immediately synchronizing without debouncing.
 *
 * Features:
 * - Debounced updates with configurable delay
 * - Immediate synchronization on external value changes
 * - Proper cleanup of pending timeouts
 * - Stale update prevention
 *
 * @param value - The current value to debounce (from external source)
 * @param delay - Debounce delay in milliseconds (default: 300ms)
 * @returns Object containing the debounced value, local display value, and setter
 *
 * @example
 * ```tsx
 * const { localValue, debouncedValue, setLocalValue } = useDebouncedValue(
 *   externalValue,
 *   500
 * );
 *
 * // Use localValue for immediate UI updates
 * // Use debouncedValue for actual operations
 * // Use setLocalValue for user interactions
 * ```
 */
export function useDebouncedValue<T>(value: T, delay: number = 300) {
  // ========================================
  // State Management
  // ========================================

  const [localValue, setLocalValue] = useState(value);
  const [debouncedValue, setDebouncedValue] = useState(value);

  // ========================================
  // Refs for Timeout Management
  // ========================================

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastExternalValue = useRef(value);

  // ========================================
  // External Value Change Effect
  // ========================================

  /**
   * Handle external value changes (like resets)
   *
   * When the external value changes, we immediately update both local and
   * debounced values and clear any pending debounce timeout. This ensures
   * that external changes (like reset operations) take effect immediately
   * and don't get overridden by pending debounced updates.
   */
  useEffect(() => {
    if (value !== lastExternalValue.current) {
      // Clear pending debounce to prevent stale updates
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      // Immediately sync to external value
      setLocalValue(value);
      setDebouncedValue(value);
      lastExternalValue.current = value;
    }
  }, [value, localValue]);

  // ========================================
  // Debounced Update Effect
  // ========================================

  /**
   * Handle debounced updates of local value changes
   *
   * This effect creates a debounced update when the local value changes
   * due to user interaction. It only creates a timeout if the local value
   * differs from the last external value, preventing unnecessary debounced
   * updates when values were set externally.
   */
  useEffect(() => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Only set timeout if localValue differs from last external value
    // This prevents debounced updates when value was set externally
    if (localValue !== lastExternalValue.current) {
      timeoutRef.current = setTimeout(() => {
        setDebouncedValue(localValue);
        timeoutRef.current = null;
      }, delay);
    }

    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [localValue, delay]);

  // ========================================
  // Return API
  // ========================================

  return {
    /**
     * The current local value (for immediate UI updates)
     */
    localValue,

    /**
     * The debounced value (for actual operations/persistence)
     */
    debouncedValue,

    /**
     * Function to update the local value (for user interactions)
     */
    setLocalValue,
  };
}
