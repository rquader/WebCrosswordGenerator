/**
 * Tests for the high-level puzzle creation helpers.
 */

import { describe, it, expect } from 'vitest';
import { createPuzzleFromEntries, createSkeletonFromEntries } from '@logic/createPuzzle';
import type { PrioritizedEntry } from '@logic/types';

const entries = [
  { word: 'react', clue: 'A UI library' },
  { word: 'vite', clue: 'A fast build tool' },
  { word: 'node', clue: 'JS runtime' },
  { word: 'type', clue: 'TS feature' },
];

describe('createPuzzleFromEntries', () => {
  it('generates a puzzle from valid entries', () => {
    const result = createPuzzleFromEntries({
      entries,
      width: 8,
      height: 8,
      seed: 42,
    });

    expect(result.grid.length).toBe(8);
    expect(result.grid[0].length).toBe(8);
    expect(result.wordLocations.length).toBeGreaterThan(0);
  });

  it('filters words to fit the grid', () => {
    const result = createPuzzleFromEntries({
      entries: [
        { word: 'hi', clue: 'Greeting' },
        { word: 'toolongforsmallgrid', clue: 'Should be filtered out' },
      ],
      width: 4,
      height: 4,
      seed: 100,
    });

    for (const word of result.wordLocations) {
      expect(word.word.length).toBeLessThanOrEqual(4);
    }
  });

  it('is reproducible with the same seed', () => {
    const options = { entries, width: 7, height: 7, seed: 999 };
    const result1 = createPuzzleFromEntries(options);
    const result2 = createPuzzleFromEntries(options);

    expect(result1.grid).toEqual(result2.grid);
    expect(result1.wordLocations.length).toBe(result2.wordLocations.length);
  });

  it('throws when no entries fit the current grid', () => {
    expect(() => {
      createPuzzleFromEntries({
        entries: [
          { word: 'lengthy', clue: 'Too long' },
          { word: 'anotherlongword', clue: 'Still too long' },
        ],
        width: 3,
        height: 3,
        seed: 1,
      });
    }).toThrow('No entries fit within the current grid dimensions');
  });
});

describe('createSkeletonFromEntries — growToFit pass-through', () => {
  // Deliberately too dense for 8x8: ~80 letters against 64 cells.
  const denseEntries: PrioritizedEntry[] = [
    'absolute', 'boundary', 'calendar', 'dominant', 'elephant',
    'festival', 'graduate', 'hospital', 'industry', 'junction',
  ].map(word => ({ word, clue: `Clue for ${word}`, priority: 'must' as const }));

  it('grows the grid by default so every must word places', () => {
    const result = createSkeletonFromEntries({
      entries: denseEntries,
      width: 8,
      height: 8,
      seed: 42,
    });

    expect(result.failures).toHaveLength(0);
    expect(result.mustPlacedCount).toBe(denseEntries.length);
    expect(result.grewFrom).toEqual({ width: 8, height: 8 });
    expect(result.width).toBeGreaterThan(8);
  });

  it('honors exact dimensions with growToFit: false (Force Dimensions path)', () => {
    const result = createSkeletonFromEntries({
      entries: denseEntries,
      width: 8,
      height: 8,
      seed: 42,
      growToFit: false,
    });

    // The grid must stay pinned at the requested size, with honest failures.
    expect(result.width).toBe(8);
    expect(result.height).toBe(8);
    expect(result.grewFrom).toBeUndefined();
    expect(result.failures.length).toBeGreaterThan(0);
    expect(result.mustPlacedCount + result.failures.length).toBe(denseEntries.length);
  });

  it('reports no failures at a pinned size that fits everything', () => {
    const easyEntries: PrioritizedEntry[] = [
      { word: 'react', clue: 'UI library', priority: 'must' },
      { word: 'node', clue: 'JS runtime', priority: 'must' },
      { word: 'type', clue: 'TS feature', priority: 'must' },
    ];

    const result = createSkeletonFromEntries({
      entries: easyEntries,
      width: 12,
      height: 12,
      seed: 7,
      growToFit: false,
    });

    expect(result.width).toBe(12);
    expect(result.height).toBe(12);
    expect(result.failures).toHaveLength(0);
    expect(result.mustPlacedCount).toBe(3);
  });
});
