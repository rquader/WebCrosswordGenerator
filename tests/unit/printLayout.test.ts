/**
 * Tests for the shared print layout planner.
 *
 * planBothPrintLayout decides whether "print both" fits puzzle + clues +
 * compact answer key on one page. The browser print path and the PDF
 * export both consume this plan, so its verdicts are pinned here.
 */

import { describe, it, expect } from 'vitest';
import {
  planBothPrintLayout,
  MIN_KEY_CELL_PT,
  MAX_KEY_CELL_PT,
} from '../../src/utils/printLayout';
import { createPuzzleFromEntries } from '@logic/createPuzzle';
import type { CrosswordResult } from '@logic/types';

function smallPuzzle(): CrosswordResult {
  return createPuzzleFromEntries({
    entries: [
      { word: 'react', clue: 'A UI library' },
      { word: 'vite', clue: 'A fast build tool' },
      { word: 'node', clue: 'JS runtime' },
      { word: 'type', clue: 'TS feature' },
    ],
    width: 8,
    height: 8,
    seed: 42,
  });
}

function densePuzzle(clueLength: 'short' | 'long'): CrosswordResult {
  const words = [
    'absolute', 'boundary', 'calendar', 'dominant', 'elephant',
    'festival', 'graduate', 'hospital', 'industry', 'junction',
    'keyboard', 'landmark', 'mountain', 'notebook', 'obstacle',
    'painting', 'quantity', 'railroad', 'sandwich', 'telescope',
    'umbrella', 'vacation', 'warehouse', 'xylophone', 'yearbook',
    'zucchini', 'antelope', 'baseball', 'cucumber', 'dinosaur',
  ];
  const clue = (w: string) =>
    clueLength === 'short'
      ? `Clue for ${w}`
      : `This is a deliberately verbose clue for the word ${w}, padded until it wraps across several lines in a printed clue column.`;
  return createPuzzleFromEntries({
    entries: words.map(w => ({ word: w, clue: clue(w) })),
    width: 26,
    height: 26,
    seed: 7,
  });
}

describe('planBothPrintLayout', () => {
  it('puts a typical small puzzle on a single page', () => {
    const plan = planBothPrintLayout(smallPuzzle());

    expect(plan.singlePage).toBe(true);
    expect(plan.keyCellPt).toBeGreaterThanOrEqual(MIN_KEY_CELL_PT);
    expect(plan.keyCellPt).toBeLessThanOrEqual(MAX_KEY_CELL_PT);
  });

  it('splits a dense 26x26 with long clues onto two pages', () => {
    const plan = planBothPrintLayout(densePuzzle('long'));

    expect(plan.singlePage).toBe(false);
  });

  it('drops key numbers when compact cells get small', () => {
    const plan = planBothPrintLayout(densePuzzle('short'));

    // 26 columns force key cells near the minimum — numbers would clutter.
    expect(plan.keyCellPt).toBeLessThan(12);
    expect(plan.keyShowsNumbers).toBe(false);
  });

  it('keeps key numbers on roomy grids', () => {
    const plan = planBothPrintLayout(smallPuzzle());

    expect(plan.keyShowsNumbers).toBe(true);
  });
});
