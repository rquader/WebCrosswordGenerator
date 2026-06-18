/**
 * Pure glue for the "Fill with AI" stage of the skeleton-first ("build your
 * own grid") flow.
 *
 * The user draws a grid, copies an AI prompt, pastes the AI's response, and we
 * turn that response into a fully filled set of slot assignments. Two concerns
 * live here so the React view stays presentational and the seam is unit-tested:
 *
 *   1. emptyFillGrid — the all-empty ('-') grid of the right size that the
 *      prompt builder needs (it draws the ASCII grid and reads locked cells
 *      from it; a freshly drawn grid has no fixed letters, so every cell is '-').
 *
 *   2. solveSkeletonFill — assembles the fillGrid call from a parsed response:
 *      the AI's per-slot picks are passed as `locked` (its intent is respected
 *      verbatim), its spare pool + the curated word bank complete the remaining
 *      slots with valid crossings, and any slot that still can't be satisfied is
 *      left blank. Every placed word stays editable in the fill view afterward.
 *
 * Pure TypeScript — no DOM, no React, no randomness of its own (the seed only
 * breaks ties inside fillGrid). Determinism: same inputs → same assignments.
 */

import type { SkeletonSlot, WordCluePair } from './types';
import type { SlotIntersection } from './gridSkeleton';
import { fillGrid } from './gridFill';

/** Empty-cell sentinel, matching the rest of the grid code. */
const EMPTY_CELL = '-';

/**
 * Build an all-empty grid (every cell '-') of the given size. This is the grid
 * the freshly drawn skeleton starts from: no letters are fixed yet, so the AI
 * prompt shows every slot cell as blank and the parser has no locked letters to
 * check against. Indexed [row][col] = [y][x], matching the rest of the codebase.
 */
export function emptyFillGrid(width: number, height: number): string[][] {
  const grid: string[][] = [];
  for (let y = 0; y < height; y++) {
    grid.push(new Array<string>(width).fill(EMPTY_CELL));
  }
  return grid;
}

/**
 * Solve a drawn grid from a parsed AI response.
 *
 * The AI's labeled per-slot picks (already validated by the parser) are locked:
 * they always appear in the result, and their letters constrain the rest. The
 * spare pool the AI offered, then the curated word bank, fill whatever slots the
 * AI left unlabeled or that need completing — always honoring crossings. A slot
 * that can't be satisfied from either source is reported in unfilledSlotIds and
 * simply stays blank (the user can type a word there). The word bank is included
 * so a plausible grid completes; every word is editable next in the fill view.
 *
 * Determinism: the seed only perturbs candidate order to break ties; the same
 * (slots, intersections, parse, seed) always yields the same assignments.
 */
export function solveSkeletonFill(options: {
  slots: SkeletonSlot[];
  intersections: SlotIntersection[];
  /** The AI's per-slot picks (slot id -> word + clue), respected verbatim. */
  locked: Map<number, { word: string; clue: string }>;
  /** Unlabeled spare suggestions from the AI, best-first. */
  pool: WordCluePair[];
  /** Determinism seed; only breaks ties inside the solver. */
  seed?: number;
}): {
  assignments: Map<number, { word: string; clue: string }>;
  unfilledSlotIds: number[];
} {
  const { slots, intersections, locked, pool, seed = 0 } = options;
  return fillGrid({
    slots,
    intersections,
    pool,
    locked,
    // Always complete the grid with the curated bank so the user lands on a
    // plausible, fully filled puzzle to edit (unfillable slots stay blank).
    includeWordBank: true,
    seed,
  });
}
