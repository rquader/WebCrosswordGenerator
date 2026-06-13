/**
 * Placement guarantee + grid validity regression tests.
 *
 * The product contract: every word a teacher adds IS placed. The only
 * acceptable failure is a word that physically cannot fit even after the
 * grid auto-grows to its cap.
 *
 * These tests also pin the structural validity of generated grids:
 * every maximal run of 2+ letters must be exactly one placed word.
 * Anything else (words glued head-to-tail, parallel words touching)
 * is junk a teacher would see as broken output.
 *
 * Word lists are defined inline on purpose — the built-in word packs are
 * example content and may be removed; the engine must handle ANY list.
 */

import { describe, it, expect } from 'vitest';
import { generateCrosswordWithPriority } from '@logic/priorityGenerator';
import { createSkeletonFromEntries } from '@logic/createPuzzle';
import { recommendGridSize } from '@logic/gridRecommendation';
import type { CrosswordResult, PrioritizedEntry } from '@logic/types';

// ---------------------------------------------------------------------------
// Hard word lists (inline — not coupled to src/presets)
// ---------------------------------------------------------------------------

/** 32 words, ~281 letters, longest 14 — the density profile that exposed the bug. */
const HISTORY_32 = [
  'constitution', 'amendment', 'congress', 'federalism', 'abolition',
  'suffrage', 'colony', 'revolution', 'declaration', 'liberty',
  'democracy', 'republic', 'frontier', 'pioneer', 'expansion',
  'secession', 'emancipation', 'reconstruction', 'immigration', 'industry',
  'railroad', 'progressive', 'depression', 'newdeal', 'coldwar',
  'segregation', 'boycott', 'integration', 'monopoly', 'treaty',
  'tariff', 'veto',
];

/** Typical small classroom list. */
const CLASSROOM_10 = [
  'democracy', 'pioneer', 'frontier', 'liberty', 'congress',
  'suffrage', 'colony', 'treaty', 'tariff', 'veto',
];

/** Mid-size mixed-length list (science-flavored). */
const SCIENCE_20 = [
  'photosynthesis', 'molecule', 'gravity', 'electron', 'velocity',
  'momentum', 'friction', 'energy', 'circuit', 'magnet',
  'neutron', 'proton', 'atom', 'force', 'mass',
  'wave', 'light', 'heat', 'cell', 'acid',
];

const SEEDS = [1, 2, 42, 470, 999, 1234, 2752, 31337];

function asEntries(words: string[]): PrioritizedEntry[] {
  return words.map(word => ({ word, clue: `clue for ${word}`, priority: 'must' as const }));
}

// ---------------------------------------------------------------------------
// Structural validity helper
// ---------------------------------------------------------------------------

const EMPTY = '-';

/**
 * Assert the grid is a structurally valid crossword:
 *  1. Every placed word's letters appear in the grid at its position.
 *  2. Every placed word is a MAXIMAL run — no letters glued before/after it.
 *  3. Every maximal run of 2+ letters is exactly one placed word — no
 *     accidental words formed by parallel adjacency.
 * Returns a list of problems (empty = valid).
 */
function findStructuralProblems(result: CrosswordResult): string[] {
  const problems: string[] = [];
  const { grid, width, height, wordLocations } = result;

  const placedKeys = new Set<string>();
  for (const loc of wordLocations) {
    const dir = loc.isHorizontal ? 'across' : 'down';
    placedKeys.add(`${dir}:${loc.x},${loc.y},${loc.word.length}`);

    const gridWord = loc.isReversed ? loc.word.split('').reverse().join('') : loc.word;
    for (let i = 0; i < gridWord.length; i++) {
      const x = loc.isHorizontal ? loc.x + i : loc.x;
      const y = loc.isHorizontal ? loc.y : loc.y + i;
      if (grid[y]?.[x] !== gridWord[i]) {
        problems.push(`${loc.word} letter ${i} missing from grid at (${x},${y})`);
      }
    }
  }

  // Scan maximal horizontal runs
  for (let y = 0; y < height; y++) {
    let x = 0;
    while (x < width) {
      if (grid[y][x] === EMPTY) { x++; continue; }
      let end = x;
      while (end + 1 < width && grid[y][end + 1] !== EMPTY) end++;
      const len = end - x + 1;
      if (len >= 2 && !placedKeys.has(`across:${x},${y},${len}`)) {
        problems.push(`junk across run "${grid[y].slice(x, end + 1).join('')}" at (${x},${y})`);
      }
      x = end + 1;
    }
  }

  // Scan maximal vertical runs
  for (let x = 0; x < width; x++) {
    let y = 0;
    while (y < height) {
      if (grid[y][x] === EMPTY) { y++; continue; }
      let end = y;
      while (end + 1 < height && grid[end + 1][x] !== EMPTY) end++;
      const len = end - y + 1;
      if (len >= 2 && !placedKeys.has(`down:${x},${y},${len}`)) {
        let run = '';
        for (let i = y; i <= end; i++) run += grid[i][x];
        problems.push(`junk down run "${run}" at (${x},${y})`);
      }
      y = end + 1;
    }
  }

  return problems;
}

function priorityConfig(words: string[], size: number, seed: number) {
  return {
    width: size,
    height: size,
    seed,
    mustIncludeWords: words,
    mustIncludeClues: words.map(w => `clue ${w}`),
    canIncludeWords: [] as string[],
    canIncludeClues: [] as string[],
    allowReverseWords: false,
  };
}

// ---------------------------------------------------------------------------
// 1. Structural validity — no junk runs, ever
// ---------------------------------------------------------------------------

describe('grid structural validity (no junk runs)', () => {
  it('keeps every maximal run a real word — 32-word list, many seeds', () => {
    for (const seed of SEEDS) {
      const result = generateCrosswordWithPriority(priorityConfig(HISTORY_32, 24, seed));
      expect(findStructuralProblems(result.crossword), `seed ${seed}`).toEqual([]);
    }
  });

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
  });

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

// ---------------------------------------------------------------------------
// 2. Placement guarantee — every word places at the recommended size
// ---------------------------------------------------------------------------

describe('placement guarantee at recommended size', () => {
  for (const [name, words] of [
    ['32-word history list', HISTORY_32],
    ['10-word classroom list', CLASSROOM_10],
    ['20-word science list', SCIENCE_20],
  ] as const) {
    it(`places every word of the ${name} on every seed`, () => {
      const rec = recommendGridSize(words.map(w => w.length));
      for (const seed of SEEDS) {
        const skeleton = createSkeletonFromEntries({
          entries: asEntries(words),
          width: rec.width,
          height: rec.height,
          seed,
        });
        expect(skeleton.failures, `seed ${seed} at ${rec.width}x${rec.height}`).toEqual([]);
        expect(skeleton.mustPlacedCount).toBe(words.length);
      }
    }, 15000);
  }
});

// ---------------------------------------------------------------------------
// 3. Auto-grow — undersized requests grow until everything fits
// ---------------------------------------------------------------------------

describe('auto-grow on placement failure', () => {
  it('grows a deliberately undersized grid until all words place', () => {
    const skeleton = createSkeletonFromEntries({
      entries: asEntries(HISTORY_32),
      width: 15,
      height: 15,
      seed: 7,
    });
    expect(skeleton.failures).toEqual([]);
    expect(skeleton.mustPlacedCount).toBe(HISTORY_32.length);
    expect(skeleton.width).toBeGreaterThan(15);
    expect(skeleton.grewFrom).toEqual({ width: 15, height: 15 });
  });

  it('reports no grewFrom when the requested size already fits', () => {
    const skeleton = createSkeletonFromEntries({
      entries: asEntries(['plant', 'leaf']),
      width: 10,
      height: 10,
      seed: 42,
    });
    expect(skeleton.failures).toEqual([]);
    expect(skeleton.grewFrom).toBeUndefined();
    expect(skeleton.width).toBe(10);
  });

  it('honors growToFit: false (old behavior — failures reported)', () => {
    const skeleton = createSkeletonFromEntries({
      entries: asEntries(HISTORY_32),
      width: 15,
      height: 15,
      seed: 7,
      growToFit: false,
    });
    expect(skeleton.width).toBe(15);
    expect(skeleton.failures.length).toBeGreaterThan(0);
  });

  it('stays deterministic across runs (same config, same growth result)', () => {
    const make = () => createSkeletonFromEntries({
      entries: asEntries(HISTORY_32),
      width: 15,
      height: 15,
      seed: 99,
    });
    const a = make();
    const b = make();
    expect(a.grid).toEqual(b.grid);
    expect(a.width).toBe(b.width);
    expect(a.slots.length).toBe(b.slots.length);
  }, 15000);
});
