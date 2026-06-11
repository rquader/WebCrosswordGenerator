/**
 * High-level puzzle creation.
 *
 * The UI passes normalized word-clue entries into these helpers.
 * They apply the shared length filter before delegating to the
 * crossword or word-search generators.
 *
 * Phase 10 adds:
 *   - createSkeletonFromEntries() — three-tier priority system + adaptive skeleton
 *   - createPuzzleWithPriority() — priority placement without skeleton
 */

import type {
  CrosswordResult,
  WordCluePair,
  WordSearchDirectionSettings,
  PrioritizedEntry,
  SkeletonResult,
  PriorityGeneratorResult,
} from './types';
import { generateCrossword } from './generator';
import { generateWordSearch } from './wordSearchGenerator';
import { generateCrosswordWithPriority } from './priorityGenerator';
import { generateSkeleton } from './skeletonGenerator';
import { filterByLength, prepareForGenerator } from './databaseProcessor';

/**
 * Options for creating a puzzle from word-clue entries.
 */
export interface EntryPuzzleOptions {
  entries: WordCluePair[];
  width: number;
  height: number;
  seed: number;
  allowReverseWords?: boolean;
  wordSearchDirections?: WordSearchDirectionSettings;

  /**
   * Word search only: grow the grid (+1 per side, capped) until every word
   * places. Default true — mirrors the crossword skeleton's growToFit.
   * Set false (Force Dimensions) to pin the size and report skipped words.
   */
  growToFit?: boolean;
}

function assertEntriesFit(entries: WordCluePair[], width: number, height: number): void {
  const maxDim = Math.max(width, height);
  if (filterByLength(entries, maxDim).length === 0) {
    throw new Error('No entries fit within the current grid dimensions');
  }
}

/**
 * Create a crossword puzzle from word-clue entries.
 */
export function createPuzzleFromEntries(options: EntryPuzzleOptions): CrosswordResult {
  assertEntriesFit(options.entries, options.width, options.height);

  const maxDim = Math.max(options.width, options.height);
  const { words, clues } = prepareForGenerator(options.entries, maxDim);

  return generateCrossword({
    width: options.width,
    height: options.height,
    seed: options.seed,
    words,
    clues,
    // Reversed entries aren't a crossword convention — off unless asked for.
    allowReverseWords: options.allowReverseWords ?? false,
  });
}

// ---------------------------------------------------------------------------
// Phase 10: Priority-based and skeleton generation
// ---------------------------------------------------------------------------

/**
 * Options for creating a puzzle with the three-tier priority system.
 */
export interface PriorityPuzzleOptions {
  entries: PrioritizedEntry[];
  width: number;
  height: number;
  seed: number;
  allowReverseWords?: boolean;
  /** Candidate layouts per generation (default 5 — see PriorityGeneratorConfig). */
  candidateCount?: number;
  /**
   * Skeleton only: grow the grid until every must-include word places
   * (default true — see SkeletonConfig.growToFit).
   */
  growToFit?: boolean;
}

/**
 * Create a crossword with priority-based placement (no skeleton).
 *
 * Must-include words are placed first (failures reported).
 * Can-include words fill remaining space (silently skipped if they don't fit).
 * Dont-include words are excluded.
 *
 * Use this when the caller has enough words to fill the grid
 * and doesn't need skeleton slots.
 */
export function createPuzzleWithPriority(
  options: PriorityPuzzleOptions
): PriorityGeneratorResult {
  const mustEntries = options.entries.filter(e => e.priority === 'must');
  const canEntries = options.entries.filter(e => e.priority === 'can');

  return generateCrosswordWithPriority({
    width: options.width,
    height: options.height,
    seed: options.seed,
    mustIncludeWords: mustEntries.map(e => e.word),
    mustIncludeClues: mustEntries.map(e => e.clue),
    canIncludeWords: canEntries.map(e => e.word),
    canIncludeClues: canEntries.map(e => e.clue),
    allowReverseWords: options.allowReverseWords ?? false,
    candidateCount: options.candidateCount,
  });
}

/**
 * Create a skeleton crossword from prioritized entries.
 *
 * This is the primary Phase 10 entry point. It:
 *   1. Places must-include and can-include words
 *   2. Adaptively decides if skeleton slots are needed
 *   3. If needed, fills gaps with word bank and strips to blank slots
 *   4. Returns SkeletonResult with filled + empty slots and constraint data
 */
export function createSkeletonFromEntries(
  options: PriorityPuzzleOptions
): SkeletonResult {
  return generateSkeleton({
    width: options.width,
    height: options.height,
    seed: options.seed,
    entries: options.entries,
    allowReverseWords: options.allowReverseWords,
    candidateCount: options.candidateCount,
    growToFit: options.growToFit,
  });
}

/**
 * Hard cap for word-search auto-growth, mirroring the skeleton generator's.
 * A grid at this size that still can't fit a word means the word itself is
 * unreasonable (30+ letters) — it stays in skippedWords instead of hanging.
 */
const WORD_SEARCH_GROW_CAP = 30;

/**
 * Create a word search puzzle from word-clue entries.
 *
 * By default the grid grows one cell per side until every word places
 * (growToFit). With growToFit: false the requested size is honored and
 * unplaced words are reported in skippedWords — including words that are
 * longer than the grid, which the length filter would otherwise drop
 * silently before the generator ever saw them.
 */
export function createWordSearchFromEntries(options: EntryPuzzleOptions): CrosswordResult {
  const growToFit = options.growToFit ?? true;

  if (!growToFit) {
    assertEntriesFit(options.entries, options.width, options.height);
    return wordSearchAtSize(options, options.width, options.height);
  }

  let width = options.width;
  let height = options.height;
  let result = wordSearchAtSize(options, width, height);

  while (result.skippedWords && Math.max(width, height) < WORD_SEARCH_GROW_CAP) {
    width = Math.min(width + 1, WORD_SEARCH_GROW_CAP);
    height = Math.min(height + 1, WORD_SEARCH_GROW_CAP);
    result = wordSearchAtSize(options, width, height);
  }

  if (width !== options.width || height !== options.height) {
    result.grewFrom = { width: options.width, height: options.height };
  }
  return result;
}

/** One word-search generation at a specific size, with too-long words reported. */
function wordSearchAtSize(options: EntryPuzzleOptions, width: number, height: number): CrosswordResult {
  const maxDim = Math.max(width, height);
  const { words, clues } = prepareForGenerator(options.entries, maxDim);
  const tooLong = options.entries
    .filter(e => e.word.length > maxDim)
    .map(e => e.word);

  const result = generateWordSearch({
    width,
    height,
    seed: options.seed,
    words,
    clues,
    directions: options.wordSearchDirections,
  });

  if (tooLong.length > 0) {
    result.skippedWords = [...(result.skippedWords ?? []), ...tooLong];
  }
  return result;
}
