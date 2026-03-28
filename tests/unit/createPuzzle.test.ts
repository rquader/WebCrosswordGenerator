/**
 * Tests for the high-level puzzle creation functions.
 * These verify that filtering + generation work together correctly,
 * matching the Java version's CrosswordUI.generateCrossword() behavior.
 */

import { describe, it, expect } from 'vitest';
import { createPuzzleFromPreset, createPuzzleFromCustom } from '@logic/createPuzzle';

describe('createPuzzleFromPreset', () => {
  it('generates a puzzle from a valid category', () => {
    const result = createPuzzleFromPreset({
      categoryId: 'unit_1',
      width: 8,
      height: 8,
      seed: 42,
    });

    expect(result.grid.length).toBe(8);
    expect(result.grid[0].length).toBe(8);
    expect(result.wordLocations.length).toBeGreaterThan(0);
  });

  it('throws for unknown category', () => {
    expect(() => {
      createPuzzleFromPreset({
        categoryId: 'nonexistent',
        width: 5,
        height: 5,
        seed: 1,
      });
    }).toThrow('Unknown category');
  });

  it('filters words to fit grid — no placed word exceeds max dimension', () => {
    const result = createPuzzleFromPreset({
      categoryId: 'unit_1',
      width: 5,
      height: 5,
      seed: 100,
    });

    const maxDim = 5;
    for (const word of result.wordLocations) {
      expect(word.word.length).toBeLessThanOrEqual(maxDim);
    }
  });

  it('is reproducible with the same seed', () => {
    const options = { categoryId: 'english', width: 7, height: 7, seed: 999 };
    const result1 = createPuzzleFromPreset(options);
    const result2 = createPuzzleFromPreset(options);

    expect(result1.grid).toEqual(result2.grid);
    expect(result1.wordLocations.length).toBe(result2.wordLocations.length);
  });

  it('works with all preset categories', () => {
    const categories = [
      'unit_1', 'unit_2', 'unit_3', 'unit_4',
      'unit_5', 'unit_6', 'unit_7', 'unit_8', 'english',
    ];

    for (const id of categories) {
      const result = createPuzzleFromPreset({
        categoryId: id,
        width: 8,
        height: 8,
        seed: 42,
      });

      expect(result.wordLocations.length).toBeGreaterThan(0);
    }
  });
});

describe('createPuzzleFromCustom', () => {
  it('generates a puzzle from custom entries', () => {
    const result = createPuzzleFromCustom({
      entries: [
        { word: 'react', clue: 'A UI library' },
        { word: 'vite', clue: 'A fast build tool' },
        { word: 'node', clue: 'JS runtime' },
        { word: 'type', clue: 'TS feature' },
      ],
      width: 6,
      height: 6,
      seed: 77,
    });

    expect(result.wordLocations.length).toBeGreaterThan(0);
  });

  it('filters custom entries by max dimension', () => {
    const result = createPuzzleFromCustom({
      entries: [
        { word: 'hi', clue: 'Greeting' },
        { word: 'toolongforsmallgrid', clue: 'Should be filtered out' },
      ],
      width: 4,
      height: 4,
      seed: 1,
    });

    // Only 'hi' should have been eligible (length 2 <= 4)
    for (const word of result.wordLocations) {
      expect(word.word.length).toBeLessThanOrEqual(4);
    }
  });
});
