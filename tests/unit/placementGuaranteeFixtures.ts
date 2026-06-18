/**
 * Shared fixtures + helpers for the placement-guarantee regression suite.
 *
 * The suite is split across two spec files so no single Vitest worker is pinned
 * for the whole run — the deeper best-of-N re-seeding (2026-06-17) tripled the
 * generation cost, and one worker grinding through every heavy seed loop in a
 * single file could exceed Vitest's 60s worker-RPC ceiling (a reporter timeout,
 * not a test failure). Vitest parallelizes by FILE, so two balanced files keep
 * each worker comfortably under that ceiling. Word lists, seeds, and assertions
 * are unchanged — this module only de-duplicates the common setup.
 *
 * Word lists are defined inline on purpose — the built-in word packs are
 * example content and may be removed; the engine must handle ANY list.
 */

import type { CrosswordResult, PrioritizedEntry } from '@logic/types';

// ---------------------------------------------------------------------------
// Hard word lists (inline — not coupled to src/presets)
// ---------------------------------------------------------------------------

/** 32 words, ~281 letters, longest 14 — the density profile that exposed the bug. */
export const HISTORY_32 = [
  'constitution', 'amendment', 'congress', 'federalism', 'abolition',
  'suffrage', 'colony', 'revolution', 'declaration', 'liberty',
  'democracy', 'republic', 'frontier', 'pioneer', 'expansion',
  'secession', 'emancipation', 'reconstruction', 'immigration', 'industry',
  'railroad', 'progressive', 'depression', 'newdeal', 'coldwar',
  'segregation', 'boycott', 'integration', 'monopoly', 'treaty',
  'tariff', 'veto',
];

/** Typical small classroom list. */
export const CLASSROOM_10 = [
  'democracy', 'pioneer', 'frontier', 'liberty', 'congress',
  'suffrage', 'colony', 'treaty', 'tariff', 'veto',
];

/** Mid-size mixed-length list (science-flavored). */
export const SCIENCE_20 = [
  'photosynthesis', 'molecule', 'gravity', 'electron', 'velocity',
  'momentum', 'friction', 'energy', 'circuit', 'magnet',
  'neutron', 'proton', 'atom', 'force', 'mass',
  'wave', 'light', 'heat', 'cell', 'acid',
];

export const SEEDS = [1, 2, 42, 470, 999, 1234, 2752, 31337];

export function asEntries(words: string[]): PrioritizedEntry[] {
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
export function findStructuralProblems(result: CrosswordResult): string[] {
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

export function priorityConfig(words: string[], size: number, seed: number) {
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
