/**
 * Tests for gridSkeleton.ts — geometry-based slot derivation for the
 * skeleton-first ("build your own grid") flow.
 *
 * The user draws a grid of open / block cells. We turn that geometry into
 * SkeletonSlots (maximal open runs of length >= 2), numbered exactly as the
 * finished puzzle would be by numbering.ts/assignNumbers.
 */

import { describe, it, expect } from 'vitest';
import {
  deriveSlotsFromBlockMask,
  computeIntersections,
  findStrayOpenCells,
  countComponents,
  type BlockMask,
} from '../../src/logic/gridSkeleton';
import { assignNumbers } from '../../src/logic/numbering';
import type { DirectionalWord, SkeletonSlot } from '../../src/logic/types';

/**
 * Build a BlockMask (boolean[][], true = block) from a visual string grid.
 * '#' = block, anything else (typically '.') = open. One row per line.
 */
function maskFromRows(rows: string[]): { mask: BlockMask; width: number; height: number } {
  const mask = rows.map(row => row.split('').map(ch => ch === '#'));
  const height = mask.length;
  const width = height > 0 ? mask[0].length : 0;
  return { mask, width, height };
}

/**
 * Convert derived slots into DirectionalWords (with placeholder letters) so we
 * can feed them to assignNumbers — the authoritative numbering used by Play /
 * Export — and prove our slot numbers match it cell-for-cell.
 */
function slotsToDirectionalWords(slots: SkeletonSlot[]): DirectionalWord[] {
  return slots.map(slot => ({
    word: 'x'.repeat(slot.length),
    isHorizontal: slot.direction === 'across',
    isReversed: false,
    clue: '',
    x: slot.startX,
    y: slot.startY,
  }));
}

describe('deriveSlotsFromBlockMask — slot geometry', () => {
  it('finds across + down runs in a known 5x5 mask with exact start/length/direction/number', () => {
    // 5x5. '#' blocks, '.' open.
    //   col: 01234
    // row 0: .....   -> across run cols 0-4 (len 5)
    // row 1: .#.#.   -> no across run >= 2; columns split
    // row 2: .....   -> across run cols 0-4 (len 5)
    // row 3: .#.#.
    // row 4: .....   -> across run cols 0-4 (len 5)
    const { mask, width, height } = maskFromRows([
      '.....',
      '.#.#.',
      '.....',
      '.#.#.',
      '.....',
    ]);

    const result = deriveSlotsFromBlockMask(mask, width, height);

    // Group slots for easy assertions.
    const across = result.slots.filter(s => s.direction === 'across');
    const down = result.slots.filter(s => s.direction === 'down');

    // Across runs: rows 0, 2, 4 each span cols 0-4 (length 5).
    expect(across).toHaveLength(3);
    expect(across.map(s => ({ x: s.startX, y: s.startY, len: s.length }))).toEqual([
      { x: 0, y: 0, len: 5 },
      { x: 0, y: 2, len: 5 },
      { x: 0, y: 4, len: 5 },
    ]);

    // Down runs: columns 0, 2, 4 each span rows 0-4 (length 5).
    expect(down).toHaveLength(3);
    expect(down.map(s => ({ x: s.startX, y: s.startY, len: s.length }))).toEqual([
      { x: 0, y: 0, len: 5 },
      { x: 2, y: 0, len: 5 },
      { x: 4, y: 0, len: 5 },
    ]);

    // Numbering (row-major, across+down share a number at the same start cell):
    //   (0,0) across+down  -> 1
    //   (2,0) down         -> 2
    //   (4,0) down         -> 3
    //   (0,2) across       -> 4
    //   (0,4) across       -> 5
    const numberAt = (dir: 'across' | 'down', x: number, y: number) =>
      result.slots.find(s => s.direction === dir && s.startX === x && s.startY === y)!.id;

    expect(numberAt('across', 0, 0)).toBe(1);
    expect(numberAt('down', 0, 0)).toBe(1); // shares with across at (0,0)
    expect(numberAt('down', 2, 0)).toBe(2);
    expect(numberAt('down', 4, 0)).toBe(3);
    expect(numberAt('across', 0, 2)).toBe(4);
    expect(numberAt('across', 0, 4)).toBe(5);

    // Constraints start empty (no letters placed yet).
    for (const slot of result.slots) {
      expect(slot.constraints.size).toBe(0);
      expect(slot.word).toBeUndefined();
      expect(slot.isUserWord).toBe(false);
    }

    // Grid is all EMPTY_CELL ('-'), dimensions correct.
    expect(result.width).toBe(5);
    expect(result.height).toBe(5);
    expect(result.grid).toHaveLength(5);
    expect(result.grid.every(row => row.length === 5 && row.every(c => c === '-'))).toBe(true);

    // No words placed yet → all count fields zero.
    expect(result.mustPlacedCount).toBe(0);
    expect(result.mustTotalCount).toBe(0);
    expect(result.canPlacedCount).toBe(0);
    expect(result.canTotalCount).toBe(0);
    expect(result.failures).toEqual([]);
  });

  it('ignores length-1 runs (single open cell between blocks is not a slot)', () => {
    // row 0: .#.  -> two isolated single cells, no across slot
    // row 1: ...  -> across run cols 0-2 (len 3)
    // row 2: .#.
    const { mask, width, height } = maskFromRows([
      '.#.',
      '...',
      '.#.',
    ]);

    const result = deriveSlotsFromBlockMask(mask, width, height);
    const across = result.slots.filter(s => s.direction === 'across');
    const down = result.slots.filter(s => s.direction === 'down');

    // Only the middle row forms an across slot.
    expect(across).toHaveLength(1);
    expect(across[0]).toMatchObject({ startX: 0, startY: 1, length: 3 });

    // Columns 0 and 2 are full open (len 3 each); column 1 is all blocks.
    expect(down).toHaveLength(2);
    expect(down.map(s => s.startX).sort()).toEqual([0, 2]);
    expect(down.every(s => s.length === 3 && s.startY === 0)).toBe(true);
  });

  it('all-open grid: every full row is an across slot, every full column a down slot', () => {
    const { mask, width, height } = maskFromRows([
      '....',
      '....',
      '....',
    ]); // 3 rows x 4 cols

    const result = deriveSlotsFromBlockMask(mask, width, height);
    const across = result.slots.filter(s => s.direction === 'across');
    const down = result.slots.filter(s => s.direction === 'down');

    expect(across).toHaveLength(3); // 3 rows
    expect(across.every(s => s.startX === 0 && s.length === 4)).toBe(true);
    expect(down).toHaveLength(4); // 4 columns
    expect(down.every(s => s.startY === 0 && s.length === 3)).toBe(true);
  });

  it('all-block grid: zero slots, grid still full size of empty cells', () => {
    const { mask, width, height } = maskFromRows([
      '###',
      '###',
    ]);

    const result = deriveSlotsFromBlockMask(mask, width, height);
    expect(result.slots).toHaveLength(0);
    expect(result.width).toBe(3);
    expect(result.height).toBe(2);
    expect(result.grid.every(row => row.every(c => c === '-'))).toBe(true);
  });

  it('1x1 grid (single open cell): zero slots', () => {
    const { mask, width, height } = maskFromRows(['.']);
    const result = deriveSlotsFromBlockMask(mask, width, height);
    expect(result.slots).toHaveLength(0);
    expect(result.width).toBe(1);
    expect(result.height).toBe(1);
  });
});

describe('numbering parity with assignNumbers', () => {
  /**
   * For any mask, the slot numbers we assign must equal the numbers
   * assignNumbers would assign when the finished grid (same word positions)
   * goes through Play / Export. We verify cell-for-cell.
   */
  function assertParity(rows: string[]) {
    const { mask, width, height } = maskFromRows(rows);
    const result = deriveSlotsFromBlockMask(mask, width, height);

    const words = slotsToDirectionalWords(result.slots);
    const { acrossClues, downClues } = assignNumbers(words, width, height);

    // Build expected number lookups keyed by start cell + direction.
    const expectedAcross = new Map<string, number>();
    for (const c of acrossClues) expectedAcross.set(`${c.x},${c.y}`, c.number);
    const expectedDown = new Map<string, number>();
    for (const c of downClues) expectedDown.set(`${c.x},${c.y}`, c.number);

    // Same slot count both ways (no slot dropped/added).
    expect(acrossClues.length).toBe(result.slots.filter(s => s.direction === 'across').length);
    expect(downClues.length).toBe(result.slots.filter(s => s.direction === 'down').length);

    for (const slot of result.slots) {
      const key = `${slot.startX},${slot.startY}`;
      const expected = slot.direction === 'across'
        ? expectedAcross.get(key)
        : expectedDown.get(key);
      expect(expected, `slot ${slot.direction} at ${key}`).toBe(slot.id);
    }
  }

  it('matches assignNumbers on the 5x5 cross-grid', () => {
    assertParity(['.....', '.#.#.', '.....', '.#.#.', '.....']);
  });

  it('matches assignNumbers on an irregular mask', () => {
    assertParity([
      '..#..',
      '.###.',
      '.....',
      '#...#',
      '..#..',
    ]);
  });

  it('matches assignNumbers on an all-open rectangle', () => {
    assertParity(['......', '......', '......', '......']);
  });

  it('matches assignNumbers on a mask with isolated stray cells', () => {
    // Includes single open cells that form no slot — these must NOT get numbers
    // on either side, so parity still holds.
    assertParity([
      '.#.#.',
      '#...#',
      '.#.#.',
    ]);
  });
});

describe('computeIntersections', () => {
  it('reports the shared positions for a simple cross', () => {
    // 3x3, plus shape:
    //   .#.   -> col 1 blocked at rows 0 & 2? No: make a clean cross.
    // Use:
    // row 0: #.#
    // row 1: ...
    // row 2: #.#
    // Across slot: row 1 cols 0-2 (len 3). Down slot: col 1 rows 0-2 (len 3).
    // They cross at (1,1): across position 1, down position 1.
    const { mask, width, height } = maskFromRows([
      '#.#',
      '...',
      '#.#',
    ]);
    const result = deriveSlotsFromBlockMask(mask, width, height);
    const across = result.slots.find(s => s.direction === 'across')!;
    const down = result.slots.find(s => s.direction === 'down')!;

    const crossings = computeIntersections(result.slots);
    expect(crossings).toHaveLength(1);
    const x = crossings[0];
    expect(x.acrossSlotId).toBe(across.id);
    expect(x.downSlotId).toBe(down.id);
    expect(x.x).toBe(1);
    expect(x.y).toBe(1);
    expect(x.acrossPos).toBe(1); // (1,1) is 1 cell into the across run starting at x=0
    expect(x.downPos).toBe(1); // 1 cell into the down run starting at y=0
  });

  it('reports multiple crossings and correct positions on the 5x5 cross-grid', () => {
    const { mask, width, height } = maskFromRows([
      '.....',
      '.#.#.',
      '.....',
      '.#.#.',
      '.....',
    ]);
    const result = deriveSlotsFromBlockMask(mask, width, height);
    const crossings = computeIntersections(result.slots);

    // 3 across slots (rows 0,2,4) x 3 down slots (cols 0,2,4) each share exactly
    // one cell -> 9 crossings.
    expect(crossings).toHaveLength(9);

    // Spot-check the crossing of across@(0,2) with down@(4,0): shared cell (4,2).
    const acrossRow2 = result.slots.find(s => s.direction === 'across' && s.startY === 2)!;
    const downCol4 = result.slots.find(s => s.direction === 'down' && s.startX === 4)!;
    const c = crossings.find(k => k.acrossSlotId === acrossRow2.id && k.downSlotId === downCol4.id)!;
    expect(c).toBeDefined();
    expect(c.x).toBe(4);
    expect(c.y).toBe(2);
    expect(c.acrossPos).toBe(4); // 4 cells into row 2's across run (starts x=0)
    expect(c.downPos).toBe(2); // 2 cells into col 4's down run (starts y=0)
  });

  it('returns no crossings when across and down slots never share a cell', () => {
    // Across on row 0, down on a column it doesn't reach.
    // row 0: ...#   across cols 0-2 (len 3)
    // row 1: ###.   down col 3 rows 1-2 (len 2)
    // row 2: ###.
    const { mask, width, height } = maskFromRows([
      '...#',
      '###.',
      '###.',
    ]);
    const result = deriveSlotsFromBlockMask(mask, width, height);
    expect(computeIntersections(result.slots)).toHaveLength(0);
  });
});

describe('findStrayOpenCells', () => {
  it('flags isolated open cells and length-1 runs, not cells in real slots', () => {
    // row 0: .#.   -> (0,0) and (2,0): each is its own column-top; need to check
    // row 1: ###   -> all blocks
    // row 2: ...   -> across run cols 0-2 (len 3) — none of these are stray
    //
    // (0,0): across? left edge, right is block -> len-1. down? below is block -> len-1.
    //        => stray.
    // (2,0): symmetric => stray.
    // Row 2 cells belong to the across slot => not stray.
    const { mask, width, height } = maskFromRows([
      '.#.',
      '###',
      '...',
    ]);
    const strays = findStrayOpenCells(mask, width, height);
    const set = new Set(strays.map(p => `${p.x},${p.y}`));
    expect(set.has('0,0')).toBe(true);
    expect(set.has('2,0')).toBe(true);
    // Row 2 cells are part of a slot.
    expect(set.has('0,2')).toBe(false);
    expect(set.has('1,2')).toBe(false);
    expect(set.has('2,2')).toBe(false);
    expect(strays).toHaveLength(2);
  });

  it('a cell that is part of a down slot but not any across slot is NOT stray', () => {
    // Vertical bar only:
    // row 0: .##
    // row 1: .##
    // (0,0)-(0,1) form a down slot (len 2). Even though neither is in an across
    // slot, they belong to the down slot -> not stray.
    const { mask, width, height } = maskFromRows([
      '.##',
      '.##',
    ]);
    expect(findStrayOpenCells(mask, width, height)).toHaveLength(0);
  });

  it('all-open grid has no strays', () => {
    const { mask, width, height } = maskFromRows(['...', '...']);
    expect(findStrayOpenCells(mask, width, height)).toHaveLength(0);
  });

  it('single open cell in a 1x1 grid is stray', () => {
    const { mask, width, height } = maskFromRows(['.']);
    const strays = findStrayOpenCells(mask, width, height);
    expect(strays).toEqual([{ x: 0, y: 0 }]);
  });
});

describe('countComponents', () => {
  it('one connected cluster -> 1', () => {
    const { mask, width, height } = maskFromRows([
      '#.#',
      '...',
      '#.#',
    ]);
    const result = deriveSlotsFromBlockMask(mask, width, height);
    expect(countComponents(result.slots)).toBe(1);
  });

  it('two disconnected clusters -> 2', () => {
    // Top-left cross and bottom-right cross, separated by blocks.
    //   col:  0123456
    // row 0:  #.#....   left down col1; right across row0 cols 3-6
    // Simplify to two separate 2x2-ish blocks of slots.
    // Left block (rows 0-1, cols 0-1):
    //   ..#....
    //   ..#....
    // Right block (rows 0-1, cols 4-5):
    // Actually build cleanly:
    // row 0: ..#..
    // row 1: ..#..
    // Left: cols 0-1 each down len 2, plus across rows? row0 cols0-1 across len2,
    //       row1 cols0-1 across len2. Right: cols 3-4 mirror. Column 2 all blocks
    //       separates them. No across spans the block, so two components.
    const { mask, width, height } = maskFromRows([
      '..#..',
      '..#..',
    ]);
    const result = deriveSlotsFromBlockMask(mask, width, height);
    expect(countComponents(result.slots)).toBe(2);
  });

  it('zero slots -> 0 components', () => {
    const { mask, width, height } = maskFromRows(['###', '###']);
    const result = deriveSlotsFromBlockMask(mask, width, height);
    expect(countComponents(result.slots)).toBe(0);
  });

  it('three separate single-slot clusters -> 3', () => {
    // Three horizontal bars separated by all-block rows; no column spans two bars.
    // row 0: ..   across len2
    // row 1: ##
    // row 2: ..   across len2
    // row 3: ##
    // row 4: ..   across len2
    const { mask, width, height } = maskFromRows([
      '..',
      '##',
      '..',
      '##',
      '..',
    ]);
    const result = deriveSlotsFromBlockMask(mask, width, height);
    // Each open row is an across slot (len 2); columns are broken by block rows so
    // no down slots. 3 across slots, none sharing a cell -> 3 components.
    expect(result.slots.filter(s => s.direction === 'across')).toHaveLength(3);
    expect(result.slots.filter(s => s.direction === 'down')).toHaveLength(0);
    expect(countComponents(result.slots)).toBe(3);
  });
});
