import { useCallback, useEffect, useEffectEvent, useRef } from "react";
import { useDebouncedValue } from "./useDebouncedValue";

/**
 * A setting edited with a control such as a slider: each change shows at once and is
 * committed once changes stop for `delay` ms.
 *
 * Reset safety: a change carries the reset generation it was made in, and is only
 * committed if no reset has happened since, so a reset during the debounce wins. (A
 * reset that changes the value also cancels the pending change outright.)
 *
 * @param value - The setting's current value
 * @param commit - Saves a new value
 * @param resetGeneration - Goes up on every reset
 * @param delay - Debounce delay in milliseconds
 * @returns The value to show, and the function to call on each change
 *
 * @example
 * ```tsx
 * const [shown, change] = useDebouncedSetting(value, onCommit, resetGeneration, 300);
 * <Slider value={shown} onChange={change} />
 * ```
 */
export function useDebouncedSetting<T>(
  value: T,
  commit: (value: T) => void,
  resetGeneration: number,
  delay: number = 300
) {
  const { localValue, debouncedValue, setLocalValue } = useDebouncedValue(value, delay);

  /** The reset generation the last change was made in */
  const changeGeneration = useRef(resetGeneration);
  const onCommit = useEffectEvent(commit);

  useEffect(() => {
    if (debouncedValue !== value && changeGeneration.current === resetGeneration) {
      onCommit(debouncedValue);
    }
  }, [debouncedValue, value, resetGeneration]);

  const change = useCallback(
    (next: T) => {
      changeGeneration.current = resetGeneration;
      setLocalValue(next);
    },
    [resetGeneration, setLocalValue]
  );

  return [localValue, change] as const;
}
