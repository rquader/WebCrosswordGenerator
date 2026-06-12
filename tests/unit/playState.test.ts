/**
 * Play-state helpers — the pure logic behind the Play tab's progress
 * counting and hint budget (Phase 12 solve experience).
 *
 * The hook itself is React state; these helpers carry the rules, so they
 * are tested directly: correct-count never counts wrong letters, the hint
 * budget is a hard cap, and hint-word resolves the exact word under the
 * cursor.
 */

import { describe, it, expect } from 'vitest';
import {
  countCorrectCells,
  getWordCellsAt,
  canUseHint,
  HINT_BUDGET,
  HINT_TIME_PENALTY,
  HINT_WORD_TIME_PENALTY,
} from '../../src/hooks/usePuzzleState';
import type { CrosswordResult } from '../../src/logic/types';

/** 3×3 puzzle: CAT across the top, ART down through the middle.
 *    C A T
 *    - R -
 *    - T -
 */
const puzzle: CrosswordResult = {
  grid: [
    ['c', 'a', 't'],
    ['-', 'r', '-'],
    ['-', 't', '-'],
  ],
  wordLocations: [
    { word: 'cat', isHorizontal: true, isReversed: false, clue: 'Feline', x: 0, y: 0 },
    { word: 'art', isHorizontal: false, isReversed: false, clue: 'Gallery fare', x: 1, y: 0 },
  ],
  width: 3,
  height: 3,
};

function emptyUserGrid(): string[][] {
  return [
    ['', '', ''],
    ['', '', ''],
    ['', '', ''],
  ];
}

describe('countCorrectCells', () => {
  it('counts only letters that match the answer', () => {
    const userGrid = emptyUserGrid();
    userGrid[0][0] = 'C'; // correct
    userGrid[0][1] = 'A'; // correct
    userGrid[1][1] = 'X'; // wrong
    expect(countCorrectCells(userGrid, puzzle)).toBe(2);
  });

  it('is case-insensitive and ignores empty cells', () => {
    const userGrid = emptyUserGrid();
    userGrid[0][2] = 't'; // lowercase still correct
    expect(countCorrectCells(userGrid, puzzle)).toBe(1);
  });

  it('never counts blocked cells', () => {
    const userGrid = emptyUserGrid();
    userGrid[1][0] = '-'; // junk written over a blocked cell
    expect(countCorrectCells(userGrid, puzzle)).toBe(0);
  });
});

describe('hint budget', () => {
  it('allows hints until the budget is spent, then refuses', () => {
    for (let used = 0; used < HINT_BUDGET; used++) {
      expect(canUseHint(used)).toBe(true);
    }
    expect(canUseHint(HINT_BUDGET)).toBe(false);
    expect(canUseHint(HINT_BUDGET + 1)).toBe(false);
  });

  it('pins the agreed costs: 3 hints, 15s per letter, 45s per word', () => {
    expect(HINT_BUDGET).toBe(3);
    expect(HINT_TIME_PENALTY).toBe(15);
    expect(HINT_WORD_TIME_PENALTY).toBe(45);
  });
});

describe('getWordCellsAt', () => {
  it('returns the across word covering the cell', () => {
    const cells = getWordCellsAt(puzzle, 1, 0, true);
    expect(cells).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    ]);
  });

  it('returns the down word covering the cell', () => {
    const cells = getWordCellsAt(puzzle, 1, 1, false);
    expect(cells).toEqual([
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
    ]);
  });

  it('returns nothing when no word runs through the cell in that direction', () => {
    expect(getWordCellsAt(puzzle, 0, 0, false)).toEqual([]);
  });
});
