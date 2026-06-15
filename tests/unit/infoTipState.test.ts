import { beforeEach, describe, expect, it } from 'vitest';
import {
  infoTipAria,
  nextInfoTipId,
  resetInfoTipIds,
  openOnReveal,
  toggleOnPress,
  closeOnDismiss,
} from '../../src/components/ui/infoTipState';

/**
 * The InfoTip's behavior lives in pure functions (infoTipState) so it can be
 * tested without a DOM. These cover the open/close contract the React shell
 * wires to events, plus the aria attributes that make the tip accessible.
 */
describe('infoTipState', () => {
  beforeEach(() => {
    resetInfoTipIds();
  });

  describe('open / close transitions', () => {
    it('opens on hover or focus (reveal)', () => {
      // Reveal always opens, regardless of prior state.
      expect(openOnReveal()).toBe(true);
    });

    it('toggles on click/tap', () => {
      // A tap opens a closed tip and closes an open one (the touch path).
      expect(toggleOnPress(false)).toBe(true);
      expect(toggleOnPress(true)).toBe(false);
    });

    it('closes on Escape, blur, leave, or outside click (dismiss)', () => {
      // Every dismissal route collapses to the same closed state.
      expect(closeOnDismiss()).toBe(false);
    });
  });

  describe('aria wiring', () => {
    it('marks the trigger as a button labeled "More info"', () => {
      const { trigger } = infoTipAria('infotip-1', false);
      expect(trigger.type).toBe('button');
      expect(trigger['aria-label']).toBe('More info');
    });

    it('describes the trigger by the popover id only while open', () => {
      const id = 'infotip-1';

      const closed = infoTipAria(id, false);
      expect(closed.trigger['aria-expanded']).toBe(false);
      // No description advertised while the popover is absent from the DOM.
      expect(closed.trigger['aria-describedby']).toBeUndefined();

      const open = infoTipAria(id, true);
      expect(open.trigger['aria-expanded']).toBe(true);
      expect(open.trigger['aria-describedby']).toBe(id);
    });

    it('gives the popover a tooltip role and the matching id', () => {
      const { popover } = infoTipAria('infotip-7', true);
      expect(popover.role).toBe('tooltip');
      expect(popover.id).toBe('infotip-7');
    });
  });

  describe('instance ids', () => {
    it('hands out unique ids so two tips never collide', () => {
      const a = nextInfoTipId();
      const b = nextInfoTipId();
      expect(a).not.toBe(b);
      expect(a).toBe('infotip-1');
      expect(b).toBe('infotip-2');
    });
  });
});
