/**
 * Debounce a changing value.
 *
 * Returns the latest `value` only after it has stopped changing for `delayMs`.
 * Used to keep advisory, recompute-on-every-keystroke UI (like the live grid
 * size recommendation) from thrashing while the user is mid-edit: the inputs
 * stay instant, but the displayed result settles once typing pauses.
 *
 * Pure UI timing — no storage, no network. The returned value is always one
 * the caller passed in; debouncing changes *when* it surfaces, never *what*.
 */

import { useEffect, useState } from 'react';

export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const handle = setTimeout(() => setSettled(value), delayMs);
    return () => clearTimeout(handle);
  }, [value, delayMs]);

  return settled;
}
