/**
 * Tests for the high-level puzzle creation helpers.
 */

import { describe, it, expect } from 'vitest';
import { createPuzzleFromEntries, createSkeletonFromEntries, createWordSearchFromEntries } from '@logic/createPuzzle';
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

describe('two-word phrases (display vs grid form)', () => {
  const phraseEntries = [
    { word: 'extra time', clue: 'Minutes added after a draw' },
    { word: 'goalkeeper', clue: 'Guards the goal' },
    { word: 'corner', clue: 'Kick from the flag' },
    { word: 'offside', clue: 'Past the last defender' },
  ];

  it('places the solid grid form and keeps the spaced display form', () => {
    const result = createPuzzleFromEntries({
      entries: phraseEntries,
      width: 12,
      height: 12,
      seed: 11,
    });

    const phrase = result.wordLocations.find(w => w.word === 'extratime');
    expect(phrase).toBeDefined();
    expect(phrase!.displayWord).toBe('extra time');

    const single = result.wordLocations.find(w => w.word === 'goalkeeper');
    expect(single).toBeDefined();
    expect(single!.displayWord).toBeUndefined();

    // No space character ever lands in a cell
    for (const row of result.grid) {
      expect(row).not.toContain(' ');
    }
  });

  it('skeleton slots carry the display form for user words', () => {
    const result = createSkeletonFromEntries({
      entries: phraseEntries.map(e => ({ ...e, priority: 'must' as const })),
      width: 12,
      height: 12,
      seed: 3,
      bankFill: false,
    });

    const slot = result.slots.find(s => s.word === 'extratime');
    expect(slot).toBeDefined();
    expect(slot!.displayWord).toBe('extra time');
  });

  it('word search places the solid form and reports skips in display form', () => {
    const placed = createWordSearchFromEntries({
      entries: phraseEntries,
      width: 12,
      height: 12,
      seed: 5,
    });
    const phrase = placed.wordLocations.find(w => w.word === 'extratime');
    expect(phrase).toBeDefined();
    expect(phrase!.displayWord).toBe('extra time');

    // Pin a grid too small for the 9-letter phrase: the skip report
    // shows the teacher's own spelling, space included.
    const skipped = createWordSearchFromEntries({
      entries: [{ word: 'extra time', clue: '' }, { word: 'goal', clue: '' }],
      width: 5,
      height: 5,
      seed: 5,
      growToFit: false,
    });
    expect(skipped.skippedWords).toContain('extra time');
  });
});
