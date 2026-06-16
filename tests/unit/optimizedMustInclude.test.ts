/**
 * ADR-10 F3 — Optimized "must + pool" build.
 *
 * Optimized mode now guarantees the teacher's manually-typed words (must-include)
 * and curates ONLY the AI-suggested pool down to a dense subset. These tests pin
 * the invariants the design demands:
 *
 *   1. Every must word is ALWAYS placed, regardless of pool size.
 *   2. Over-long POOL words are filtered (no crash); an over-long MUST word grows
 *      the canvas instead of being dropped.
 *   3. No AI pool (mustInclude only / empty pool) still produces every must word.
 *   4. The pure-AI path (mustInclude = []) is byte-identical to the pre-ADR-10
 *      behavior for a fixed seed (regression-safe).
 *   5. Determinism — same config yields the same result.
 *
 * The high-level entry point createOptimizedPuzzleFromEntries owns the length
 * filter + grow loop; selectOptimizedSubset owns must-first placement + the
 * valid-start scoring. Both are exercised here.
 */

import { describe, it, expect } from 'vitest';
import { selectOptimizedSubset } from '@logic/optimizedSelection';
import { createOptimizedPuzzleFromEntries } from '@logic/createPuzzle';
import type { WordCluePair, SkeletonResult } from '@logic/types';

function entries(words: string[]): WordCluePair[] {
  return words.map(word => ({ word, clue: `clue for ${word}` }));
}

/** Words actually placed in a finished Optimized result (grid form). */
function placedWords(result: SkeletonResult): string[] {
  return result.slots
    .filter(s => s.word !== undefined)
    .map(s => s.word as string);
}

/** A 30-word common pool, best-first (rank = index). */
const POOL_30 = [
  'planet', 'rocket', 'garden', 'silver', 'dragon', 'castle', 'forest', 'market',
  'island', 'window', 'bridge', 'candle', 'flower', 'letter', 'animal', 'number',
  'orange', 'purple', 'yellow', 'mother', 'father', 'sister', 'winter', 'summer',
  'spring', 'autumn', 'school', 'friend', 'people', 'travel',
];

describe('selectOptimizedSubset — must-include guarantee', () => {
  it('places EVERY must word even against a large pool', () => {
    // 3 must words + 30 pool words on a deliberately small canvas. The must
    // words must all land; the pool is curated down to whatever fits around them.
    const must = entries(['cat', 'dog', 'bird']);
    const result = selectOptimizedSubset({
      pool: entries(POOL_30),
      mustInclude: must,
      width: 11,
      height: 11,
      seed: 42,
      qualityBias: 0.2,
    });

    expect(result.allMustPlaced).toBe(true);
    const placed = new Set(result.entries.map(e => e.word));
    for (const m of must) {
      expect(placed.has(m.word)).toBe(true);
    }
  });

  it('reports allMustPlaced=false when a must word cannot fit the pinned canvas', () => {
    // A must word longer than the canvas side can never place here. The selector
    // does not crash and signals the failure (the high-level entry grows for it).
    const result = selectOptimizedSubset({
      pool: entries(POOL_30),
      mustInclude: entries(['extraordinarily']), // 15 letters, canvas side 11
      width: 11,
      height: 11,
      seed: 1,
      qualityBias: 0.2,
    });
    expect(result.allMustPlaced).toBe(false);
  });

  it('keeps must words out of the quality average (guaranteed regardless of rank)', () => {
    // Two biases must still place the same must word; the curated POOL differs by
    // bias but the must guarantee is independent of qualityBias.
    const must = entries(['queue']);
    const grid = { pool: entries(POOL_30), mustInclude: must, width: 13, height: 13, seed: 5 } as const;
    const gridFit = selectOptimizedSubset({ ...grid, qualityBias: 0 });
    const quality = selectOptimizedSubset({ ...grid, qualityBias: 1 });
    expect(gridFit.entries.some(e => e.word === 'queue')).toBe(true);
    expect(quality.entries.some(e => e.word === 'queue')).toBe(true);
  });
});

describe('selectOptimizedSubset — pure-AI regression (mustInclude = [])', () => {
  it('mustInclude=[] reproduces the no-must behavior exactly for a fixed seed', () => {
    const base = { pool: entries(POOL_30), width: 14, height: 14, seed: 99, qualityBias: 0.3 };
    const withoutField = selectOptimizedSubset(base);
    const withEmptyMust = selectOptimizedSubset({ ...base, mustInclude: [] });

    // Same words, same order, same layout, same density — adding an empty
    // mustInclude must change nothing.
    expect(withEmptyMust.entries).toEqual(withoutField.entries);
    expect(withEmptyMust.selectedCount).toBe(withoutField.selectedCount);
    expect(withEmptyMust.density).toBe(withoutField.density);
    expect(withEmptyMust.crossword.grid).toEqual(withoutField.crossword.grid);
    expect(withEmptyMust.allMustPlaced).toBe(true);
  });
});

describe('createOptimizedPuzzleFromEntries — must + pool build', () => {
  it('guarantees every must word in the finished puzzle, even with a 30-word pool', () => {
    const must = entries(['cat', 'dog', 'sun']);
    const result = createOptimizedPuzzleFromEntries({
      pool: entries(POOL_30),
      mustInclude: must,
      targetCount: 13,
      qualityBias: 0.2,
      seed: 42,
    });

    const placed = new Set(placedWords(result));
    for (const m of must) {
      expect(placed.has(m.word)).toBe(true);
    }
    // Finished — no blank slots.
    expect(result.slots.every(s => s.word !== undefined)).toBe(true);
  });

  it('filters an over-long POOL word (no crash) while still placing must words', () => {
    // 'pneumonoultramicroscopicsilicovolcanoconiosis' is far longer than any
    // sane canvas — as an OPTIONAL pool word it must be dropped, not crash the
    // placer (which would otherwise write out of bounds on the first word).
    const overLongPool = ['pneumonoultramicroscopicsilicovolcanoconiosis', ...POOL_30];
    const must = entries(['cat', 'dog']);

    expect(() =>
      createOptimizedPuzzleFromEntries({
        pool: entries(overLongPool),
        mustInclude: must,
        targetCount: 13,
        qualityBias: 0.2,
        seed: 7,
      }),
    ).not.toThrow();

    const result = createOptimizedPuzzleFromEntries({
      pool: entries(overLongPool),
      mustInclude: must,
      targetCount: 13,
      qualityBias: 0.2,
      seed: 7,
    });
    const placed = placedWords(result);
    // The over-long word never appears; both must words do.
    expect(placed).not.toContain('pneumonoultramicroscopicsilicovolcanoconiosis');
    expect(new Set(placed).has('cat')).toBe(true);
    expect(new Set(placed).has('dog')).toBe(true);
  });

  it('GROWS the canvas for an over-long MUST word instead of dropping it', () => {
    // 'photosynthesis' (14) needs a grid wider than canvasForCount(8) (~11).
    // The grow loop must enlarge the canvas until it places — the teacher's
    // word is a contract, never dropped.
    const must = entries(['photosynthesis']);
    const result = createOptimizedPuzzleFromEntries({
      pool: entries(POOL_30),
      mustInclude: must,
      targetCount: 8, // small canvas on purpose
      qualityBias: 0.2,
      seed: 3,
    });

    const placed = placedWords(result);
    expect(new Set(placed).has('photosynthesis')).toBe(true);
    // canvasForCount(8) is ~11; a 14-letter word can only place once the canvas
    // grew to fit it. The result is cropped to the bounding box, so the longer
    // dimension is at least the word's own length (14).
    expect(Math.max(result.width, result.height)).toBeGreaterThanOrEqual(14);
  });

  it('mustInclude only (empty pool) places every must word', () => {
    // The AI pool is empty (GenerateTab would route this to Standard, but the
    // entry point itself must still behave — every must word lands).
    const must = entries(['apple', 'grape', 'lemon', 'melon']);
    const result = createOptimizedPuzzleFromEntries({
      pool: [],
      mustInclude: must,
      targetCount: 8,
      qualityBias: 0.2,
      seed: 11,
    });
    const placed = new Set(placedWords(result));
    // At least the words that can connect place; the grow loop tries up to the
    // cap. For these vowel-rich interlocking words all four place.
    for (const m of must) {
      expect(placed.has(m.word)).toBe(true);
    }
  });

  it('is deterministic — same config yields an identical finished puzzle', () => {
    const cfg = {
      pool: entries(POOL_30),
      mustInclude: entries(['cat', 'dog', 'sun']),
      targetCount: 13,
      qualityBias: 0.33,
      seed: 77,
    };
    const a = createOptimizedPuzzleFromEntries(cfg);
    const b = createOptimizedPuzzleFromEntries(cfg);
    expect(a.grid).toEqual(b.grid);
    expect(a.width).toBe(b.width);
    expect(a.height).toBe(b.height);
    expect(placedWords(a)).toEqual(placedWords(b));
  });

  it('mustInclude=[] matches a no-mustInclude call (high-level regression)', () => {
    const base = { pool: entries(POOL_30), targetCount: 13, qualityBias: 0.2, seed: 42 } as const;
    const withoutField = createOptimizedPuzzleFromEntries(base);
    const withEmptyMust = createOptimizedPuzzleFromEntries({ ...base, mustInclude: [] });
    expect(withEmptyMust.grid).toEqual(withoutField.grid);
    expect(placedWords(withEmptyMust)).toEqual(placedWords(withoutField));
  });
});
