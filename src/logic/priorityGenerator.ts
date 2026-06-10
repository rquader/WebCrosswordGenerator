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

/** Default number of candidate layouts generated per call. */
const DEFAULT_CANDIDATE_COUNT = 5;

/**
 * First-word offsets (from grid center) used to diversify candidates.
 * Candidate i uses offset i % length, so the first candidate is centered.
 */
const CANDIDATE_OFFSETS = [0, -2, 2, -4, 4, -1, 1, -3, 3, -5, 5];

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
  const candidateCount = Math.max(1, config.candidateCount ?? DEFAULT_CANDIDATE_COUNT);
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

    // Everything placed — no later candidate can beat this on coverage,
    // and stopping early keeps generation snappy.
    if (best.placedMust.length === mustWords.length &&
        best.placedTotal === mustWords.length + canWords.length) {
      break;
    }
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
