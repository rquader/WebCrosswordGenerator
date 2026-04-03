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
} from './types';
import { generateCrossword } from './generator';
import { SeededRandom } from './seedRandom';

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

  for (let i = 0; i < config.canIncludeWords.length; i++) {
    const word = config.canIncludeWords[i];
    const clue = config.canIncludeClues[i];
    if (word.length <= maxDim) {
      canWords.push(word);
      canClues.push(clue);
    }
    // Can-include words that are too long are silently dropped — expected
  }

  // Sort each tier by length descending (longest first = best grid structure).
  // Shuffle within each tier for variety (seeded for reproducibility).
  const random = new SeededRandom(config.seed);
  const sortedMust = shuffleAndSortByLength(mustWords, mustClues, random);
  const sortedCan = shuffleAndSortByLength(canWords, canClues, random);

  // Concatenate: must-include first, then can-include.
  // The core generator will preserve this order (presorted: true).
  const allWords = [...sortedMust.words, ...sortedCan.words];
  const allClues = [...sortedMust.clues, ...sortedCan.clues];

  // Edge case: no words at all
  if (allWords.length === 0) {
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

  // Run the core generator with presorted word order
  const crossword = generateCrossword({
    width: config.width,
    height: config.height,
    seed: config.seed,
    words: allWords,
    clues: allClues,
    allowReverseWords: config.allowReverseWords,
    debug: config.debug,
    presorted: true,
  });

  // Classify placed words by tier
  const mustWordSet = new Set(mustWords);
  const canWordSet = new Set(canWords);

  const placedMust: DirectionalWord[] = [];
  const placedCan: DirectionalWord[] = [];

  for (const loc of crossword.wordLocations) {
    // The generator stores the original word (un-reversed) in loc.word
    if (mustWordSet.has(loc.word)) {
      placedMust.push(loc);
      mustWordSet.delete(loc.word); // Prevent double-counting duplicates
    } else if (canWordSet.has(loc.word)) {
      placedCan.push(loc);
      canWordSet.delete(loc.word);
    }
  }

  // Must-include words that weren't placed → failures
  const failedMust: PlacementFailure[] = [...tooLongFailures];
  for (const word of mustWordSet) {
    failedMust.push({ word, reason: 'no_intersection' });
  }

  // Can-include words that weren't placed → skipped (not failures)
  const skippedCan: string[] = [...canWordSet];

  return {
    crossword,
    placedMust,
    placedCan,
    failedMust,
    skippedCan,
  };
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
