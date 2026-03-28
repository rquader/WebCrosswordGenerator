/**
 * High-level puzzle creation — the main entry point for the UI.
 *
 * This mirrors what CrosswordUI.generateCrossword() did in Java:
 *   1. Get the selected category from the database
 *   2. Filter words by max(width, height) — ensures all words fit the grid
 *   3. Pass filtered words + config to the generator
 *
 * By bundling filtering + generation together, the UI layer
 * can never accidentally skip the length filter.
 */

import type { CrosswordResult, WordCluePair } from './types';
import { generateCrossword } from './generator';
import { generateWordSearch } from './wordSearchGenerator';
import { prepareForGenerator } from './databaseProcessor';
import { getCategoryById } from './database';

/**
 * Options for creating a puzzle from a preset category.
 */
export interface PuzzleOptions {
  categoryId: string;
  width: number;
  height: number;
  seed: number;
  allowReverseWords?: boolean;
}

/**
 * Options for creating a puzzle from custom word-clue pairs.
 */
export interface CustomPuzzleOptions {
  entries: WordCluePair[];
  width: number;
  height: number;
  seed: number;
  allowReverseWords?: boolean;
}

/**
 * Create a crossword puzzle from a preset category.
 * Handles filtering automatically — words longer than max(width, height) are excluded,
 * exactly like the Java version's CrosswordUI.generateCrossword().
 */
export function createPuzzleFromPreset(options: PuzzleOptions): CrosswordResult {
  const category = getCategoryById(options.categoryId);
  if (!category) {
    throw new Error('Unknown category: ' + options.categoryId);
  }

  // Filter words to fit the grid, just like Java's:
  //   int maxDim = Math.max(w, h);
  //   ArrayList<String> wordList = dp.getTermsByLength(selectedUnit, maxDim);
  const maxDim = Math.max(options.width, options.height);
  const { words, clues } = prepareForGenerator(category.entries, maxDim);

  return generateCrossword({
    width: options.width,
    height: options.height,
    seed: options.seed,
    words: words,
    clues: clues,
    allowReverseWords: options.allowReverseWords ?? true,
  });
}

/**
 * Create a crossword puzzle from custom user-provided word-clue pairs.
 * Also filters by max dimension — same guarantee as presets.
 */
export function createPuzzleFromCustom(options: CustomPuzzleOptions): CrosswordResult {
  const maxDim = Math.max(options.width, options.height);
  const { words, clues } = prepareForGenerator(options.entries, maxDim);

  return generateCrossword({
    width: options.width,
    height: options.height,
    seed: options.seed,
    words: words,
    clues: clues,
    allowReverseWords: options.allowReverseWords ?? true,
  });
}

/**
 * Create a word search puzzle from a preset category.
 * Word search has different placement rules (no intersection requirement,
 * 8 directions including diagonals, empty cells filled with random letters).
 */
export function createWordSearchFromPreset(options: PuzzleOptions): CrosswordResult {
  const category = getCategoryById(options.categoryId);
  if (!category) {
    throw new Error('Unknown category: ' + options.categoryId);
  }

  const maxDim = Math.max(options.width, options.height);
  const { words, clues } = prepareForGenerator(category.entries, maxDim);

  return generateWordSearch({
    width: options.width,
    height: options.height,
    seed: options.seed,
    words: words,
    clues: clues,
  });
}

/**
 * Create a word search puzzle from custom word-clue pairs.
 */
export function createWordSearchFromCustom(options: CustomPuzzleOptions): CrosswordResult {
  const maxDim = Math.max(options.width, options.height);
  const { words, clues } = prepareForGenerator(options.entries, maxDim);

  return generateWordSearch({
    width: options.width,
    height: options.height,
    seed: options.seed,
    words: words,
    clues: clues,
  });
}
