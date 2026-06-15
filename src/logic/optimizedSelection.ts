/**
 * Optimized subset selection for AI-generation.
 *
 * Given a quality-RANKED candidate word pool (best-first) and a pinned target
 * grid, this picks the SUBSET of words that builds the best crossword —
 * densest packing, weighted against word quality. It is the core of an
 * "Optimized" AI-generation mode: instead of feeding exactly the target count
 * of words to the generator, the caller supplies a larger pool (typically ~3×),
 * and we let the packer choose which words actually land. A bigger pool gives
 * the intersection-based placer more letters to interlock on, so it packs
 * meaningfully denser than the exactly-target set at the same grid size.
 *
 * Strategy: multi-start greedy, best-of-K. We do NOT enumerate subsets —
 * C(3t, t) explodes. Instead, each multi-start re-orders the pool by a blended
 * sort key (grid-fit preference vs. quality preference, plus a little jitter to
 * diversify the subsets across starts), runs the existing core generator with
 * `presorted: true` (which places words greedily in the given order), and the
 * words that actually placed become that start's subset. We score each start on
 * its own density and the average quality of the words it placed, then keep the
 * best-scoring start.
 *
 * PURE + deterministic: the result is a pure function of the config. Logic uses
 * only SeededRandom — no Date, no Math.random — so the same config always
 * yields the same selection. The grid is never mutated; density is measured by
 * counting placed cells, mirroring puzzleScore.ts's compactness term.
 */

import type { WordCluePair, CrosswordResult } from './types';
import { generateCrossword } from './generator';
import { SeededRandom } from './seedRandom';

export interface OptimizedSelectionConfig {
  /** Candidate entries, BEST-FIRST (index 0 = highest quality). */
  pool: WordCluePair[];
  /** Target grid width (pinned — the caller sizes it for the target count). */
  width: number;
  /** Target grid height (pinned). */
  height: number;
  /** Base seed for reproducible multi-starts. */
  seed: number;
  /**
   * Quality-vs-fit weighting in [0, 1]:
   *   0 = pure grid-fit (maximize density),
   *   1 = pure best-words (maximize average word quality).
   */
  qualityBias: number;
  /** Number of multi-starts (best-of-K). Default 16. */
  multiStarts?: number;
  /** Allow reversed words in the layout. Default false. */
  allowReverseWords?: boolean;
}

export interface OptimizedSelectionResult {
  /** The selected subset — the winning layout's placed words, with clues. */
  entries: WordCluePair[];
  /** The winning layout. */
  crossword: CrosswordResult;
  /** Size of the input pool. */
  poolSize: number;
  /** Number of words placed in the winning layout. */
  selectedCount: number;
  /** Occupied cells / cropped-bbox area of the winning layout (0..1). */
  density: number;
}

/** Multi-start count when the caller doesn't specify one. */
const DEFAULT_MULTI_STARTS = 16;

/**
 * Seed stride between multi-starts. A large odd prime keeps derived seeds
 * well-separated so starts explore genuinely different orderings.
 */
const SEED_STRIDE = 7919;

/**
 * Jitter added to each word's sort key, scaled by a uniform [0, 1) draw.
 * Big enough to shuffle which words win across starts (so we explore
 * different subsets), small enough that the quality/fit bias still drives
 * the ordering. ~0.15 sits comfortably below the spread of the rank terms.
 */
const SORT_KEY_JITTER = 0.15;

/**
 * Choose the subset of the pool that builds the best crossword on the target
 * grid, weighing packing density against word quality (see qualityBias).
 */
export function selectOptimizedSubset(
  config: OptimizedSelectionConfig,
): OptimizedSelectionResult {
  const pool = config.pool;
  const n = pool.length;
  const beta = config.qualityBias;
  const multiStarts = Math.max(1, config.multiStarts ?? DEFAULT_MULTI_STARTS);
  const allowReverseWords = config.allowReverseWords ?? false;

  // Edge case: empty pool -> empty result with an empty grid.
  if (n === 0) {
    return {
      entries: [],
      crossword: {
        grid: createEmptyGrid(config.width, config.height),
        wordLocations: [],
        width: config.width,
        height: config.height,
      },
      poolSize: 0,
      selectedCount: 0,
      density: 0,
    };
  }

  // Map each pool word back to its quality rank (index in the best-first pool),
  // built once. Used to score the average quality of a start's placed words.
  const wordToRank = new Map<string, number>();
  for (let i = 0; i < n; i++) {
    // First occurrence wins, so duplicates keep their best (lowest) rank.
    if (!wordToRank.has(pool[i].word)) {
      wordToRank.set(pool[i].word, i);
    }
  }

  // Per-word normalized ranks in [0, 1], where 0 = most preferred.
  //   qualityRankNorm: position in the best-first pool (0 = highest quality).
  //   lengthRankNorm:  position when sorted by length descending
  //                    (0 = longest = best anchor for packing).
  const denom = Math.max(1, n - 1);
  const qualityRankNorm = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    qualityRankNorm[i] = i / denom;
  }

  const byLengthDesc = pool
    .map((entry, index) => ({ index, length: entry.word.length }))
    .sort((a, b) => b.length - a.length);
  const lengthRankNorm = new Array<number>(n);
  for (let position = 0; position < byLengthDesc.length; position++) {
    lengthRankNorm[byLengthDesc[position].index] = position / denom;
  }

  let best: StartOutcome | null = null;

  for (let k = 0; k < multiStarts; k++) {
    const startSeed = config.seed + k * SEED_STRIDE;
    const rng = new SeededRandom(startSeed);

    // Blend fit preference, quality preference, and jitter into one sort key
    // per word. Lower key = placed earlier (more preferred). Drawing the
    // jitter in pool order keeps the whole computation seed-deterministic.
    const ordered = pool
      .map((entry, index) => ({
        entry,
        index,
        sortKey:
          (1 - beta) * lengthRankNorm[index] +
          beta * qualityRankNorm[index] +
          rng.nextFloat() * SORT_KEY_JITTER,
      }))
      .sort((a, b) => a.sortKey - b.sortKey);

    const words = ordered.map(o => o.entry.word);
    const clues = ordered.map(o => o.entry.clue);

    const crossword = generateCrossword({
      width: config.width,
      height: config.height,
      seed: startSeed,
      words,
      clues,
      allowReverseWords,
      presorted: true,
    });

    const density = measureDensity(crossword);
    const avgQuality = measureAvgQuality(crossword, wordToRank, n);
    const score = (1 - beta) * density + beta * avgQuality;

    // Strictly-greater keeps the earliest start on ties -> deterministic.
    if (best === null || score > best.score) {
      best = { crossword, density, score };
    }
  }

  const winner = best!;

  // The selected subset is exactly the words the winning layout placed,
  // each paired with the clue it carried into the grid.
  const entries: WordCluePair[] = winner.crossword.wordLocations.map(loc => ({
    word: loc.displayWord ?? loc.word,
    clue: loc.clue,
  }));

  return {
    entries,
    crossword: winner.crossword,
    poolSize: n,
    selectedCount: winner.crossword.wordLocations.length,
    density: winner.density,
  };
}

// ---------------------------------------------------------------------------
// Scoring helpers (read-only — never mutate the grid)
// ---------------------------------------------------------------------------

interface StartOutcome {
  crossword: CrosswordResult;
  density: number;
  score: number;
}

/**
 * Density of a layout: distinct occupied cells / cropped bounding-box area.
 * Mirrors the compactness term in puzzleScore.ts — count covered cells from
 * the word locations (no grid mutation), take the bbox of those cells.
 * Returns 0 for an empty layout.
 */
function measureDensity(crossword: CrosswordResult): number {
  const { wordLocations } = crossword;
  if (wordLocations.length === 0) {
    return 0;
  }

  const covered = new Set<string>();
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const loc of wordLocations) {
    for (let i = 0; i < loc.word.length; i++) {
      const x = loc.isHorizontal ? loc.x + i : loc.x;
      const y = loc.isHorizontal ? loc.y : loc.y + i;
      covered.add(`${x},${y}`);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  const boxArea = (maxX - minX + 1) * (maxY - minY + 1);
  return covered.size / boxArea;
}

/**
 * Average quality of a layout's placed words, in [0, 1] (higher = better).
 * Each placed word maps back to its pool rank; quality = (n - rank) / n.
 * Returns 0 for an empty layout.
 */
function measureAvgQuality(
  crossword: CrosswordResult,
  wordToRank: Map<string, number>,
  n: number,
): number {
  const { wordLocations } = crossword;
  if (wordLocations.length === 0) {
    return 0;
  }

  let sum = 0;
  for (const loc of wordLocations) {
    const rank = wordToRank.get(loc.word) ?? n; // Unknown word -> worst quality.
    sum += (n - rank) / n;
  }
  return sum / wordLocations.length;
}

/** Create an empty grid filled with '-'. */
function createEmptyGrid(width: number, height: number): string[][] {
  const grid: string[][] = [];
  for (let y = 0; y < height; y++) {
    const row: string[] = [];
    for (let x = 0; x < width; x++) {
      row.push('-');
    }
    grid.push(row);
  }
  return grid;
}
