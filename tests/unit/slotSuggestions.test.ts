/**
 * Tests for skeleton slot word suggestions and auto-fill planning.
 */

import { describe, it, expect } from 'vitest';
import {
  getSuggestionWordsByLength,
  suggestWordsForSlot,
  planAutoFill,
} from '@logic/slotSuggestions';
import type { SkeletonSlot } from '@logic/types';

function slot(
  id: number,
  direction: 'across' | 'down',
  startX: number,
  startY: number,
  length: number,
  word?: string,
): SkeletonSlot {
  return {
    id,
    direction,
    startX,
    startY,
    length,
    constraints: new Map(),
    word,
    clue: word ? 'clue' : undefined,
    isUserWord: word !== undefined,
  };
}

describe('suggestion word list', () => {
  it('contains only lowercase words of the stated length', () => {
    for (const length of [3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) {
      const words = getSuggestionWordsByLength(length);
      expect(words.length).toBeGreaterThan(20);
      for (const word of words) {
        expect(word).toMatch(/^[a-z]+$/);
        expect(word.length).toBe(length);
      }
    }
  });

  it('contains no duplicates within a length', () => {
    for (const length of [3, 4, 5, 6, 7, 8]) {
      const words = getSuggestionWordsByLength(length);
      expect(new Set(words).size).toBe(words.length);
    }
  });
});

describe('suggestWordsForSlot', () => {
  it('returns words matching locked constraint letters', () => {
    const constraints = new Map([[0, 's'], [2, 'a']]);
    const results = suggestWordsForSlot(4, constraints, new Set(), 10);

    expect(results.length).toBeGreaterThan(0);
    for (const word of results) {
      expect(word.length).toBe(4);
      expect(word[0]).toBe('s');
      expect(word[2]).toBe('a');
    }
  });

  it('excludes words already used in the puzzle', () => {
    const all = suggestWordsForSlot(4, new Map(), new Set(), 5);
    const excluded = suggestWordsForSlot(4, new Map(), new Set([all[0]]), 5);
    expect(excluded).not.toContain(all[0]);
  });

  it('respects the limit', () => {
    expect(suggestWordsForSlot(5, new Map(), new Set(), 3).length).toBe(3);
  });

  it('returns empty for impossible constraints', () => {
    const constraints = new Map([[0, 'q'], [1, 'q'], [2, 'q']]);
    expect(suggestWordsForSlot(3, constraints, new Set(), 5)).toEqual([]);
  });
});

describe('planAutoFill', () => {
  it('fills crossing blank slots with mutually consistent words', () => {
    // Two blanks crossing at (2,2): across slot at row 2, down slot at col 2
    const slots = [
      slot(1, 'across', 0, 2, 5),
      slot(2, 'down', 2, 0, 5),
    ];

    const planned = planAutoFill(slots, new Map());

    expect(planned.size).toBe(2);
    const acrossWord = planned.get(1)!;
    const downWord = planned.get(2)!;
    // The shared cell (2,2) is across[2] and down[2]
    expect(acrossWord[2]).toBe(downWord[2]);
  });

  it('honors letters locked by user words', () => {
    // User word "plant" across at row 0; blank down slot crossing its 'p' at (0,0)
    const slots = [
      slot(1, 'across', 0, 0, 5, 'plant'),
      slot(2, 'down', 0, 0, 4),
    ];

    const planned = planAutoFill(slots, new Map());
    const downWord = planned.get(2)!;
    expect(downWord[0]).toBe('p');
  });

  it('respects existing user edits and does not overwrite them', () => {
    const slots = [
      slot(1, 'across', 0, 0, 4),
      slot(2, 'down', 0, 0, 4),
    ];
    const edits = new Map([[1, { word: 'fish' }]]);

    const planned = planAutoFill(slots, edits);

    expect(planned.has(1)).toBe(false); // already edited — left alone
    expect(planned.get(2)![0]).toBe('f'); // crossing letter honored
  });

  it('never reuses the same word twice', () => {
    const slots = [
      slot(1, 'across', 0, 0, 4),
      slot(2, 'across', 0, 2, 4),
      slot(3, 'across', 0, 4, 4),
    ];

    const planned = planAutoFill(slots, new Map());
    const words = [...planned.values()];
    expect(new Set(words).size).toBe(words.length);
  });

  it('is deterministic', () => {
    const slots = [
      slot(1, 'across', 0, 2, 5),
      slot(2, 'down', 2, 0, 5),
    ];
    const a = planAutoFill(slots, new Map());
    const b = planAutoFill(slots, new Map());
    expect([...a.entries()]).toEqual([...b.entries()]);
  });
});
