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
    allowReverseWords: options.allowReverseWords ?? true,
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
    allowReverseWords: options.allowReverseWords ?? true,
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
  });
}

/**
 * Create a word search puzzle from word-clue entries.
 */
export function createWordSearchFromEntries(options: EntryPuzzleOptions): CrosswordResult {
  assertEntriesFit(options.entries, options.width, options.height);

  const maxDim = Math.max(options.width, options.height);
  const { words, clues } = prepareForGenerator(options.entries, maxDim);

  return generateWordSearch({
    width: options.width,
    height: options.height,
    seed: options.seed,
    words,
    clues,
    directions: options.wordSearchDirections,
  });
}
