/**
 * Word search puzzle generator.
 *
 * Unlike the crossword generator, word search:
 * - Does NOT require character intersections
 * - Places words in configurable directions (horizontal, vertical, diagonal, reversed)
 * - Fills empty cells with random letters
 * - All words can overlap if they share the same letter at the same position
 *
 * Uses the same seeded PRNG for reproducibility.
 */

import type { DirectionalWord, CrosswordResult, WordSearchDirectionSettings } from './types';
import { SeededRandom } from './seedRandom';

const EMPTY_CELL = '-';
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';

/** Named direction with its vector */
interface DirectionEntry {
  name: string;
  dx: number;
  dy: number;
}

/**
 * All 8 possible directions, tagged by category for filtering.
 */
const ALL_DIRECTIONS: { entry: DirectionEntry; setting: keyof WordSearchDirectionSettings }[] = [
  { entry: { name: 'right',           dx:  1, dy:  0 }, setting: 'horizontal' },
  { entry: { name: 'down',            dx:  0, dy:  1 }, setting: 'vertical' },
  { entry: { name: 'down-right',      dx:  1, dy:  1 }, setting: 'diagonal' },
  { entry: { name: 'down-left',       dx: -1, dy:  1 }, setting: 'diagonal' },
  { entry: { name: 'left',            dx: -1, dy:  0 }, setting: 'reversed' },
  { entry: { name: 'up',              dx:  0, dy: -1 }, setting: 'reversed' },
  { entry: { name: 'up-left',         dx: -1, dy: -1 }, setting: 'reversedDiagonal' },
  { entry: { name: 'up-right',        dx:  1, dy: -1 }, setting: 'reversedDiagonal' },
];

/** Default settings: horizontal + vertical only (simplest) */
export const DEFAULT_WORD_SEARCH_DIRECTIONS: WordSearchDirectionSettings = {
  horizontal: true,
  vertical: true,
  diagonal: false,
  reversed: false,
  reversedDiagonal: false,
};

export interface WordSearchConfig {
  width: number;
  height: number;
  seed: number;
  words: string[];
  clues: string[];
  directions?: WordSearchDirectionSettings;
}

/**
 * Build the list of allowed direction vectors from settings.
 */
function getActiveDirections(settings: WordSearchDirectionSettings): DirectionEntry[] {
  const active: DirectionEntry[] = [];
  for (const { entry, setting } of ALL_DIRECTIONS) {
    if (settings[setting]) {
      active.push(entry);
    }
  }
  return active;
}

/**
 * Generate a word search puzzle.
 * Returns the same CrosswordResult type for compatibility with the grid display.
 */
export function generateWordSearch(config: WordSearchConfig): CrosswordResult {
  const { width, height, seed, words, clues } = config;
  const dirSettings = config.directions ?? DEFAULT_WORD_SEARCH_DIRECTIONS;
  const random = new SeededRandom(seed);

  // Get allowed directions from settings
  const directions = getActiveDirections(dirSettings);

  // Fallback: if no directions enabled, use horizontal + vertical
  if (directions.length === 0) {
    directions.push(
      { name: 'right', dx: 1, dy: 0 },
      { name: 'down',  dx: 0, dy: 1 },
    );
  }

  // Initialize empty grid
  const grid: string[][] = [];
  for (let y = 0; y < height; y++) {
    const row: string[] = [];
    for (let x = 0; x < width; x++) {
      row.push(EMPTY_CELL);
    }
    grid.push(row);
  }

  // Pair words with clues, shuffle, sort by length descending
  const pairs: { word: string; clue: string }[] = [];
  for (let i = 0; i < words.length; i++) {
    pairs.push({ word: words[i], clue: clues[i] });
  }
  random.shuffle(pairs);
  pairs.sort((a, b) => b.word.length - a.word.length);

  const wordLocations: DirectionalWord[] = [];

  // Try to place each word
  for (const pair of pairs) {
    tryPlaceWord(grid, pair.word, pair.clue, width, height, random, wordLocations, directions);
  }

  // Fill remaining empty cells with random letters
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (grid[y][x] === EMPTY_CELL) {
        const randomIndex = random.nextInt(ALPHABET.length);
        grid[y][x] = ALPHABET[randomIndex];
      }
    }
  }

  return { grid, wordLocations, width, height };
}

/**
 * Try to place a word on the grid in a random allowed direction.
 * Returns true if successfully placed.
 */
function tryPlaceWord(
  grid: string[][],
  word: string,
  clue: string,
  width: number,
  height: number,
  random: SeededRandom,
  wordLocations: DirectionalWord[],
  directions: DirectionEntry[]
): boolean {
  // Shuffle direction order for variety
  const dirIndices = directions.map((_, i) => i);
  random.shuffle(dirIndices);

  for (const dirIdx of dirIndices) {
    const { dx, dy } = directions[dirIdx];

    // Collect all valid starting positions for this direction + word length
    const validPositions: [number, number][] = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (canPlaceAt(grid, word, x, y, dx, dy, width, height)) {
          validPositions.push([x, y]);
        }
      }
    }

    if (validPositions.length === 0) continue;

    // Pick a random valid position
    const posIndex = random.nextInt(validPositions.length);
    const [startX, startY] = validPositions[posIndex];

    // Place the word
    for (let i = 0; i < word.length; i++) {
      grid[startY + i * dy][startX + i * dx] = word[i];
    }

    // Determine direction type for clue display
    const isHorizontal = dy === 0;
    const isReversed = dx < 0 || (dx === 0 && dy < 0);

    wordLocations.push({
      word,
      isHorizontal,
      isReversed,
      clue,
      x: startX,
      y: startY,
    });

    return true;
  }

  return false;
}

/**
 * Check if a word can be placed at (x, y) going in direction (dx, dy).
 */
function canPlaceAt(
  grid: string[][],
  word: string,
  x: number,
  y: number,
  dx: number,
  dy: number,
  width: number,
  height: number
): boolean {
  for (let i = 0; i < word.length; i++) {
    const cx = x + i * dx;
    const cy = y + i * dy;

    if (cx < 0 || cx >= width || cy < 0 || cy >= height) {
      return false;
    }

    const existing = grid[cy][cx];
    if (existing !== EMPTY_CELL && existing !== word[i]) {
      return false;
    }
  }

  return true;
}
