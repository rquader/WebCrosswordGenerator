/**
 * ADR-11 (P0) — Optimized selection caps at the target word count.
 *
 * Optimized used to feed the WHOLE pool to the packer and ship whatever
 * free-floating subset packed densest — the finished puzzle had an uncontrolled
 * word count (measured 6-7 for a target of 11). The contract is now: the puzzle
 * contains AT MOST `targetCount` words, aiming for exactly that.
 *
 *   - Manual/must words COUNT toward the target. Pool words used = max(0, T - mustCount).
 *   - If mustCount >= T, every must word still places (typed-words contract — never
 *     drop a typed word); the result may exceed T and that is acceptable.
 *   - The cap is opt-in: a config without `targetCount` keeps the legacy
 *     "feed-the-whole-pool" behavior byte-for-byte (covered by optimizedSelection
 *     + optimizedMustInclude regression tests).
 *
 * Caveat on "exactly T": the cap (<= T) is the HARD guarantee for any pool/seed.
 * Landing ON T also depends on the placer interlocking the whole target slice on
 * the (deliberately tight) count-sized canvas — reached on a crossing-friendly
 * pool/seed (the exactly-T tests pin such a seed) but not guaranteed for every
 * input; a hard pool/seed can land just under T, which is correct behavior.
 *
 * Deterministic seeds throughout — the optimized path is a pure function of config.
 */

import { describe, it, expect } from 'vitest';
import { selectOptimizedSubset } from '@logic/optimizedSelection';
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

/**
 * 40 common, crossing-friendly 4-8 letter words, best-first. Vowel-rich and
 * letter-overlapping so the intersection placer can interlock a target-sized
 * subset on the count-sized canvas — the realistic "Optimized pool" case.
 */
const POOL_40 = [
  'planet', 'rocket', 'garden', 'silver', 'dragon', 'castle', 'forest', 'market',
  'island', 'window', 'bridge', 'candle', 'flower', 'letter', 'animal', 'number',
  'orange', 'purple', 'yellow', 'mother', 'father', 'sister', 'winter', 'summer',
  'spring', 'autumn', 'school', 'friend', 'people', 'travel', 'pencil', 'rabbit',
  'monkey', 'turtle', 'kettle', 'saddle', 'ribbon', 'velvet', 'meadow', 'harbor',
];

describe('selectOptimizedSubset — target count cap (P0)', () => {
  it('NEVER returns more than targetCount words, for several targets', () => {
    for (const t of [8, 11, 14]) {
      const { width, height } = canvasForCount(t);
      const result = selectOptimizedSubset({
        pool: entries(POOL_40),
        width,
        height,
        seed: 1234,
        qualityBias: 0.2,
        targetCount: t,
      });
      expect(result.selectedCount).toBeLessThanOrEqual(t);
      expect(result.entries.length).toBeLessThanOrEqual(t);
      expect(result.selectedCount).toBe(result.entries.length);
    }
  });

  it('returns an empty result (never crashes) when the budget collapses to zero', () => {
    // Defensive: a non-positive targetCount (only reachable via corrupted
    // persisted state — the UI clamps word count to [1, 40]) drives the pool
    // budget to 0 with no fitting must word. The packer must not be fed an empty
    // word list (it would crash shifting it); the selector returns an empty puzzle.
    const { width, height } = canvasForCount(11);
    for (const targetCount of [0, -3]) {
      const result = selectOptimizedSubset({
        pool: entries(POOL_40),
        width,
        height,
        seed: 1234,
        qualityBias: 0.2,
        targetCount,
      });
      expect(result.entries).toHaveLength(0);
      expect(result.selectedCount).toBe(0);
    }
  });

  it('hits exactly targetCount on a crossing-friendly pool at the count-sized canvas', () => {
    // Seed chosen so the placer fully interlocks the target set on the (tight)
    // count-sized canvas for every target — see the caveat in the suite header:
    // exactly-T is the AIM and is reached on a friendly pool/seed, but the cap
    // (<= T) is the hard guarantee for any pool/seed.
    for (const t of [8, 11, 14]) {
      const { width, height } = canvasForCount(t);
      const result = selectOptimizedSubset({
        pool: entries(POOL_40),
        width,
        height,
        seed: 21,
        qualityBias: 0.2,
        targetCount: t,
      });
      expect(result.selectedCount).toBe(t);
    }
  });

  it('counts must words toward the target (pool fills the rest, capped)', () => {
    const must = entries(['cat', 'dog', 'sun']); // 3 must words
    const t = 11;
    const { width, height } = canvasForCount(t);
    const result = selectOptimizedSubset({
      pool: entries(POOL_40),
      mustInclude: must,
      width,
      height,
      seed: 1234,
      qualityBias: 0.2,
      targetCount: t,
    });
    // At most T total, and every must word present (guaranteed).
    expect(result.selectedCount).toBeLessThanOrEqual(t);
    const placed = new Set(result.entries.map(e => e.word));
    for (const m of must) {
      expect(placed.has(m.word)).toBe(true);
    }
  });

  it('uncapped config (no targetCount) is byte-identical to the legacy behavior', () => {
    const base = { pool: entries(POOL_40), width: 14, height: 14, seed: 99, qualityBias: 0.3 };
    const a = selectOptimizedSubset(base);
    const b = selectOptimizedSubset({ ...base, targetCount: undefined });
    expect(b.entries).toEqual(a.entries);
    expect(b.selectedCount).toBe(a.selectedCount);
    expect(b.density).toBe(a.density);
    expect(b.crossword.grid).toEqual(a.crossword.grid);
  });
});

describe('createOptimizedPuzzleFromEntries — target count cap (P0)', () => {
  it('finished puzzle has AT MOST targetCount words (no must words)', () => {
    for (const t of [8, 11, 14]) {
      const result = createOptimizedPuzzleFromEntries({
        pool: entries(POOL_40),
        targetCount: t,
        qualityBias: 0.2,
        seed: 1234,
      });
      expect(placedWords(result).length).toBeLessThanOrEqual(t);
    }
  });

  it('hits exactly targetCount end-to-end on a crossing-friendly pool', () => {
    // Same friendly seed as the selection-level test — the auto canvas
    // (canvasForCount) fits exactly the target subset for each.
    for (const t of [8, 11, 14]) {
      const result = createOptimizedPuzzleFromEntries({
        pool: entries(POOL_40),
        targetCount: t,
        qualityBias: 0.2,
        seed: 21,
      });
      expect(placedWords(result).length).toBe(t);
    }
  });

  it('3 must words + target 11 → at most 11 total AND all 3 must words present', () => {
    const must = entries(['cat', 'dog', 'sun']);
    const result = createOptimizedPuzzleFromEntries({
      pool: entries(POOL_40),
      mustInclude: must,
      targetCount: 11,
      qualityBias: 0.2,
      seed: 1234,
    });
    const placed = placedWords(result);
    expect(placed.length).toBeLessThanOrEqual(11);
    const placedSet = new Set(placed);
    for (const m of must) {
      expect(placedSet.has(m.word)).toBe(true);
    }
  });

  it('14 must words + target 11 → every must word present (may exceed the target)', () => {
    // Typed-words contract: when mustCount >= T, no must word is dropped to hit T.
    // The result is ALLOWED to exceed the target in this case.
    const mustWords = [
      'cat', 'dog', 'sun', 'moon', 'star', 'tree', 'fish', 'bird',
      'lake', 'rain', 'snow', 'wind', 'leaf', 'rock',
    ];
    const result = createOptimizedPuzzleFromEntries({
      pool: entries(POOL_40),
      mustInclude: entries(mustWords),
      targetCount: 11,
      qualityBias: 0.2,
      seed: 1234,
    });
    const placedSet = new Set(placedWords(result));
    for (const w of mustWords) {
      expect(placedSet.has(w)).toBe(true);
    }
  });

  it('is deterministic with a target count (same config → identical result)', () => {
    const cfg = {
      pool: entries(POOL_40),
      mustInclude: entries(['cat', 'dog']),
      targetCount: 11,
      qualityBias: 0.2,
      seed: 555,
    };
    const a = createOptimizedPuzzleFromEntries(cfg);
    const b = createOptimizedPuzzleFromEntries(cfg);
    expect(a.grid).toEqual(b.grid);
    expect(placedWords(a)).toEqual(placedWords(b));
  });
});
