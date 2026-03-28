/**
 * Crossword engine — public API.
 *
 * All exports from this module are pure TypeScript with no DOM dependencies.
 * They can be used in tests, web workers, or any other environment.
 */

// High-level puzzle creation (recommended entry point — includes filtering)
export { createPuzzleFromPreset, createPuzzleFromCustom } from './createPuzzle';
export type { PuzzleOptions, CustomPuzzleOptions } from './createPuzzle';

// Low-level generator (use createPuzzle* instead unless you handle filtering yourself)
export { generateCrossword } from './generator';

// Database and filtering
export { presetCategories, getCategoryById } from './database';
export { filterByLength, getWords, getClues, prepareForGenerator } from './databaseProcessor';

// Seeded PRNG
export { SeededRandom } from './seedRandom';

// Types
export type {
  DirectionalWord,
  Intersection,
  WordCluePair,
  CrosswordResult,
  PresetCategory,
  GeneratorConfig,
} from './types';
