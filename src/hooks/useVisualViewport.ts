/**
 * Tracks how much the on-screen (soft) keyboard occludes the bottom of the
 * layout viewport, so a bottom-pinned element can be lifted ABOVE it.
 *
 * Why this exists
 * ---------------
 * On a phone the soft keyboard covers the lower part of the screen. With
 * `interactive-widget=resizes-content` (set in index.html) compliant browsers
 * shrink the *layout* viewport when the keyboard opens, so a `position: fixed;
 * bottom: 0` element rides up on its own. But iOS Safari historically does NOT
 * resize the layout viewport for the keyboard — it only shrinks the *visual*
 * viewport. So a fixed-bottom element sits BEHIND the keyboard there. This hook
 * reads `window.visualViewport` and reports the occluded height as
 * `keyboardOffset`; the play bar applies it as `transform: translateY(-offset)`
 * — a compositor transform, never a layout reflow (the hard NO-FLICKER rule).
 *
 * The occluded height is:
 *     layoutBottom - visualBottom
 *   = window.innerHeight - (visualViewport.height + visualViewport.offsetTop)
 *
 * When the keyboard is closed this is ~0; when it opens it is roughly the
 * keyboard's height. We clamp tiny values to 0 (sub-pixel / address-bar jitter)
 * and ignore negative results.
 *
 * Smoothness guards
 * -----------------
 * - Feature-detected: if `visualViewport` is absent (older desktop browsers),
 *   the offset stays 0 and the bar behaves like a normal fixed-bottom element.
 * - rAF-throttled: viewport `resize`/`scroll` fire in bursts during a keyboard
 *   animation; we coalesce them into one update per frame.
 * - Loop-guarded: we only `setState` when the rounded offset actually changes,
 *   so an update can't feed back into another resize.
 */

import { useEffect, useState } from 'react';

/** Below this many px the offset reads as "keyboard closed" (jitter floor). */
const CLOSED_THRESHOLD_PX = 24;

export interface VisualViewportState {
  /**
   * Pixels the keyboard (and any visual-viewport scroll) occludes at the
   * bottom of the layout viewport. 0 when the keyboard is closed or the API
   * is unavailable. Use as `translateY(-keyboardOffset)` on a fixed-bottom el.
   */
  keyboardOffset: number;
  /** True once the offset clears the jitter floor — i.e. the keyboard is up. */
  keyboardOpen: boolean;
}

export function useVisualViewport(): VisualViewportState {
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return; // no support → offset stays 0, plain fixed-bottom behaviour

    let frame = 0;
    let lastOffset = 0;

    const measure = () => {
      frame = 0;
      // How much of the layout viewport the visual viewport no longer covers
      // at the bottom (keyboard + any upward visual-viewport scroll).
      const occluded = window.innerHeight - (vv.height + vv.offsetTop);
      const next = occluded > CLOSED_THRESHOLD_PX ? Math.round(occluded) : 0;
      if (next !== lastOffset) {
        lastOffset = next;
        setKeyboardOffset(next);
      }
    };

    const onChange = () => {
      // Coalesce bursts of resize/scroll during the keyboard animation into a
      // single measurement per frame — no thrash, no feedback loop.
      if (frame) return;
      frame = requestAnimationFrame(measure);
    };

    vv.addEventListener('resize', onChange);
    vv.addEventListener('scroll', onChange);
    measure(); // initial sync

    return () => {
      if (frame) cancelAnimationFrame(frame);
      vv.removeEventListener('resize', onChange);
      vv.removeEventListener('scroll', onChange);
    };
  }, []);

  return { keyboardOffset, keyboardOpen: keyboardOffset > 0 };
}
