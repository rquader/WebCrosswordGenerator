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
