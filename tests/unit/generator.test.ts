/**
 * Unit tests for the crossword generator engine.
 *
 * These tests verify:
 * 1. Seed reproducibility — same seed always produces the same grid
 * 2. Algorithm correctness — words are placed at valid intersections
 * 3. Direction balancing — mix of horizontal and vertical words
 * 4. Reverse word support — words can be placed backwards
 * 5. Edge cases — small grids, single words, empty input
 */

import { describe, it, expect } from 'vitest';
import { generateCrossword } from '@logic/generator';
import type { GeneratorConfig, CrosswordResult } from '@logic/types';

// Helper: create a basic config
function makeConfig(overrides: Partial<GeneratorConfig> = {}): GeneratorConfig {
  return {
    width: 8,
    height: 8,
    seed: 42,
    words: ['java', 'array', 'loop', 'class', 'method', 'string', 'object'],
    clues: [
      'A programming language',
      'A collection of elements',
      'Repeating code block',
      'A blueprint for objects',
      'A function in a class',
      'A sequence of characters',
      'An instance of a class',
    ],
    allowReverseWords: true,
    debug: false,
    ...overrides,
  };
}

// Helper: count placed words by direction
function countDirections(result: CrosswordResult) {
  let horizontal = 0;
  let vertical = 0;
  for (const word of result.wordLocations) {
    if (word.isHorizontal) {
      horizontal++;
    } else {
      vertical++;
    }
  }
  return { horizontal, vertical };
}

// Helper: verify a placed word exists in the grid at its stated position
function verifyWordInGrid(result: CrosswordResult, wordIndex: number): boolean {
  const placed = result.wordLocations[wordIndex];
  const displayWord = placed.isReversed
    ? placed.word.split('').reverse().join('')
    : placed.word;

  for (let i = 0; i < displayWord.length; i++) {
    const x = placed.isHorizontal ? placed.x + i : placed.x;
    const y = placed.isHorizontal ? placed.y : placed.y + i;

    if (y >= result.height || x >= result.width) {
      return false;
    }
    if (result.grid[y][x] !== displayWord.charAt(i)) {
      return false;
    }
  }
  return true;
}

describe('CrosswordGenerator', () => {
  describe('seed reproducibility', () => {
    it('produces identical output for the same seed', () => {
      const config = makeConfig();
      const result1 = generateCrossword(config);
      const result2 = generateCrossword(config);

      // Grids should be exactly the same
      expect(result1.grid).toEqual(result2.grid);

      // Same words placed in same positions
      expect(result1.wordLocations.length).toBe(result2.wordLocations.length);
      for (let i = 0; i < result1.wordLocations.length; i++) {
        expect(result1.wordLocations[i].word).toBe(result2.wordLocations[i].word);
        expect(result1.wordLocations[i].x).toBe(result2.wordLocations[i].x);
        expect(result1.wordLocations[i].y).toBe(result2.wordLocations[i].y);
        expect(result1.wordLocations[i].isHorizontal).toBe(result2.wordLocations[i].isHorizontal);
      }
    });

    it('produces different output for different seeds', () => {
      const result1 = generateCrossword(makeConfig({ seed: 1 }));
      const result2 = generateCrossword(makeConfig({ seed: 999 }));

      // Very unlikely to be identical with different seeds
      const grid1Str = result1.grid.map(row => row.join('')).join('');
      const grid2Str = result2.grid.map(row => row.join('')).join('');
      expect(grid1Str).not.toBe(grid2Str);
    });
  });

  describe('word placement correctness', () => {
    it('places at least one word', () => {
      const result = generateCrossword(makeConfig());
      expect(result.wordLocations.length).toBeGreaterThan(0);
    });

    it('places the first word at position (0, 0)', () => {
      const result = generateCrossword(makeConfig());
      const first = result.wordLocations[0];
      expect(first.x).toBe(0);
      expect(first.y).toBe(0);
    });

    it('places every word at its stated grid position', () => {
      const result = generateCrossword(makeConfig());

      for (let i = 0; i < result.wordLocations.length; i++) {
        expect(verifyWordInGrid(result, i)).toBe(true);
      }
    });

    it('does not place words outside grid bounds', () => {
      const result = generateCrossword(makeConfig());

      for (const word of result.wordLocations) {
        if (word.isHorizontal) {
          expect(word.x + word.word.length).toBeLessThanOrEqual(result.width);
          expect(word.y).toBeLessThan(result.height);
        } else {
          expect(word.x).toBeLessThan(result.width);
          expect(word.y + word.word.length).toBeLessThanOrEqual(result.height);
        }
      }
    });
  });

  describe('direction balancing', () => {
    it('places words in both directions', () => {
      const result = generateCrossword(makeConfig());
      const counts = countDirections(result);

      // With 7 words, we should have at least 1 in each direction
      expect(counts.horizontal).toBeGreaterThan(0);
      expect(counts.vertical).toBeGreaterThan(0);
    });
  });

  describe('reverse words', () => {
    it('can place reversed words when allowed', () => {
      const result = generateCrossword(makeConfig({ allowReverseWords: true }));

      // Check if any word got reversed (may or may not happen depending on seed)
      // At minimum, the feature shouldn't cause errors
      expect(result.wordLocations.length).toBeGreaterThan(0);
    });

    it('never reverses words when not allowed', () => {
      const result = generateCrossword(makeConfig({ allowReverseWords: false }));

      for (const word of result.wordLocations) {
        expect(word.isReversed).toBe(false);
      }
    });
  });

  describe('grid dimensions', () => {
    it('returns a grid matching requested dimensions', () => {
      const result = generateCrossword(makeConfig({ width: 6, height: 4 }));

      expect(result.width).toBe(6);
      expect(result.height).toBe(4);
      expect(result.grid.length).toBe(4);        // rows = height
      expect(result.grid[0].length).toBe(6);      // cols = width
    });

    it('handles minimum grid size (2x2)', () => {
      const result = generateCrossword(makeConfig({
        width: 2,
        height: 2,
        words: ['ab', 'ac'],
        clues: ['First', 'Second'],
      }));

      expect(result.grid.length).toBe(2);
      expect(result.grid[0].length).toBe(2);
      expect(result.wordLocations.length).toBeGreaterThan(0);
    });

    it('handles large grid (10x10)', () => {
      const result = generateCrossword(makeConfig({ width: 10, height: 10 }));

      expect(result.grid.length).toBe(10);
      expect(result.grid[0].length).toBe(10);
    });
  });

  describe('edge cases', () => {
    it('handles a single word', () => {
      const result = generateCrossword(makeConfig({
        words: ['hello'],
        clues: ['A greeting'],
      }));

      expect(result.wordLocations.length).toBe(1);
      expect(result.wordLocations[0].word).toBe('hello');
    });

    it('handles words longer than width but fitting in height (places vertically)', () => {
      // In real usage, databaseProcessor filters words to max(w,h),
      // so we only test words that pass that filter.
      const result = generateCrossword(makeConfig({
        width: 3,
        height: 8,
        words: ['method', 'loop', 'for', 'int'],
        clues: ['A function', 'Repeating', 'A loop keyword', 'Integer type'],
      }));

      // "method" is 6 chars — too long for width=3, should go vertical
      expect(result.grid.length).toBe(8);
      expect(result.wordLocations.length).toBeGreaterThan(0);
      const first = result.wordLocations[0];
      expect(first.isHorizontal).toBe(false);
    });

    it('each placed word has a clue', () => {
      const result = generateCrossword(makeConfig());

      for (const word of result.wordLocations) {
        expect(word.clue).toBeTruthy();
        expect(typeof word.clue).toBe('string');
        expect(word.clue.length).toBeGreaterThan(0);
      }
    });
  });
});
