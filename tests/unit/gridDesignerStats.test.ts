/**
 * Tests for gridDesignerStats.ts — the live feedback readout for the
 * "build your own grid" editor. These cover the summary numbers the editor
 * shows; the underlying geometry helpers have their own deep tests in
 * gridSkeleton.test.ts.
 */

import { describe, it, expect } from 'vitest';
import { computeGridDesignerStats } from '../../src/logic/gridDesignerStats';
import type { BlockMask } from '../../src/logic/gridSkeleton';

/** Build a BlockMask from a visual string grid. '#' = block, else open. */
function maskFromRows(rows: string[]): { mask: BlockMask; width: number; height: number } {
  const mask = rows.map(row => row.split('').map(ch => ch === '#'));
  const height = mask.length;
  const width = height > 0 ? mask[0].length : 0;
  return { mask, width, height };
}

describe('computeGridDesignerStats', () => {
  it('reports slot count, longest, and shortest on a known cross-grid', () => {
    // 5x5 cross grid: 3 across (len 5) + 3 down (len 5) = 6 slots, all len 5.
    const { mask, width, height } = maskFromRows([
      '.....',
      '.#.#.',
      '.....',
      '.#.#.',
      '.....',
    ]);
    const stats = computeGridDesignerStats(mask, width, height);
    expect(stats.slotCount).toBe(6);
    expect(stats.longestSlot).toBe(5);
    expect(stats.shortestSlot).toBe(5);
    expect(stats.strayCells).toHaveLength(0);
    expect(stats.componentCount).toBe(1);
    expect(stats.canFill).toBe(true);
  });

  it('distinguishes longest from shortest with mixed slot lengths', () => {
    // row 0: ....  across len 4
    // row 1: #..#  across len 2
    const { mask, width, height } = maskFromRows([
      '....',
      '#..#',
    ]);
    const stats = computeGridDesignerStats(mask, width, height);
    // Across: len 4 (row 0) and len 2 (row 1). Down: cols 1,2 are len 2.
    expect(stats.longestSlot).toBe(4);
    expect(stats.shortestSlot).toBe(2);
    expect(stats.canFill).toBe(true);
  });

  it('flags stray open cells', () => {
    // (0,0) and (2,0) are isolated single cells; row 2 is a real across slot.
    const { mask, width, height } = maskFromRows([
      '.#.',
      '###',
      '...',
    ]);
    const stats = computeGridDesignerStats(mask, width, height);
    const straySet = new Set(stats.strayCells.map(p => `${p.x},${p.y}`));
    expect(straySet.has('0,0')).toBe(true);
    expect(straySet.has('2,0')).toBe(true);
    expect(stats.strayCells).toHaveLength(2);
  });

  it('counts disconnected components', () => {
    // Column 2 (all blocks) splits the grid into a left and right island.
    const { mask, width, height } = maskFromRows([
      '..#..',
      '..#..',
    ]);
    const stats = computeGridDesignerStats(mask, width, height);
    expect(stats.componentCount).toBe(2);
  });

  it('an all-block grid has no slots and cannot fill', () => {
    const { mask, width, height } = maskFromRows(['###', '###']);
    const stats = computeGridDesignerStats(mask, width, height);
    expect(stats.slotCount).toBe(0);
    expect(stats.longestSlot).toBe(0);
    expect(stats.shortestSlot).toBe(0);
    expect(stats.componentCount).toBe(0);
    expect(stats.canFill).toBe(false);
  });

  it('an all-open grid is one component with no strays', () => {
    const { mask, width, height } = maskFromRows(['....', '....', '....']);
    const stats = computeGridDesignerStats(mask, width, height);
    expect(stats.strayCells).toHaveLength(0);
    expect(stats.componentCount).toBe(1);
    expect(stats.canFill).toBe(true);
  });
});
