/**
 * Priority-based crossword generator.
 *
 * Wraps the core generator to implement the three-tier word system:
 *   1. Must-include words are placed first (guaranteed, failures reported)
 *   2. Can-include words are placed second (best-effort, silently skipped)
 *
 * The approach: prepare words in priority order (must first, can second,
 * each group sorted by length descending), then call the core generator
 * with `presorted: true` so it preserves our ordering.
 *
 * After generation, we compare placed words against the must/can lists
 * to build the priority result with full placement metadata.
 */

import type {
  PriorityGeneratorConfig,
  PriorityGeneratorResult,
  PlacementFailure,
  DirectionalWord,
  CrosswordResult,
} from './types';
import { generateCrossword } from './generator';
import { scoreCrossword } from './puzzleScore';
import { SeededRandom } from './seedRandom';

/**
 * How many candidate layouts to try when the caller doesn't specify one.
 *
 * The candidate loop is a best-of-N scheme: more candidates => denser
 * finished grids, because the winner places every word at a SMALLER grid
 * more often and crop-to-fit then tightens it. Best-of-N is MONOTONIC
 * (the winner can only improve or tie with more candidates), so raising
 * this never regresses quality — the only cost is time.
 *
 * Sizing is grounded in extreme-value theory rather than a fitted curve.
 * If single-candidate density D ~ Normal(mu, sigma^2), then
 *   E[best of N] ~= mu + sigma * c_N,   c_N = expected max of N standard
 * normals, Blom (1958): c_N ~= Phi^-1((N - 0.375)/(N + 0.25)) ~ sqrt(2 ln N).
 * The marginal gain of the Nth candidate is sigma * (c_N - c_{N-1}) ∝
 * sigma / (N sqrt(ln N)) — positive but sharply diminishing. Measured
 * (see /tmp/cw-evt.ts): the model fits 14-30 word lists well; sigma falls
 * with list size (~8/sqrt(W)); large lists show a HEAVY right tail so they
 * benefit from more candidates than Normal predicts; small lists hit a
 * bounded density ceiling and saturate by ~15.
 *
 * So: scale candidates DOWN with list size (lower sigma + higher per-
 * candidate cost), but keep enough for mid-to-large lists where the tail
 * still pays. Pure function of the word count (NOT wall-clock) so the
 * winner stays seed-reproducible. Floor protects the word-bank-flooded
 * skeleton path (total ~300 words) from doing many expensive candidates.
 *
 * Effective counts: <=18 words -> 30; 24 -> 23; 30 -> 19; 40 -> 14;
 * 70+ -> 8. Validated on the general corpus (/tmp/cw-corpus.ts): no list
 * regresses vs the prior 420/W setting, mid-large lists gain ~0.3-1pp.
 */
const MIN_CANDIDATES = 8;
const MAX_CANDIDATES = 30;
const CANDIDATE_BUDGET = 560; // candidates ≈ CANDIDATE_BUDGET / wordCount, clamped

export function defaultCandidateCount(totalWords: number): number {
  if (totalWords <= 0) return MIN_CANDIDATES;
  return Math.max(MIN_CANDIDATES, Math.min(MAX_CANDIDATES, Math.round(CANDIDATE_BUDGET / totalWords)));
}

/**
 * First-word offsets (from grid center) used to diversify candidates.
 * Candidate i uses offset i % length, so the first candidate is centered.
 * Derived seeds keep candidates distinct even when offsets repeat, but a
 * longer ladder gives higher candidate counts more genuinely-different
 * first-word anchors to branch from.
 */
const CANDIDATE_OFFSETS = [0, -2, 2, -4, 4, -1, 1, -3, 3, -5, 5, -6, 6, -7, 7, -8, 8];

/**
 * Generate a crossword with priority-based word placement.
 *
 * Must-include words are placed before can-include words. The algorithm
 * is the same intersection-based placement as the core generator — we
 * just control the order.
 *
 * @param config - Priority generator configuration
 * @returns Result with placement metadata per tier
 */
export function generateCrosswordWithPriority(
  config: PriorityGeneratorConfig
): PriorityGeneratorResult {
  const maxDim = Math.max(config.width, config.height);

  // Pre-filter: words that are too long can't be placed regardless
  const mustWords: string[] = [];
  const mustClues: string[] = [];
  const canWords: string[] = [];
  const canClues: string[] = [];
  const tooLongFailures: PlacementFailure[] = [];

  for (let i = 0; i < config.mustIncludeWords.length; i++) {
    const word = config.mustIncludeWords[i];
    const clue = config.mustIncludeClues[i];
    if (word.length > maxDim) {
      tooLongFailures.push({ word, reason: 'too_long' });
    } else {
      mustWords.push(word);
      mustClues.push(clue);
    }
  }

  const tooLongCanWords: string[] = [];
  const mustWordLookup = new Set(config.mustIncludeWords);

  for (let i = 0; i < config.canIncludeWords.length; i++) {
    const word = config.canIncludeWords[i];
    const clue = config.canIncludeClues[i];
    if (mustWordLookup.has(word)) {
      continue; // Duplicate of a must-include word — the must tier owns it
    }
    if (word.length <= maxDim) {
      canWords.push(word);
      canClues.push(clue);
    } else {
      tooLongCanWords.push(word);
    }
  }

  // Edge case: no words at all
  if (mustWords.length === 0 && canWords.length === 0) {
    const emptyGrid = createEmptyGrid(config.width, config.height);
    return {
      crossword: {
        grid: emptyGrid,
        wordLocations: [],
        width: config.width,
        height: config.height,
      },
      placedMust: [],
      placedCan: [],
      failedMust: tooLongFailures,
      skippedCan: [...config.canIncludeWords],
    };
  }

  // Generate several candidate layouts and keep the best one.
  // Each candidate uses a seed derived from the base seed and a different
  // first-word offset, so the same config always produces the same winner.
  const candidateCount = Math.max(
    1,
    config.candidateCount ?? defaultCandidateCount(mustWords.length + canWords.length),
  );
  let best: RankedCandidate | null = null;

  for (let i = 0; i < candidateCount; i++) {
    const candidateSeed = i === 0 ? config.seed : config.seed + i * 7919;
    const candidate = generateSingleCandidate(
      config, mustWords, mustClues, canWords, canClues,
      candidateSeed, CANDIDATE_OFFSETS[i % CANDIDATE_OFFSETS.length],
    );

    if (best === null || isBetterCandidate(candidate, best)) {
      best = candidate;
    }
    // No early exit on full coverage: candidates that place every word
    // still differ meaningfully in compactness and interlock, and the
    // score picks the densest layout. Generation is milliseconds per
    // candidate, so running all of them stays well under a click's budget.
  }

  const winner = best!;

  // Must-include words that weren't placed → failures
  const failedMust: PlacementFailure[] = [...tooLongFailures];
  for (const word of winner.unplacedMust) {
    failedMust.push({ word, reason: 'no_intersection' });
  }

  // Can-include words that weren't placed → skipped (not failures)
  const skippedCan: string[] = [...tooLongCanWords, ...winner.unplacedCan];

  return {
    crossword: winner.crossword,
    placedMust: winner.placedMust,
    placedCan: winner.placedCan,
    failedMust,
    skippedCan,
  };
}

// ---------------------------------------------------------------------------
// Candidate generation and ranking
// ---------------------------------------------------------------------------

interface RankedCandidate {
  crossword: CrosswordResult;
  placedMust: DirectionalWord[];
  placedCan: DirectionalWord[];
  unplacedMust: string[];
  unplacedCan: string[];
  placedTotal: number;
  score: number;
}

/** Run one full generation pass and classify the placements by tier. */
function generateSingleCandidate(
  config: PriorityGeneratorConfig,
  mustWords: string[],
  mustClues: string[],
  canWords: string[],
  canClues: string[],
  seed: number,
  firstWordOffset: number,
): RankedCandidate {
  // Sort each tier by length descending (longest first = best grid structure).
  // Shuffle within each tier for variety (seeded for reproducibility).
  const random = new SeededRandom(seed);
  const sortedMust = shuffleAndSortByLength(mustWords, mustClues, random);
  const sortedCan = shuffleAndSortByLength(canWords, canClues, random);

  // Concatenate: must-include first, then can-include.
  // The core generator preserves this order (presorted: true).
  const crossword = generateCrossword({
    width: config.width,
    height: config.height,
    seed,
    words: [...sortedMust.words, ...sortedCan.words],
    clues: [...sortedMust.clues, ...sortedCan.clues],
    allowReverseWords: config.allowReverseWords,
    debug: config.debug,
    presorted: true,
    firstWordOffset,
    // Must-include words that fail the balanced pass are rescued before
    // any can-include words get a chance to crowd the grid.
    priorityWordCount: sortedMust.words.length,
  });

  // Classify placed words by tier.
  // The generator stores the original word (un-reversed) in loc.word.
  const mustWordSet = new Set(mustWords);
  const canWordSet = new Set(canWords);
  const placedMust: DirectionalWord[] = [];
  const placedCan: DirectionalWord[] = [];

  for (const loc of crossword.wordLocations) {
    if (mustWordSet.has(loc.word)) {
      placedMust.push(loc);
      mustWordSet.delete(loc.word); // Prevent double-counting duplicates
    } else if (canWordSet.has(loc.word)) {
      placedCan.push(loc);
      canWordSet.delete(loc.word);
    }
  }

  return {
    crossword,
    placedMust,
    placedCan,
    unplacedMust: [...mustWordSet],
    unplacedCan: [...canWordSet],
    placedTotal: placedMust.length + placedCan.length,
    score: scoreCrossword(crossword).total,
  };
}

/**
 * Ranking: must-include placements first, then total placed words, then
 * quality score. Strictly-greater comparisons keep the earliest candidate
 * on ties, so results stay reproducible.
 */
function isBetterCandidate(a: RankedCandidate, b: RankedCandidate): boolean {
  if (a.placedMust.length !== b.placedMust.length) {
    return a.placedMust.length > b.placedMust.length;
  }
  if (a.placedTotal !== b.placedTotal) {
    return a.placedTotal > b.placedTotal;
  }
  return a.score > b.score;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Shuffle an array of word-clue pairs (for variety), then sort by word
 * length descending (longest first for better grid structure).
 *
 * Returns new arrays — does not mutate the inputs.
 */
function shuffleAndSortByLength(
  words: string[],
  clues: string[],
  random: SeededRandom
): { words: string[]; clues: string[] } {
  if (words.length === 0) {
    return { words: [], clues: [] };
  }

  // Pair up for shuffling and sorting together
  const pairs: { word: string; clue: string }[] = [];
  for (let i = 0; i < words.length; i++) {
    pairs.push({ word: words[i], clue: clues[i] });
  }

  // Shuffle for variety among same-length words
  random.shuffle(pairs);

  // Stable sort by length descending
  pairs.sort((a, b) => b.word.length - a.word.length);

  return {
    words: pairs.map(p => p.word),
    clues: pairs.map(p => p.clue),
  };
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
