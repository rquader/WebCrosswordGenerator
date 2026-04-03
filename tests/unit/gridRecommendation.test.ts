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
  detectOutliers,
  detectOutlierWords,
} from '@logic/gridRecommendation';

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

  it('never recommends above 20 (MAX_GRID_SIZE)', () => {
    const massive = recommendGridSize([
      12, 12, 12, 12, 12, 12, 12, 12, 12, 12,
      12, 12, 12, 12, 12, 12, 12, 12, 12, 12,
    ]);
    expect(massive.width).toBeLessThanOrEqual(20);
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
    expect(rec.width).toBeLessThanOrEqual(20);
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
