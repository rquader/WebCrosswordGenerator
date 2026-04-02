/**
 * High-level puzzle creation.
 *
 * The UI passes normalized word-clue entries into these helpers.
 * They apply the shared length filter before delegating to the
 * crossword or word-search generators.
 */

import type { CrosswordResult, WordCluePair, WordSearchDirectionSettings } from './types';
import { generateCrossword } from './generator';
import { generateWordSearch } from './wordSearchGenerator';
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
