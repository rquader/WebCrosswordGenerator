/**
 * Tests for the pure glue behind the "Fill with AI" stage of the skeleton-first
 * ("build your own grid") flow (src/logic/skeletonAiFill.ts).
 *
 * The view's job is clipboard + layout; the data flow it depends on — turning a
 * parsed AI response into a fully filled, editable set of slot assignments — is
 * pure and lives here. We exercise it on REAL geometry (deriveSlotsFromBlockMask
 * + computeIntersections) so the slot/intersection shapes match production.
 */

import { describe, it, expect } from 'vitest';
import {
  deriveSlotsFromBlockMask,
  computeIntersections,
  type BlockMask,
} from '../../src/logic/gridSkeleton';
import { emptyFillGrid, solveSkeletonFill } from '../../src/logic/skeletonAiFill';
import { parseSkeletonFillResponse } from '../../src/utils/skeletonFillPrompt';

/** '#' = block, anything else = open. One row per string. */
function maskFromRows(rows: string[]): { mask: BlockMask; width: number; height: number } {
  const mask = rows.map(row => row.split('').map(ch => ch === '#'));
  const height = mask.length;
  const width = height > 0 ? mask[0].length : 0;
  return { mask, width, height };
}

/** A 5x5 plus: one across slot, one down slot, one crossing at the center. */
const PLUS_ROWS = [
  '##.##',
  '##.##',
  '.....',
  '##.##',
  '##.##',
];

function plusFixture() {
  const { mask, width, height } = maskFromRows(PLUS_ROWS);
  const { slots } = deriveSlotsFromBlockMask(mask, width, height);
  const intersections = computeIntersections(slots);
  return { slots, intersections, width, height };
}

describe('emptyFillGrid', () => {
  it('builds an all-empty grid of the requested size', () => {
    const grid = emptyFillGrid(4, 3);
    expect(grid.length).toBe(3); // height rows
    expect(grid[0].length).toBe(4); // width cols
    expect(grid.every(row => row.every(cell => cell === '-'))).toBe(true);
  });
});

describe('solveSkeletonFill', () => {
  it('keeps the AI per-slot picks verbatim (locked) and completes the rest', () => {
    const { slots, intersections, width, height } = plusFixture();
    const across = slots.find(s => s.direction === 'across')!;
    const down = slots.find(s => s.direction === 'down')!;

    // A response that fills the across slot itself; the down slot is left to
    // the spare pool / word bank but MUST cross the across word's center letter.
    const grid = emptyFillGrid(width, height);
    const response = '```\n' +
      `${across.id}-ACROSS: PLANT | A growing green thing.\n` +
      'GIANT | Very large.\n' +
      '```';
    const parse = parseSkeletonFillResponse(response, { slots, intersections, grid });

    const { assignments } = solveSkeletonFill({
      slots,
      intersections,
      locked: parse.assignments,
      pool: parse.pool,
      seed: 1,
    });

    // The locked across word is present, verbatim (the parser keeps the AI's
    // original casing; the fill view lowercases it when seeding the editor).
    expect(assignments.get(across.id)?.word).toBe('PLANT');
    expect(assignments.get(across.id)?.clue).toBe('A growing green thing.');

    // The down word, if filled, must agree with PLANT at the shared cell.
    const downFill = assignments.get(down.id);
    if (downFill) {
      const acrossPos = down.startX - across.startX; // shared cell pos in across
      const downPos = across.startY - down.startY; // shared cell pos in down
      expect(downFill.word[downPos].toLowerCase()).toBe('plant'[acrossPos]);
    }
  });

  it('is deterministic for a fixed seed', () => {
    const { slots, intersections, width, height } = plusFixture();
    const grid = emptyFillGrid(width, height);
    const parse = parseSkeletonFillResponse('', { slots, intersections, grid });

    const a = solveSkeletonFill({ slots, intersections, locked: parse.assignments, pool: parse.pool, seed: 7 });
    const b = solveSkeletonFill({ slots, intersections, locked: parse.assignments, pool: parse.pool, seed: 7 });
    expect([...a.assignments.entries()]).toEqual([...b.assignments.entries()]);
  });

  it('reports unfillable slots rather than throwing (empty pool, no bank match is left blank)', () => {
    // A lone 2-letter across slot with no crossings. With an empty pool the
    // bank fills it if it can; either way the call returns cleanly.
    const { mask, width, height } = maskFromRows(['..#']);
    const { slots } = deriveSlotsFromBlockMask(mask, width, height);
    const intersections = computeIntersections(slots);
    const result = solveSkeletonFill({
      slots,
      intersections,
      locked: new Map(),
      pool: [],
      seed: 0,
    });
    // Every slot is either assigned or reported unfilled — never silently lost.
    const accountedFor = result.assignments.size + result.unfilledSlotIds.length;
    expect(accountedFor).toBe(slots.length);
  });
});
