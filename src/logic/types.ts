/**
 * Core types for the crossword generator engine.
 * These map directly to the Java classes: DirectionalWord, Intersection, WordCluePair.
 *
 * Ported from Java originals by Armaan Saini.
 */

/**
 * A word placed in the crossword grid with its position, direction, and clue.
 * Maps to DirectionalWord.java.
 */
export interface DirectionalWord {
  word: string;
  isHorizontal: boolean;
  isReversed: boolean;
  clue: string;
  x: number;
  y: number;
}

/**
 * A point on the grid where a new word's character matches an existing character.
 * Used during placement to find valid positions.
 * Maps to Intersection.java.
 */
export interface Intersection {
  x: number;
  y: number;
  charIndex: number;
}

/**
 * A word paired with its clue, used during shuffle/sort before placement.
 * Maps to WordCluePair inner class in Generator.java.
 */
export interface WordCluePair {
  word: string;
  clue: string;
}

/**
 * The result returned by the generator after placing words.
 */
export interface CrosswordResult {
  grid: string[][];
  wordLocations: DirectionalWord[];
  width: number;
  height: number;
}

/**
 * Configuration for generating a crossword.
 */
export interface GeneratorConfig {
  width: number;
  height: number;
  seed: number;
  words: string[];
  clues: string[];
  allowReverseWords: boolean;
  debug?: boolean;

  /**
   * If true, skip the shuffle-and-sort step in the generator.
   * The words array is used in the exact order provided.
   *
   * Used by the priority generator to ensure must-include words
   * (sorted by length, placed first) aren't re-sorted with can-include words.
   *
   * Default: false (existing behavior — shuffle then sort by length desc).
   */
  presorted?: boolean;
}

/**
 * Direction settings for word search puzzles.
 * Controls which placement directions are allowed.
 */
export interface WordSearchDirectionSettings {
  horizontal: boolean;
  vertical: boolean;
  diagonal: boolean;
  reversed: boolean;
  reversedDiagonal: boolean;
}

/**
 * Puzzle type - crossword or word search.
 */
export type PuzzleMode = 'crossword' | 'wordsearch';

// ---------------------------------------------------------------------------
// Phase 10: Three-tier word system & skeleton types
// ---------------------------------------------------------------------------

/**
 * Priority tier for a word entry.
 *
 * - 'must'  — Guaranteed in the puzzle. Generator places these first and
 *             reports a failure if any can't be placed.
 * - 'can'   — Best-effort. Placed after must-include words into remaining
 *             intersections. Silently skipped if they don't fit.
 * - 'dont'  — Excluded entirely. Never passed to the generator.
 */
export type WordPriority = 'must' | 'can' | 'dont';

/**
 * A word-clue pair tagged with a priority tier.
 * Used by the three-tier import review and the priority-based generator.
 */
export interface PrioritizedEntry {
  word: string;
  clue: string;
  priority: WordPriority;
}

/**
 * A single slot in a generated skeleton — either pre-filled (from a
 * must/can-include word) or empty (needs manual fill by the user).
 */
export interface SkeletonSlot {
  /** Sequential ID used for display (1-Across, 2-Down, etc.) */
  id: number;

  /** Slot direction. */
  direction: 'across' | 'down';

  /** Grid coordinates of the first cell in this slot. */
  startX: number;
  startY: number;

  /** Number of characters the slot accepts. */
  length: number;

  /**
   * Letters locked by crossing words.
   * Key = zero-based character position within the slot.
   * Value = the locked letter (lowercase).
   * Example: { 2: 'a', 5: 'r' } means position 2 must be 'a' and 5 must be 'r'.
   */
  constraints: Map<number, string>;

  /** The word filling this slot, if already placed (must/can-include). */
  word?: string;

  /** The clue for this slot, if already placed. */
  clue?: string;

  /** Whether this slot was placed from a user-provided entry (vs word bank). */
  isUserWord: boolean;
}

/**
 * Result returned by the skeleton generator.
 */
export interface SkeletonResult {
  /** The underlying grid (may have empty cells where word-bank words were stripped). */
  grid: string[][];

  /** All slots in the skeleton, both filled and empty. */
  slots: SkeletonSlot[];

  /** Grid dimensions. */
  width: number;
  height: number;

  /** How many must-include words were successfully placed. */
  mustPlacedCount: number;
  /** How many must-include words were provided. */
  mustTotalCount: number;

  /** How many can-include words were successfully placed. */
  canPlacedCount: number;
  /** How many can-include words were provided. */
  canTotalCount: number;

  /** Must-include words that couldn't be placed, with reasons. */
  failures: PlacementFailure[];
}

/**
 * Describes why a must-include word couldn't be placed.
 */
export interface PlacementFailure {
  word: string;
  reason: 'too_long' | 'no_intersection' | 'grid_full';
}

/**
 * Configuration for the priority-based generator.
 * Extends GeneratorConfig with separate must/can word lists.
 */
export interface PriorityGeneratorConfig {
  width: number;
  height: number;
  seed: number;
  mustIncludeWords: string[];
  mustIncludeClues: string[];
  canIncludeWords: string[];
  canIncludeClues: string[];
  allowReverseWords: boolean;
  debug?: boolean;
}

/**
 * Result of priority-based generation, extending CrosswordResult with
 * metadata about which tier each placed word came from.
 */
export interface PriorityGeneratorResult {
  /** Standard crossword result (grid, wordLocations, dimensions). */
  crossword: CrosswordResult;

  /** Words that were placed from the must-include list. */
  placedMust: DirectionalWord[];

  /** Words that were placed from the can-include list. */
  placedCan: DirectionalWord[];

  /** Must-include words that couldn't be placed. */
  failedMust: PlacementFailure[];

  /** Can-include words that weren't placed (not failures — expected). */
  skippedCan: string[];
}

/**
 * Grid size recommendation output.
 */
export interface GridRecommendation {
  /** Recommended width. */
  width: number;
  /** Recommended height. */
  height: number;
  /** Human-readable explanation. */
  reason: string;
  /** Minimum dimension (longest must-include word length). */
  minDimension: number;
  /** Words flagged as length outliers. */
  outliers: OutlierWord[];
}

/**
 * A word flagged as a length outlier relative to the rest of the set.
 */
export interface OutlierWord {
  word: string;
  length: number;
  /** Median length of all other words. */
  medianOtherLength: number;
}
