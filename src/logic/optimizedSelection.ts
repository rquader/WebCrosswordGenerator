/**
 * Optimized subset selection for AI-generation.
 *
 * Given a quality-RANKED candidate word pool (best-first) and a pinned target
 * grid, this picks the SUBSET of words that builds the best crossword —
 * densest packing, weighted against word quality. It is the core of an
 * "Optimized" AI-generation mode: instead of feeding exactly the target count
 * of words to the generator, the caller supplies a larger pool (typically ~4×),
 * and we let the packer choose which words actually land. A bigger pool gives
 * the intersection-based placer more letters to interlock on, so it packs
 * meaningfully denser than the exactly-target set at the same grid size.
 *
 * MUST-INCLUDE (ADR-10): the caller can pass a set of words that are GUARANTEED
 * a spot — the teacher's manually-typed/pack words. Only the AI-suggested pool
 * is curated down to a subset; must words are always placed. Each multi-start
 * places must words first (longest-first, with the core generator's swap-rescue
 * for stuck must words), then fills the rest from the pool. A start counts as
 * VALID only if EVERY must word placed; scoring/selection happens over valid
 * starts. The result reports `allMustPlaced` so the caller can grow the canvas
 * when even the most-spacious start couldn't fit the must set.
 *
 * Strategy: multi-start greedy, best-of-K. We do NOT enumerate subsets —
 * C(4t, t) explodes. Instead, each multi-start re-orders the pool by a blended
 * sort key (grid-fit preference vs. quality preference, plus a little jitter to
 * diversify the subsets across starts), then runs the core generator with
 * `presorted: true` on [must (longest-first) ++ ordered pool] and
 * `priorityWordCount` = the must count (so must words are placed and rescued
 * before any pool word can crowd the grid). The pool words that actually placed
 * become that start's subset. We score each start on its own density and the
 * average quality of the POOL words it placed, then keep the best-scoring valid
 * start. With no must words this reduces to placing the ordered pool directly —
 * byte-identical to the pre-ADR-10 behavior.
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
  /**
   * Words GUARANTEED a spot (ADR-10) — the teacher's manual/pack words.
   * Placed before any pool word; a start is only valid if all of them placed.
   * Default: [] (pure-AI path — every word is curated, nothing guaranteed).
   */
  mustInclude?: WordCluePair[];
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
  /**
   * Cap on the finished word count (ADR-11.1/11.2). Manual/must words COUNT
   * toward it: each start feeds the generator at most `targetCount - mustCount`
   * pool words (the top ones under that start's perturbed ordering), so the
   * puzzle can never exceed `targetCount`. The exception is mustCount ≥
   * targetCount: all must words still place (typed-words contract — never drop a
   * typed word) and the result may exceed the target. When UNDEFINED the whole
   * pool is fed and the densest free-floating subset wins (the pre-ADR-11 path —
   * kept byte-identical for callers that don't pass a target).
   */
  targetCount?: number;
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
  /**
   * Whether the winning layout placed EVERY must-include word. Always true
   * when no must words were given. When false, no start could fit the must
   * set on this canvas — the caller should grow and retry (contract > density).
   */
  allMustPlaced: boolean;
}

/** Multi-start count when the caller doesn't specify one (uncapped path). */
const DEFAULT_MULTI_STARTS = 16;

/**
 * Multi-start count for the CAPPED path (a `targetCount` is set). Capping each
 * start to the top `targetCount - mustCount` pool words shrinks the slice the
 * packer sees, so a single start more often fails to interlock the whole slice.
 * More starts give more distinct top-budget subsets a shot at full placement,
 * which is what lands the finished count ON the target. Builds are sub-10ms even
 * at this count, so the extra starts are imperceptible. Deterministic — purely a
 * function of the seed.
 */
const CAPPED_MULTI_STARTS = 64;

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
  const must = config.mustInclude ?? [];
  const n = pool.length;
  const beta = config.qualityBias;
  const capped = config.targetCount !== undefined;
  const defaultStarts = capped ? CAPPED_MULTI_STARTS : DEFAULT_MULTI_STARTS;
  const multiStarts = Math.max(1, config.multiStarts ?? defaultStarts);
  const allowReverseWords = config.allowReverseWords ?? false;

  // Must words placed longest-first (best grid structure). Their order is the
  // same across every start — only the curated pool is reshuffled per start.
  // A must word longer than the canvas side CANNOT place here and would crash
  // the placer (out-of-bounds first-word write), so we hold it out of the
  // generator call and count it as unplaced — `allMustPlaced` then reports
  // false and the caller grows the canvas (it never drops a must word). With a
  // right-sized canvas this list is empty and nothing is held out.
  const maxDim = Math.max(config.width, config.height);
  const sortedMust = [...must].sort((a, b) => b.word.length - a.word.length);
  const fittingMust = sortedMust.filter(m => m.word.length <= maxDim);
  const oversizeMustCount = sortedMust.length - fittingMust.length;
  const mustWordSet = new Set(sortedMust.map(m => m.word));

  // How many POOL words a start may feed the generator (ADR-11). Must words
  // count toward the target, so the pool fills only the remainder. With no
  // target the whole pool is eligible (the pre-ADR-11 free-floating-subset
  // path). When mustCount ≥ target the budget is 0 — must words still all place
  // (the result may exceed the target, by design). Clamped to the pool size.
  const poolBudget =
    config.targetCount === undefined
      ? n
      : Math.min(n, Math.max(0, config.targetCount - fittingMust.length));

  // Edge case: nothing to place at all -> empty result with an empty grid.
  if (n === 0 && sortedMust.length === 0) {
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
      allMustPlaced: true,
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

  // Best VALID start (all must words placed) and, as a fallback, the start that
  // placed the MOST must words. The fallback only surfaces when no start fits
  // the whole must set on this canvas — the caller grows and retries — but it
  // keeps the function total (never returns nothing).
  let bestValid: StartOutcome | null = null;
  let bestFallback: StartOutcome | null = null;

  for (let k = 0; k < multiStarts; k++) {
    const startSeed = config.seed + k * SEED_STRIDE;
    const rng = new SeededRandom(startSeed);

    // Blend fit preference, quality preference, and jitter into one sort key
    // per pool word. Lower key = placed earlier (more preferred). Drawing the
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

    // Cap the curated pool at the per-start budget (ADR-11): the generator never
    // sees more than `poolBudget` pool words, so the puzzle can never exceed the
    // target. With no target, `poolBudget === n` and this is the full ordered
    // pool — the old path. The multi-start diversity is preserved: each start
    // still reshuffles the whole pool, we just keep its top `poolBudget`.
    const selectedPool = ordered.slice(0, poolBudget);

    // Must words first (guaranteed, longest-first), then the budgeted pool in
    // this start's blended order. `priorityWordCount` makes the core generator
    // place + rescue the must words BEFORE any pool word crowds the grid — the
    // same swap-rescue guarantee the priority generator gives must-include
    // words. Only must words that FIT the canvas reach the generator; with no
    // must words this is exactly the budgeted pool.
    const words = [...fittingMust.map(m => m.word), ...selectedPool.map(o => o.entry.word)];
    const clues = [...fittingMust.map(m => m.clue), ...selectedPool.map(o => o.entry.clue)];

    const crossword = generateCrossword({
      width: config.width,
      height: config.height,
      seed: startSeed,
      words,
      clues,
      allowReverseWords,
      presorted: true,
      priorityWordCount: fittingMust.length,
    });

    // A start is VALID only if EVERY must word placed — including ones held out
    // for being too long (they can never place here, so any oversize must word
    // forces the caller to grow). placedMustCount counts the fitting ones that
    // landed; oversize ones are unplaced by construction.
    const placedMustCount = countPlacedMust(crossword, mustWordSet);
    const allMustPlaced = oversizeMustCount === 0 && placedMustCount === fittingMust.length;

    // Density covers ALL placed cells (must + pool) — it IS the finished grid.
    // Quality is averaged over the placed POOL words only: must words are
    // guaranteed regardless of rank, so they don't sway the quality tradeoff.
    const density = measureDensity(crossword);
    const avgQuality = measureAvgPoolQuality(crossword, wordToRank, mustWordSet, n);
    const score = (1 - beta) * density + beta * avgQuality;
    const placedCount = crossword.wordLocations.length;

    const outcome: StartOutcome = { crossword, density, score, placedMustCount, placedCount };

    // Pick the best valid start (all must words placed). When CAPPED, the count
    // is the contract: prefer the start that placed the MOST words so the result
    // lands on the target (the per-start budget already bounds it from above),
    // breaking ties by the density×quality score. UNCAPPED keeps the original
    // score-only winner, so the legacy free-floating-subset path is unchanged.
    if (allMustPlaced && (bestValid === null || isBetterValid(outcome, bestValid, capped))) {
      bestValid = outcome;
    }
    if (bestFallback === null || outcome.placedMustCount > bestFallback.placedMustCount) {
      bestFallback = outcome;
    }
  }

  const winner = bestValid ?? bestFallback!;
  const allMustPlaced = bestValid !== null;

  // The selected subset is exactly the words the winning layout placed (must +
  // the chosen pool words), each paired with the clue it carried into the grid.
  // `displayWord` is the spaced form for two-word phrases; it is absent for
  // ordinary words, so fall back to the grid form.
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
    allMustPlaced,
  };
}

// ---------------------------------------------------------------------------
// Scoring helpers (read-only — never mutate the grid)
// ---------------------------------------------------------------------------

interface StartOutcome {
  crossword: CrosswordResult;
  density: number;
  score: number;
  /** How many must-include words this start placed (used for the fallback). */
  placedMustCount: number;
  /** Total words this start placed (must + pool) — drives the capped winner. */
  placedCount: number;
}

/**
 * Whether `candidate` is a strictly better valid start than the current best.
 * CAPPED: more placed words wins (the count is the contract; the per-start
 * budget already caps it above, so maximizing placement lands it on the target),
 * ties broken by the density×quality score. UNCAPPED: score only — identical to
 * the pre-ADR-11 winner so that path stays byte-for-byte unchanged. Strict
 * comparisons keep the earliest qualifying start on ties -> deterministic.
 */
function isBetterValid(candidate: StartOutcome, best: StartOutcome, capped: boolean): boolean {
  if (capped) {
    if (candidate.placedCount !== best.placedCount) {
      return candidate.placedCount > best.placedCount;
    }
  }
  return candidate.score > best.score;
}

/**
 * Count how many distinct must-include words the layout placed. Duplicates in
 * the grid count once (a word is either in or not), matching how the priority
 * generator classifies must placements.
 */
function countPlacedMust(
  crossword: CrosswordResult,
  mustWordSet: Set<string>,
): number {
  if (mustWordSet.size === 0) return 0;
  const seen = new Set<string>();
  for (const loc of crossword.wordLocations) {
    if (mustWordSet.has(loc.word)) seen.add(loc.word);
  }
  return seen.size;
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
 * Average quality of the placed POOL words, in [0, 1] (higher = better). Each
 * placed pool word maps back to its pool rank; quality = (n - rank) / n.
 * Must-include words are EXCLUDED from the average — they are guaranteed
 * regardless of rank, so they must not sway the quality-vs-density tradeoff.
 * Returns 0 when the layout placed no pool words (only must words, or empty).
 */
function measureAvgPoolQuality(
  crossword: CrosswordResult,
  wordToRank: Map<string, number>,
  mustWordSet: Set<string>,
  n: number,
): number {
  let sum = 0;
  let count = 0;
  for (const loc of crossword.wordLocations) {
    if (mustWordSet.has(loc.word)) continue; // guaranteed — not part of curation
    const rank = wordToRank.get(loc.word) ?? n; // Unknown word -> worst quality.
    sum += (n - rank) / n;
    count++;
  }
  return count === 0 ? 0 : sum / count;
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
