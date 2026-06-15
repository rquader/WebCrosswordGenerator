/**
 * Tests for grid size recommendation and outlier word detection.
 *
 * Covers:
 *   1. Recommendation algorithm — various word counts and lengths
 *   2. Recommendation bounds — min/max clamping, edge cases
 *   3. Outlier detection — statistical outlier identification
 *   4. Outlier edge cases — small lists, uniform lists, boundary cases
 *   5. Word search recommendations — different formula
 *   6. Convenience wrappers — detectOutlierWords with strings
 */

import { describe, it, expect } from 'vitest';
import {
  recommendGridSize,
  recommendWordSearchGridSize,
  recommendedWordCountRange,
  recommendedWordCountTarget,
  detectOutliers,
  detectOutlierWords,
  gridLengthSignature,
  shouldRecomputeRecommendation,
  resolveEffectiveGridSize,
} from '@logic/gridRecommendation';
import type { GridRecommendation } from '@logic/types';

// ============================================================================
// Grid Size Recommendation
// ============================================================================

describe('recommendGridSize', () => {
  it('returns 10x10 default for no words', () => {
    const rec = recommendGridSize([]);
    expect(rec.width).toBe(10);
    expect(rec.height).toBe(10);
    expect(rec.minDimension).toBe(0);
  });

  it('recommends at least longest-word + 1 in dimension', () => {
    // Single 14-letter word → grid must be at least 15
    const rec = recommendGridSize([14]);
    expect(rec.width).toBeGreaterThanOrEqual(15);
    expect(rec.height).toBeGreaterThanOrEqual(15);
    expect(rec.minDimension).toBe(14);
  });

  it('recommends larger grids for more words', () => {
    const small = recommendGridSize([5, 5, 5]);
    const large = recommendGridSize([5, 5, 5, 5, 5, 5, 5, 5, 5, 5]);
    expect(large.width).toBeGreaterThanOrEqual(small.width);
  });

  it('recommends larger grids for longer words', () => {
    const short = recommendGridSize([3, 3, 3, 3, 3]);
    const long = recommendGridSize([10, 10, 10, 10, 10]);
    expect(long.width).toBeGreaterThan(short.width);
  });

  it('never recommends below 8 (MIN_GRID_SIZE)', () => {
    const rec = recommendGridSize([2, 2]);
    expect(rec.width).toBeGreaterThanOrEqual(8);
  });

  it('never recommends above 26 (MAX_GRID_SIZE)', () => {
    const massive = recommendGridSize([
      12, 12, 12, 12, 12, 12, 12, 12, 12, 12,
      12, 12, 12, 12, 12, 12, 12, 12, 12, 12,
    ]);
    expect(massive.width).toBeLessThanOrEqual(26);
  });

  it('returns square grids (width === height)', () => {
    const rec = recommendGridSize([5, 7, 4, 8, 3]);
    expect(rec.width).toBe(rec.height);
  });

  it('provides a human-readable reason string', () => {
    const rec = recommendGridSize([5, 7, 4]);
    expect(rec.reason).toBeTruthy();
    expect(typeof rec.reason).toBe('string');
    expect(rec.reason.length).toBeGreaterThan(10);
  });

  // Specific example from planning: 6 biology words
  it('handles the biology words example (longest 14)', () => {
    const rec = recommendGridSize([14, 11, 12, 4, 3, 3]);
    expect(rec.width).toBeGreaterThanOrEqual(15); // Must fit 14-letter word
    expect(rec.width).toBeLessThanOrEqual(20);     // Shouldn't be excessive
    expect(rec.minDimension).toBe(14);
  });

  // Specific example: 10 short chemistry words
  it('handles short chemistry words example (all 3-4 letters)', () => {
    const rec = recommendGridSize([4, 4, 4, 4, 3, 3, 4, 4, 4, 4]);
    expect(rec.width).toBeGreaterThanOrEqual(8);
    expect(rec.width).toBeLessThanOrEqual(15); // Short words shouldn't need huge grid
  });

  // Specific example: 3 simple words
  it('handles 3 simple short words', () => {
    const rec = recommendGridSize([3, 3, 4]);
    expect(rec.width).toBe(8); // Should clamp to minimum
  });

  it('handles single word', () => {
    const rec = recommendGridSize([8]);
    expect(rec.width).toBeGreaterThanOrEqual(9); // longest + 1
    expect(rec.minDimension).toBe(8);
  });

  it('handles all same-length words', () => {
    const rec = recommendGridSize([6, 6, 6, 6, 6]);
    expect(rec.width).toBeGreaterThanOrEqual(8);
  });
});

// ============================================================================
// Word Search Grid Recommendation
// ============================================================================

describe('recommendWordSearchGridSize', () => {
  it('returns 10x10 default for no words', () => {
    const rec = recommendWordSearchGridSize([]);
    expect(rec.width).toBe(10);
    expect(rec.height).toBe(10);
  });

  it('recommends at least longest-word + 3', () => {
    const rec = recommendWordSearchGridSize([10]);
    expect(rec.width).toBeGreaterThanOrEqual(13); // 10 + 3
  });

  it('recommends reasonable size for word search', () => {
    const wordLengths = [5, 6, 7, 4, 5, 6];
    const wordSearch = recommendWordSearchGridSize(wordLengths);
    // Word search should be at least longestWord + 3 = 10
    expect(wordSearch.width).toBeGreaterThanOrEqual(10);
    expect(wordSearch.width).toBeLessThanOrEqual(20);
  });

  it('scales with total content volume', () => {
    const few = recommendWordSearchGridSize([5, 5, 5]);
    const many = recommendWordSearchGridSize([5, 5, 5, 5, 5, 5, 5, 5, 5, 5]);
    expect(many.width).toBeGreaterThanOrEqual(few.width);
  });

  it('never exceeds MAX_GRID_SIZE', () => {
    const rec = recommendWordSearchGridSize([
      15, 15, 15, 15, 15, 15, 15, 15, 15, 15,
    ]);
    expect(rec.width).toBeLessThanOrEqual(26);
  });
});

// ============================================================================
// Outlier Detection
// ============================================================================

describe('detectOutliers', () => {
  it('returns empty for fewer than 3 words', () => {
    expect(detectOutliers([5, 14])).toEqual([]);
    expect(detectOutliers([5])).toEqual([]);
    expect(detectOutliers([])).toEqual([]);
  });

  it('detects a clear outlier (photosynthesis example)', () => {
    // cat(3), dog(3), fish(4), photosynthesis(14)
    const outliers = detectOutliers([3, 3, 4, 14]);
    expect(outliers.length).toBe(1);
    expect(outliers[0].length).toBe(14);
    expect(outliers[0].medianOtherLength).toBe(3.5); // median of [3,3,4,14]
  });

  it('detects outlier with moderate word set', () => {
    // atom(4), molecule(8), electronegativity(19)
    const outliers = detectOutliers([4, 8, 19]);
    expect(outliers.length).toBe(1);
    expect(outliers[0].length).toBe(19);
  });

  it('does NOT flag words that are slightly longer', () => {
    // house(5), garden(6), forest(6), mountain(8)
    // 8 > 2*6=12? No → not an outlier
    const outliers = detectOutliers([5, 6, 6, 8]);
    expect(outliers.length).toBe(0);
  });

  it('does NOT flag uniform-length words', () => {
    const outliers = detectOutliers([5, 5, 5, 5, 5]);
    expect(outliers.length).toBe(0);
  });

  it('does NOT flag gradually increasing lengths', () => {
    const outliers = detectOutliers([3, 4, 5, 6, 7, 8, 9, 10]);
    expect(outliers.length).toBe(0);
  });

  it('flags multiple outliers if both conditions met', () => {
    // Two very long words among shorts: 3, 3, 3, 15, 16
    // median = 3, longest = 16, second = 15
    // 16 > 2*3=6 ✓, 16 >= 15+4=19? No → 16 not flagged
    // 15 > 2*3=6 ✓, 15 >= 16+4=20? No → 15 not flagged (second-longest check)
    // Actually both are long, so neither is 4+ more than the other
    const outliers = detectOutliers([3, 3, 3, 15, 16]);
    expect(outliers.length).toBe(0); // Neither is 4+ more than the other
  });

  it('flags when one word is clearly separate from the pack', () => {
    // 3, 3, 4, 4, 3, 20 → median = 3.5, second = 4, 20 >= 4+4 ✓, 20 > 7 ✓
    const outliers = detectOutliers([3, 3, 4, 4, 3, 20]);
    expect(outliers.length).toBe(1);
    expect(outliers[0].length).toBe(20);
  });

  it('respects both conditions (>2x median AND >=second+4)', () => {
    // 5, 5, 5, 12 → median = 5, 12 > 10 ✓, second = 5, 12 >= 9 ✓ → flagged
    expect(detectOutliers([5, 5, 5, 12]).length).toBe(1);

    // 5, 5, 5, 8 → median = 5, 8 > 10? No → NOT flagged
    expect(detectOutliers([5, 5, 5, 8]).length).toBe(0);

    // 5, 5, 8, 11 → median = 6.5, 11 > 13? No → NOT flagged
    expect(detectOutliers([5, 5, 8, 11]).length).toBe(0);
  });
});

describe('detectOutlierWords', () => {
  it('fills in word strings from the input array', () => {
    const outliers = detectOutlierWords(['cat', 'dog', 'fish', 'photosynthesis']);
    expect(outliers.length).toBe(1);
    expect(outliers[0].word).toBe('photosynthesis');
    expect(outliers[0].length).toBe(14);
  });

  it('returns empty for no outliers', () => {
    const outliers = detectOutlierWords(['house', 'garden', 'forest']);
    expect(outliers.length).toBe(0);
  });

  it('returns empty for too few words', () => {
    const outliers = detectOutlierWords(['hi', 'supercalifragilistic']);
    expect(outliers.length).toBe(0); // Only 2 words
  });
});

// ============================================================================
// Word count calibration
// ============================================================================

describe('recommendedWordCountRange', () => {
  // Calibrated against the Phase 16 engine (see gridRecommendation.ts).
  // These pins are the published guidance — change them only with fresh
  // measurement, since the UI and the AI prompt both surface them.
  it('matches the calibrated bands for standard sizes', () => {
    expect(recommendedWordCountRange(9, 9)).toEqual({ lo: 4, hi: 6 });
    expect(recommendedWordCountRange(11, 11)).toEqual({ lo: 6, hi: 9 });
    expect(recommendedWordCountRange(13, 13)).toEqual({ lo: 9, hi: 13 });
    expect(recommendedWordCountRange(15, 15)).toEqual({ lo: 12, hi: 17 });
    expect(recommendedWordCountRange(17, 17)).toEqual({ lo: 15, hi: 22 });
    expect(recommendedWordCountRange(21, 21)).toEqual({ lo: 23, hi: 34 });
  });

  it('uses the full area for non-square grids', () => {
    const range = recommendedWordCountRange(10, 20);
    const square = recommendedWordCountRange(14, 14); // similar area (200 vs 196)
    expect(Math.abs(range.lo - square.lo)).toBeLessThanOrEqual(1);
    expect(Math.abs(range.hi - square.hi)).toBeLessThanOrEqual(1);
  });

  it('never goes below 2, and hi is always >= lo', () => {
    const tiny = recommendedWordCountRange(2, 2);
    expect(tiny.lo).toBeGreaterThanOrEqual(2);
    expect(tiny.hi).toBeGreaterThanOrEqual(tiny.lo);
  });
});

// ============================================================================
// Re-recommendation policy (when the live size recompute should fire)
// ============================================================================

describe('gridLengthSignature', () => {
  it('is stable for the same lengths', () => {
    expect(gridLengthSignature([3, 8, 5])).toBe(gridLengthSignature([3, 8, 5]));
  });

  it('is order-insensitive (reordering words does not change it)', () => {
    // The recommendation reads max + sum + median, all order-free, so
    // reordering the word list must not trigger a recompute.
    expect(gridLengthSignature([3, 8, 5])).toBe(gridLengthSignature([5, 3, 8]));
  });

  it('changes when a word length changes', () => {
    expect(gridLengthSignature([3, 8, 5])).not.toBe(gridLengthSignature([3, 8, 6]));
  });

  it('changes when a word is added or removed', () => {
    expect(gridLengthSignature([3, 8, 5])).not.toBe(gridLengthSignature([3, 8, 5, 4]));
    expect(gridLengthSignature([3, 8, 5])).not.toBe(gridLengthSignature([3, 8]));
  });

  it('distinguishes empty from non-empty', () => {
    expect(gridLengthSignature([])).not.toBe(gridLengthSignature([5]));
    expect(gridLengthSignature([])).toBe(gridLengthSignature([]));
  });
});

describe('shouldRecomputeRecommendation', () => {
  it('does not recompute when the signature is unchanged', () => {
    const sig = gridLengthSignature([4, 6, 8]);
    expect(shouldRecomputeRecommendation(sig, sig)).toBe(false);
  });

  it('recomputes when the signature changes', () => {
    const before = gridLengthSignature([4, 6, 8]);
    const after = gridLengthSignature([4, 6, 9]);
    expect(shouldRecomputeRecommendation(before, after)).toBe(true);
  });

  // The behavioral promise the debounce/guard rests on: editing only the
  // CLUES (word lengths untouched) yields an identical signature, so the
  // suggested/auto size never recomputes — and a held manual size is never
  // silently overwritten (the don't-stomp rule). Reordering rows is likewise
  // a no-op. Only a real change to the WORDS moves the recommendation.
  it('treats a clue-only / reorder edit as no recompute, but a word change as a recompute', () => {
    const wordsBefore = ['cat', 'house', 'planet'];
    const sameWordsReordered = ['planet', 'cat', 'house'];
    const clueEditedSameWords = ['cat', 'house', 'planet']; // clues live elsewhere

    const sigBefore = gridLengthSignature(wordsBefore.map(w => w.length));
    const sigReordered = gridLengthSignature(sameWordsReordered.map(w => w.length));
    const sigClueEdit = gridLengthSignature(clueEditedSameWords.map(w => w.length));
    expect(shouldRecomputeRecommendation(sigBefore, sigReordered)).toBe(false);
    expect(shouldRecomputeRecommendation(sigBefore, sigClueEdit)).toBe(false);

    const wordsAfter = ['cat', 'house', 'planets']; // one letter longer
    const sigAfter = gridLengthSignature(wordsAfter.map(w => w.length));
    expect(shouldRecomputeRecommendation(sigBefore, sigAfter)).toBe(true);
  });
});

describe('resolveEffectiveGridSize (don\'t-stomp rule)', () => {
  function rec(width: number, height: number): GridRecommendation {
    return { width, height, reason: '', minDimension: Math.max(width, height) - 1, outliers: [] };
  }

  it('uses the recommendation when auto-sizing is on', () => {
    const size = resolveEffectiveGridSize(true, { width: 8, height: 8 }, rec(13, 13));
    expect(size).toEqual({ width: 13, height: 13 });
  });

  it('uses the manual size when auto-sizing is off — even as the recommendation changes', () => {
    // The user chose 11x11 (auto off). The word list grows and the
    // recommendation climbs to 18x18, but the manual size must stand: a
    // deliberate choice is never silently overwritten.
    const manual = { width: 11, height: 11 };
    expect(resolveEffectiveGridSize(false, manual, rec(13, 13))).toEqual(manual);
    expect(resolveEffectiveGridSize(false, manual, rec(18, 18))).toEqual(manual);
    expect(resolveEffectiveGridSize(false, manual, null)).toEqual(manual);
  });

  it('falls back to the manual size when there is no usable recommendation', () => {
    // Empty list → recommendation is null or has minDimension 0; auto can't
    // act on nothing, so the seed/manual size stands.
    const manual = { width: 8, height: 8 };
    expect(resolveEffectiveGridSize(true, manual, null)).toEqual(manual);
    const emptyRec: GridRecommendation = { width: 10, height: 10, reason: '', minDimension: 0, outliers: [] };
    expect(resolveEffectiveGridSize(true, manual, emptyRec)).toEqual(manual);
  });

  it('does not mutate the inputs', () => {
    const manual = { width: 9, height: 9 };
    const r = rec(13, 13);
    resolveEffectiveGridSize(true, manual, r);
    expect(manual).toEqual({ width: 9, height: 9 });
    expect(r.width).toBe(13);
  });
});

describe('recommendedWordCountTarget', () => {
  // The single prefilled default for the AI Words stepper — the midpoint of
  // the calibrated band. These are the user-facing default numbers.
  it('is the midpoint of the band for standard sizes', () => {
    expect(recommendedWordCountTarget(9, 9)).toBe(5);
    expect(recommendedWordCountTarget(13, 13)).toBe(11);
    expect(recommendedWordCountTarget(15, 15)).toBe(15);
    expect(recommendedWordCountTarget(17, 17)).toBe(19);
  });

  it('always lands inside the recommended band', () => {
    for (let side = 8; side <= 26; side++) {
      const { lo, hi } = recommendedWordCountRange(side, side);
      const target = recommendedWordCountTarget(side, side);
      expect(target).toBeGreaterThanOrEqual(lo);
      expect(target).toBeLessThanOrEqual(hi);
    }
  });
});
