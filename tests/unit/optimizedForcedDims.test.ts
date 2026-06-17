/**
 * ADR-11 (P2) — Optimized respects forced dimensions instead of canvasForCount.
 *
 * Optimized always built at canvasForCount(targetCount), ignoring a forced grid.
 * With pinnedWidth/pinnedHeight it builds on EXACTLY those dimensions — the
 * forced-dims contract (pin + report under-fill) outranks the canvas calibration.
 * A forced canvas does NOT grow. The auto path (no pinned dims) is unchanged: it
 * still sizes the canvas from the target count (the ADR-9 density win lives there).
 *
 * Deterministic seeds throughout — the optimized path is a pure function of config.
 */

import { describe, it, expect } from 'vitest';
import { createOptimizedPuzzleFromEntries } from '@logic/createPuzzle';
import { canvasForCount } from '@logic/gridRecommendation';
import type { WordCluePair, SkeletonResult } from '@logic/types';

function entries(words: string[]): WordCluePair[] {
  return words.map(word => ({ word, clue: `clue for ${word}` }));
}

/** Distinct words placed in a finished Optimized result (grid form). */
function placedWords(result: SkeletonResult): string[] {
  return result.slots
    .filter(s => s.word !== undefined)
    .map(s => s.word as string);
}

/** 40 common, crossing-friendly 4-8 letter words, best-first. */
const POOL_40 = [
  'planet', 'rocket', 'garden', 'silver', 'dragon', 'castle', 'forest', 'market',
  'island', 'window', 'bridge', 'candle', 'flower', 'letter', 'animal', 'number',
  'orange', 'purple', 'yellow', 'mother', 'father', 'sister', 'winter', 'summer',
  'spring', 'autumn', 'school', 'friend', 'people', 'travel', 'pencil', 'rabbit',
  'monkey', 'turtle', 'kettle', 'saddle', 'ribbon', 'velvet', 'meadow', 'harbor',
];

describe('createOptimizedPuzzleFromEntries — forced dimensions (P2)', () => {
  it('builds on a SMALL pinned canvas, not the larger canvasForCount(targetCount)', () => {
    // canvasForCount(13) is 14×14. A 9×9 forced canvas is strictly smaller, so a
    // result built on it CANNOT exceed 9 in either dimension. The auto path would
    // spread well past 9 — so this fails unless the pinned dims are honored.
    const t = 13;
    const auto = canvasForCount(t);
    const pinned = { width: 9, height: 9 };
    expect(pinned.width).toBeLessThan(auto.width); // pinned is genuinely smaller

    const result = createOptimizedPuzzleFromEntries({
      pool: entries(POOL_40),
      targetCount: t,
      qualityBias: 0.2,
      seed: 1234,
      pinnedWidth: pinned.width,
      pinnedHeight: pinned.height,
    });

    // The finished result is cropped to content, so it must fit INSIDE the forced
    // canvas — it can never be built on, and spread across, a bigger grid.
    expect(result.width).toBeLessThanOrEqual(pinned.width);
    expect(result.height).toBeLessThanOrEqual(pinned.height);
  });

  it('pinned dimensions produce a DIFFERENT result than the auto canvas', () => {
    // Same config, once auto and once pinned to a clearly different size. The
    // grids must differ — proof the pinned canvas actually drives the build
    // (pre-P2 code ignored pinned dims, so the two grids would be identical).
    const t = 13;
    const base = { pool: entries(POOL_40), targetCount: t, qualityBias: 0.2, seed: 1234 };
    const auto = createOptimizedPuzzleFromEntries(base);
    const pinned = createOptimizedPuzzleFromEntries({ ...base, pinnedWidth: 9, pinnedHeight: 9 });
    const differs =
      auto.width !== pinned.width ||
      auto.height !== pinned.height ||
      JSON.stringify(auto.grid) !== JSON.stringify(pinned.grid);
    expect(differs).toBe(true);
  });

  it('does NOT grow a forced canvas (stays within the pinned size)', () => {
    // A long-ish pool on a small forced grid: the result must stay within the
    // forced grid rather than growing past it (forced-dims contract: pin + report).
    const t = 8;
    const pinned = { width: 12, height: 12 };
    const result = createOptimizedPuzzleFromEntries({
      pool: entries(POOL_40),
      targetCount: t,
      qualityBias: 0.2,
      seed: 1234,
      pinnedWidth: pinned.width,
      pinnedHeight: pinned.height,
    });
    // Cropped result can only be <= the forced canvas; it must never grow beyond it.
    expect(result.width).toBeLessThanOrEqual(pinned.width);
    expect(result.height).toBeLessThanOrEqual(pinned.height);
  });

  it('auto path (no pinned dims) still uses canvasForCount — capped subset packs densely', () => {
    // Regression guard: omitting pinned dims must not change the auto sizing.
    const t = 13;
    const auto = canvasForCount(t); // 14×14
    const result = createOptimizedPuzzleFromEntries({
      pool: entries(POOL_40),
      targetCount: t,
      qualityBias: 0.2,
      seed: 1234,
    });
    // Cropped, so dimensions are <= the auto canvas (never larger on the auto path
    // unless a must word forced growth — there are none here).
    expect(result.width).toBeLessThanOrEqual(auto.width);
    expect(result.height).toBeLessThanOrEqual(auto.height);
  });

  it('rectangular pinned dimensions are honored (non-square forced grid)', () => {
    // Force Dimensions can pin a non-square grid; the build must respect both
    // dimensions independently (the auto path is always square).
    const result = createOptimizedPuzzleFromEntries({
      pool: entries(POOL_40),
      targetCount: 13,
      qualityBias: 0.2,
      seed: 1234,
      pinnedWidth: 18,
      pinnedHeight: 10,
    });
    expect(result.width).toBeLessThanOrEqual(18);
    expect(result.height).toBeLessThanOrEqual(10);
  });

  it('is deterministic with pinned dimensions', () => {
    const cfg = {
      pool: entries(POOL_40),
      targetCount: 13,
      qualityBias: 0.2,
      seed: 321,
      pinnedWidth: 16,
      pinnedHeight: 16,
    };
    const a = createOptimizedPuzzleFromEntries(cfg);
    const b = createOptimizedPuzzleFromEntries(cfg);
    expect(a.grid).toEqual(b.grid);
    expect(placedWords(a)).toEqual(placedWords(b));
  });
});
