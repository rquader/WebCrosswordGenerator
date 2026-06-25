/**
 * Subscribe to a CSS media query and re-render when it flips. Used to gate the
 * mobile/tablet play UI (the keyboard-aware play bar + tools sheet) so it never
 * mounts on desktop — desktop play keeps today's model untouched.
 *
 * SSR-safe-ish (this app is client-only, but the guard avoids a crash if a
 * query runs before `window` exists). The listener is the modern
 * `addEventListener('change')` form.
 */

import { useEffect, useState } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange(); // sync in case it changed between render and effect
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/**
 * The play redesign's breakpoints, in one place so the bar, the sheet, and the
 * tablet toolbar all agree.
 *
 * - phone/tablet "compact play" UI shows below the desktop `lg` breakpoint
 *   (1024px) — matching the existing `lg:` desktop/mobile split in PlayTab.
 * - tablet refinements (visible toolbar, clue peek) kick in at `md` (768px).
 */
export const PLAY_COMPACT_QUERY = '(max-width: 1023px)';
export const PLAY_TABLET_QUERY = '(min-width: 768px) and (max-width: 1023px)';
