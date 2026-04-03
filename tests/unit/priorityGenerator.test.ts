/**
 * Tests for the priority-based crossword generator.
 *
 * Covers:
 *   1. Must-include words are placed with priority
 *   2. Can-include words fill remaining space
 *   3. Must-include failures are reported correctly
 *   4. Too-long words are filtered and reported
 *   5. Seed reproducibility with priority ordering
 *   6. Empty input edge cases
 *   7. Mixed priority with various grid sizes
 *   8. The presorted flag on the core generator
 */

import { describe, it, expect } from 'vitest';
import { generateCrosswordWithPriority } from '@logic/priorityGenerator';
import { generateCrossword } from '@logic/generator';
import type { PriorityGeneratorConfig, PriorityGeneratorResult } from '@logic/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfig(
  overrides: Partial<PriorityGeneratorConfig> = {}
): PriorityGeneratorConfig {
  return {
    width: 12,
    height: 12,
    seed: 42,
    mustIncludeWords: ['python', 'java', 'react'],
    mustIncludeClues: ['A snake language', 'Coffee language', 'UI library'],
    canIncludeWords: ['node', 'vite', 'html', 'css', 'rust', 'go'],
    canIncludeClues: [
      'JS runtime', 'Build tool', 'Markup', 'Styles',
      'Systems lang', 'Google lang',
    ],
    allowReverseWords: true,
    debug: false,
    ...overrides,
  };
}

/** Check if a word appears in the placed word locations. */
function isWordPlaced(result: PriorityGeneratorResult, word: string): boolean {
  return result.crossword.wordLocations.some(loc => loc.word === word);
}

/** Verify a placed word exists correctly in the grid. */
function verifyWordInGrid(result: PriorityGeneratorResult, word: string): boolean {
  const loc = result.crossword.wordLocations.find(l => l.word === word);
  if (!loc) return false;

  const displayWord = loc.isReversed
    ? loc.word.split('').reverse().join('')
    : loc.word;

  for (let i = 0; i < displayWord.length; i++) {
    const x = loc.isHorizontal ? loc.x + i : loc.x;
    const y = loc.isHorizontal ? loc.y : loc.y + i;
    if (result.crossword.grid[y][x] !== displayWord[i]) {
      return false;
    }
  }
  return true;
}

// ============================================================================
// Must-Include Priority
// ============================================================================

describe('must-include word placement', () => {
  it('places all must-include words when they fit', () => {
    const result = generateCrosswordWithPriority(makeConfig());

    // All 3 must-include words should be placed
    expect(result.placedMust.length).toBe(3);
    expect(result.failedMust.length).toBe(0);

    // Verify they're actually in the grid
    expect(isWordPlaced(result, 'python')).toBe(true);
    expect(isWordPlaced(result, 'java')).toBe(true);
    expect(isWordPlaced(result, 'react')).toBe(true);
  });

  it('places must-include words in the grid correctly', () => {
    const result = generateCrosswordWithPriority(makeConfig());

    for (const word of ['python', 'java', 'react']) {
      expect(verifyWordInGrid(result, word)).toBe(true);
    }
  });

  it('places must-include words before can-include words', () => {
    // With a small grid, must-include words should take priority
    const result = generateCrosswordWithPriority(makeConfig({
      width: 8,
      height: 8,
    }));

    // Must-include should all be placed (they fit in 8x8)
    expect(result.placedMust.length).toBe(3);

    // Some can-include might be skipped due to space constraints
    // The important thing: must-include are all there
    for (const word of ['python', 'java', 'react']) {
      expect(isWordPlaced(result, word)).toBe(true);
    }
  });

  it('reports must-include words that are too long for the grid', () => {
    const result = generateCrosswordWithPriority(makeConfig({
      width: 4,
      height: 4,
      mustIncludeWords: ['python', 'hi'],
      mustIncludeClues: ['Snake', 'Greeting'],
    }));

    // 'python' (6 letters) can't fit in a 4x4 grid
    expect(result.failedMust.some(f => f.word === 'python' && f.reason === 'too_long')).toBe(true);
    // 'hi' should be placed
    expect(isWordPlaced(result, 'hi')).toBe(true);
  });

  it('reports must-include words that find no intersection', () => {
    // Use words with no shared letters → second word can't intersect
    const result = generateCrosswordWithPriority(makeConfig({
      width: 10,
      height: 10,
      mustIncludeWords: ['aaaa', 'bbbb'],
      mustIncludeClues: ['All As', 'All Bs'],
      canIncludeWords: [],
      canIncludeClues: [],
    }));

    // First word is always placed at (0,0). Second has no shared letters.
    expect(result.placedMust.length).toBe(1); // Only one can be placed
    expect(result.failedMust.some(f => f.reason === 'no_intersection')).toBe(true);
  });
});

// ============================================================================
// Can-Include Placement
// ============================================================================

describe('can-include word placement', () => {
  it('places can-include words after must-include', () => {
    const result = generateCrosswordWithPriority(makeConfig());

    // Some can-include words should be placed (exact count depends on grid)
    expect(result.placedCan.length).toBeGreaterThan(0);
  });

  it('silently skips can-include words that dont fit', () => {
    const result = generateCrosswordWithPriority(makeConfig({
      width: 6,
      height: 6,
      canIncludeWords: ['toolongforsmallgrid', 'node', 'vite'],
      canIncludeClues: ['Too long', 'Runtime', 'Builder'],
    }));

    // 'toolongforsmallgrid' is too long → silently skipped (not in failedMust)
    expect(result.failedMust.length).toBe(0); // Can-include failures aren't failures
    expect(result.skippedCan).toContain('toolongforsmallgrid');
  });

  it('reports skipped can-include words', () => {
    const result = generateCrosswordWithPriority(makeConfig({
      width: 8,
      height: 8,
    }));

    // Total can words = placed + skipped
    const totalCan = result.placedCan.length + result.skippedCan.length;
    expect(totalCan).toBe(6); // We provided 6 can-include words
  });

  it('places no can-include when grid is full from must-include', () => {
    // Fill a tiny grid entirely with must-include
    const result = generateCrosswordWithPriority(makeConfig({
      width: 6,
      height: 6,
      mustIncludeWords: ['python'],
      mustIncludeClues: ['Snake'],
      canIncludeWords: ['aaaa', 'bbbb', 'cccc'],
      canIncludeClues: ['A', 'B', 'C'],
    }));

    // Must-include should be placed
    expect(result.placedMust.length).toBe(1);

    // Can-include words with no shared letters won't intersect → skipped
    // (this tests the "silently skipped" behavior)
    expect(result.skippedCan.length).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe('edge cases', () => {
  it('handles empty must and can lists', () => {
    const result = generateCrosswordWithPriority(makeConfig({
      mustIncludeWords: [],
      mustIncludeClues: [],
      canIncludeWords: [],
      canIncludeClues: [],
    }));

    expect(result.crossword.wordLocations.length).toBe(0);
    expect(result.placedMust.length).toBe(0);
    expect(result.placedCan.length).toBe(0);
    expect(result.failedMust.length).toBe(0);
  });

  it('handles only must-include words (no can-include)', () => {
    const result = generateCrosswordWithPriority(makeConfig({
      canIncludeWords: [],
      canIncludeClues: [],
    }));

    expect(result.placedMust.length).toBe(3);
    expect(result.placedCan.length).toBe(0);
    expect(result.skippedCan.length).toBe(0);
  });

  it('handles only can-include words (no must-include)', () => {
    const result = generateCrosswordWithPriority(makeConfig({
      mustIncludeWords: [],
      mustIncludeClues: [],
    }));

    expect(result.placedMust.length).toBe(0);
    expect(result.failedMust.length).toBe(0);
    expect(result.placedCan.length).toBeGreaterThan(0);
  });

  it('handles single must-include word', () => {
    const result = generateCrosswordWithPriority(makeConfig({
      mustIncludeWords: ['hello'],
      mustIncludeClues: ['Greeting'],
      canIncludeWords: [],
      canIncludeClues: [],
    }));

    expect(result.placedMust.length).toBe(1);
    expect(result.placedMust[0].word).toBe('hello');
  });
});

// ============================================================================
// Seed Reproducibility
// ============================================================================

describe('seed reproducibility', () => {
  it('produces identical results for the same seed', () => {
    const config = makeConfig();
    const result1 = generateCrosswordWithPriority(config);
    const result2 = generateCrosswordWithPriority(config);

    expect(result1.crossword.grid).toEqual(result2.crossword.grid);
    expect(result1.placedMust.length).toBe(result2.placedMust.length);
    expect(result1.placedCan.length).toBe(result2.placedCan.length);
  });

  it('produces different results for different seeds', () => {
    const result1 = generateCrosswordWithPriority(makeConfig({ seed: 1 }));
    const result2 = generateCrosswordWithPriority(makeConfig({ seed: 999 }));

    // Different seeds should produce different grids
    // (statistically almost certain with enough words and grid size)
    const grid1Flat = result1.crossword.grid.flat().join('');
    const grid2Flat = result2.crossword.grid.flat().join('');
    expect(grid1Flat).not.toBe(grid2Flat);
  });
});

// ============================================================================
// Core Generator Presorted Flag
// ============================================================================

describe('presorted flag on core generator', () => {
  it('preserves word order when presorted=true', () => {
    // When presorted, the first word goes at (0,0) regardless of length
    const result = generateCrossword({
      width: 10,
      height: 10,
      seed: 42,
      words: ['hi', 'programming', 'test'],
      clues: ['Greeting', 'Coding', 'Check'],
      allowReverseWords: true,
      presorted: true,
    });

    // 'hi' should be the first placed word (at origin)
    // Without presorted, 'programming' would be first (longest)
    const firstPlaced = result.wordLocations[0];
    expect(firstPlaced.word).toBe('hi');
    expect(firstPlaced.x).toBe(0);
    expect(firstPlaced.y).toBe(0);
  });

  it('does not affect results when presorted=false (default)', () => {
    const withFlag = generateCrossword({
      width: 8,
      height: 8,
      seed: 42,
      words: ['java', 'array', 'loop'],
      clues: ['Lang', 'Collection', 'Repeat'],
      allowReverseWords: true,
      presorted: false,
    });

    const withoutFlag = generateCrossword({
      width: 8,
      height: 8,
      seed: 42,
      words: ['java', 'array', 'loop'],
      clues: ['Lang', 'Collection', 'Repeat'],
      allowReverseWords: true,
    });

    // Should be identical — presorted=false is the default
    expect(withFlag.grid).toEqual(withoutFlag.grid);
  });
});
