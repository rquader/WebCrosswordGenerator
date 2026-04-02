/**
 * Tests for the high-level puzzle creation helpers.
 */

import { describe, it, expect } from 'vitest';
import { createPuzzleFromEntries } from '@logic/createPuzzle';

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
