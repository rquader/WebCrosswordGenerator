/**
 * Grid structural-validity regression tests (part 1 of the placement suite).
 *
 * These pin the structural validity of generated grids: every maximal run of
 * 2+ letters must be exactly one placed word. Anything else (words glued
 * head-to-tail, parallel words touching) is junk a teacher would see as broken
 * output.
 *
 * The placement-guarantee + auto-grow half lives in
 * `placementContract.test.ts`. The two halves share `placementGuaranteeFixtures.ts`
 * and run on separate Vitest workers (parallel by file) so neither worker is
 * pinned long enough to trip Vitest's worker-RPC ceiling under the deeper
 * best-of-N re-seeding (see the fixtures module for the why).
 */

import { describe, it, expect } from 'vitest';
import { generateCrosswordWithPriority } from '@logic/priorityGenerator';
import {
  HISTORY_32,
  CLASSROOM_10,
  SCIENCE_20,
  SEEDS,
  findStructuralProblems,
  priorityConfig,
} from './placementGuaranteeFixtures';

// ---------------------------------------------------------------------------
// Structural validity — no junk runs, ever
// ---------------------------------------------------------------------------

describe('grid structural validity (no junk runs)', () => {
  it('keeps every maximal run a real word — 32-word list, many seeds', () => {
    for (const seed of SEEDS) {
      const result = generateCrosswordWithPriority(priorityConfig(HISTORY_32, 24, seed));
      expect(findStructuralProblems(result.crossword), `seed ${seed}`).toEqual([]);
    }
  }, 30000); // heavy: 32-word best-of-N x 8 seeds — matches the sibling guarantee tests' timeout (deeper re-seeding raised per-run cost; measured ~6.3s)

  it('keeps every maximal run a real word — small and mid lists', () => {
    for (const words of [CLASSROOM_10, SCIENCE_20]) {
      for (const seed of SEEDS) {
        const result = generateCrosswordWithPriority(priorityConfig(words, 15, seed));
        expect(findStructuralProblems(result.crossword), `seed ${seed}`).toEqual([]);
      }
    }
  });

  it('refuses to glue words even when the grid is too tight', () => {
    // At an undersized grid, words may fail — but whatever IS placed
    // must still form a valid crossword.
    for (const seed of SEEDS) {
      const result = generateCrosswordWithPriority(priorityConfig(HISTORY_32, 16, seed));
      expect(findStructuralProblems(result.crossword), `seed ${seed}`).toEqual([]);
    }
  }, 30000); // heavy: 32-word best-of-N x 8 seeds — matches the sibling guarantee tests' timeout (deeper re-seeding raised per-run cost; measured ~6.5s)

  it('skeleton path produces structurally valid full grids (bank words included)', () => {
    // The skeleton generator strips bank words afterwards; validity of the
    // underlying full grid is what the player ultimately sees once filled.
    for (const seed of [1, 470, 2752]) {
      const result = generateCrosswordWithPriority({
        ...priorityConfig(CLASSROOM_10, 15, seed),
        canIncludeWords: ['stone', 'crane', 'plant', 'orbit', 'mount', 'trace', 'globe', 'shine'],
        canIncludeClues: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'],
      });
      expect(findStructuralProblems(result.crossword), `seed ${seed}`).toEqual([]);
    }
  });
});
