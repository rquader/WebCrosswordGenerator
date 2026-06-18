/**
 * Auto-grow regression tests (part 3 of the placement suite).
 *
 * Undersized requests grow until every word fits; right-sized requests don't
 * grow; growth is deterministic and can be opted out of.
 *
 * Split out from the rest of the placement suite (structural validity in
 * `placementGuarantee.test.ts`, the placement guarantee in
 * `placementContract.test.ts`) so each heavy block runs on its own Vitest
 * worker — under the deeper best-of-N re-seeding a single worker carrying
 * several heavy seed loops could approach Vitest's 60s worker-RPC ceiling.
 * Shared fixtures live in `placementGuaranteeFixtures.ts`.
 */

import { describe, it, expect } from 'vitest';
import { createSkeletonFromEntries } from '@logic/createPuzzle';
import { HISTORY_32, asEntries } from './placementGuaranteeFixtures';

describe('auto-grow on placement failure', () => {
  it('grows a deliberately undersized grid until all words place', () => {
    const skeleton = createSkeletonFromEntries({
      entries: asEntries(HISTORY_32),
      width: 15,
      height: 15,
      seed: 7,
    });
    expect(skeleton.failures).toEqual([]);
    expect(skeleton.mustPlacedCount).toBe(HISTORY_32.length);
    expect(skeleton.width).toBeGreaterThan(15);
    expect(skeleton.grewFrom).toEqual({ width: 15, height: 15 });
  }, 30000);

  it('reports no grewFrom when the requested size already fits', () => {
    const skeleton = createSkeletonFromEntries({
      entries: asEntries(['plant', 'leaf']),
      width: 10,
      height: 10,
      seed: 42,
    });
    expect(skeleton.failures).toEqual([]);
    expect(skeleton.grewFrom).toBeUndefined();
    expect(skeleton.width).toBe(10);
  });

  it('honors growToFit: false (old behavior — failures reported)', () => {
    const skeleton = createSkeletonFromEntries({
      entries: asEntries(HISTORY_32),
      width: 15,
      height: 15,
      seed: 7,
      growToFit: false,
    });
    expect(skeleton.width).toBe(15);
    expect(skeleton.failures.length).toBeGreaterThan(0);
  });

  it('stays deterministic across runs (same config, same growth result)', () => {
    const make = () => createSkeletonFromEntries({
      entries: asEntries(HISTORY_32),
      width: 15,
      height: 15,
      seed: 99,
    });
    const a = make();
    const b = make();
    expect(a.grid).toEqual(b.grid);
    expect(a.width).toBe(b.width);
    expect(a.slots.length).toBe(b.slots.length);
  }, 30000);
});
