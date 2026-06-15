/**
 * InfoTip state — the small, DOM-free brain behind the InfoTip component.
 *
 * Kept as pure functions so the open/close behavior can be unit-tested in the
 * node test environment (like the rest of `tests/unit`), without a browser.
 * The React shell in InfoTip.tsx wires these transitions to real events
 * (hover, focus, click, Escape, outside-click).
 *
 * The interaction contract, encoded once here:
 *  - Hover and keyboard focus OPEN the tip (pointer/focus intent).
 *  - A click/tap TOGGLES it (the touch affordance — no hover on touch).
 *  - Pointer-leave, blur, Escape, and an outside click all CLOSE it.
 * It never opens on its own — every transition starts from a user action.
 */

/** Where the popover sits relative to the trigger. */
export type InfoTipPlacement = 'top' | 'bottom';

/**
 * A stable id for one InfoTip instance, used to wire the trigger's
 * `aria-describedby` to the popover's `id`. Module-level counter so two tips on
 * the same screen never collide; deterministic enough to assert in tests.
 */
let tipCounter = 0;

export function nextInfoTipId(): string {
  tipCounter += 1;
  return `infotip-${tipCounter}`;
}

/** Reset the id counter — test-only, keeps id assertions independent. */
export function resetInfoTipIds(): void {
  tipCounter = 0;
}

/**
 * The accessibility attributes for one tip, derived from its id and open state.
 * The trigger only advertises `aria-describedby` while the popover is actually
 * in the DOM (it's conditionally rendered), so screen readers don't point at a
 * description that isn't there.
 */
export function infoTipAria(id: string, isOpen: boolean) {
  return {
    trigger: {
      type: 'button' as const,
      'aria-label': 'More info',
      'aria-expanded': isOpen,
      'aria-describedby': isOpen ? id : undefined,
    },
    popover: {
      id,
      role: 'tooltip' as const,
    },
  };
}

/** Hover or keyboard focus → always open. */
export function openOnReveal(): boolean {
  return true;
}

/** Click/tap → flip current state (the touch-friendly toggle). */
export function toggleOnPress(isOpen: boolean): boolean {
  return !isOpen;
}

/** Pointer-leave, blur, Escape, outside-click → always close. */
export function closeOnDismiss(): boolean {
  return false;
}
