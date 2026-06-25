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
  nextCellAfterTyping,
  prevCellForBackspace,
  firstEmptyCellOfNextUnfilledClue,
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

/**
 * B1 — auto-advance / backspace must stay inside the current word and never
 * cross a black cell into a neighbouring entry; at a word's end the cursor
 * jumps to the next unfilled clue. This fixture puts TWO across words on the
 * same row separated by a block — the exact "typed past the word over a black
 * cell into the next word" bug Rafan hit on a real device.
 *
 *    columns:  0 1 2 3 4
 *    row 0:    C A T . D O G    -> but width is 5, so:
 *
 * 5×3 grid:
 *    C A T . .       1-Across CAT (0,0), 3-Across is on row 2
 *    R . . . .       1-Down  CR. -> use RC? keep simple:
 *    O W L . .
 *
 * Concretely:
 *    row 0:  C A T - -
 *    row 1:  O - - - -
 *    row 2:  W - - - -    (1-Down = COW, vertical at x=0)
 * plus a second across word so "jump to next clue" has somewhere to go:
 *    row 2:  W I N - -    -> OWL? Let's define cleanly below.
 */
const b1Puzzle: CrosswordResult = {
  // C A T . .
  // O . . . .
  // W I N . .
  grid: [
    ['c', 'a', 't', '-', '-'],
    ['o', '-', '-', '-', '-'],
    ['w', 'i', 'n', '-', '-'],
  ],
  wordLocations: [
    { word: 'cat', isHorizontal: true, isReversed: false, clue: 'Feline', x: 0, y: 0 },     // 1-Across
    { word: 'cow', isHorizontal: false, isReversed: false, clue: 'Moo', x: 0, y: 0 },        // 1-Down
    { word: 'win', isHorizontal: true, isReversed: false, clue: 'Triumph', x: 0, y: 2 },     // 3-Across
  ],
  width: 5,
  height: 3,
};

function b1Empty(): string[][] {
  return [
    ['', '', '', '', ''],
    ['', '', '', '', ''],
    ['', '', '', '', ''],
  ];
}

describe('B1 — auto-advance stays in the word and never crosses a black cell', () => {
  it('advances to the next empty cell within the word', () => {
    const grid = b1Empty();
    grid[0][0] = 'C'; // just typed C of CAT
    const next = nextCellAfterTyping(b1Puzzle, grid, true, 0, 0);
    expect(next).toEqual({ x: 1, y: 0, isAcross: true }); // -> A
  });

  it('at the LAST cell of an across word, never steps over the trailing black cell', () => {
    // Fill CAT fully; typing into the T (2,0) must NOT advance to (3,0) which
    // is a black cell, nor to any cell on row 0 past the block.
    const grid = b1Empty();
    grid[0][0] = 'C';
    grid[0][1] = 'A';
    grid[0][2] = 'T';
    const next = nextCellAfterTyping(b1Puzzle, grid, true, 2, 0);
    // CAT is full → jump to the next unfilled clue (1-Down COW's next gap, or
    // 3-Across). Whatever it is, it must be a real lettered cell, not (3,0).
    expect(next).not.toBeNull();
    expect(b1Puzzle.grid[next!.y][next!.x]).not.toBe('-');
    // Specifically it must not be the black cell to the right of T.
    expect(next).not.toEqual({ x: 3, y: 0, isAcross: true });
  });

  it('jumps to the next unfilled clue when the current word is full', () => {
    // CAT done; cursor in CAT typing its last letter. COW shares C (already
    // filled) but O,W are empty → the next unfilled clue in order is 1-Down.
    const grid = b1Empty();
    grid[0][0] = 'C';
    grid[0][1] = 'A';
    grid[0][2] = 'T';
    const next = nextCellAfterTyping(b1Puzzle, grid, true, 2, 0);
    // 1-Down COW: first empty cell is (0,1) reading Down.
    expect(next).toEqual({ x: 0, y: 1, isAcross: false });
  });

  it('skips already-filled cells of the next clue to land on its first gap', () => {
    // Fill CAT and the C/O of COW, leaving only W (0,2). Typing the end of CAT
    // should land on (0,2), COW's only remaining gap.
    const grid = b1Empty();
    grid[0][0] = 'C';
    grid[0][1] = 'A';
    grid[0][2] = 'T';
    grid[1][0] = 'O';
    const next = nextCellAfterTyping(b1Puzzle, grid, true, 2, 0);
    expect(next).toEqual({ x: 0, y: 2, isAcross: false });
  });

  it('returns null when every clue is full (no surprise jump)', () => {
    const grid = [
      ['C', 'A', 'T', '', ''],
      ['O', '', '', '', ''],
      ['W', 'I', 'N', '', ''],
    ];
    expect(nextCellAfterTyping(b1Puzzle, grid, true, 2, 0)).toBeNull();
  });
});

describe('B1 — backspace retreat stays in the word', () => {
  it('steps back one cell within the word', () => {
    expect(prevCellForBackspace(b1Puzzle, true, 2, 0)).toEqual({ x: 1, y: 0 });
  });

  it('stays put at the first cell of the word (no jump across a block)', () => {
    expect(prevCellForBackspace(b1Puzzle, true, 0, 0)).toBeNull();
    // Down word too: top of COW.
    expect(prevCellForBackspace(b1Puzzle, false, 0, 0)).toBeNull();
  });
});

describe('firstEmptyCellOfNextUnfilledClue — ordered wrapping search', () => {
  it('wraps from the last clue back to an earlier unfilled one', () => {
    // Everything full except COW's W (0,2). From 3-Across WIN (last clue) it
    // wraps to find 1-Down's gap.
    const grid = [
      ['C', 'A', 'T', '', ''],
      ['O', '', '', '', ''],
      ['', 'I', 'N', '', ''],
    ];
    // From WIN (3-Across) at (2,2):
    const next = firstEmptyCellOfNextUnfilledClue(b1Puzzle, grid, true, 2, 2);
    expect(next).toEqual({ x: 0, y: 2, isAcross: false });
  });
});
