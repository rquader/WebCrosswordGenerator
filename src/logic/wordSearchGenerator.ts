/**
 * Word search puzzle generator.
 *
 * Unlike the crossword generator, word search:
 * - Does NOT require character intersections
 * - Places words in any direction (horizontal, vertical, diagonal)
 * - Fills empty cells with random letters
 * - All words can overlap if they share the same letter at the same position
 *
 * Uses the same seeded PRNG for reproducibility.
 */

import type { DirectionalWord, CrosswordResult } from './types';
import { SeededRandom } from './seedRandom';

const EMPTY_CELL = '-';
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';

// Direction vectors: [dx, dy]
// Horizontal, vertical, and diagonal (both forward and backward)
const DIRECTIONS: [number, number][] = [
  [1, 0],   // right
  [0, 1],   // down
  [1, 1],   // diagonal down-right
  [-1, 1],  // diagonal down-left
  [-1, 0],  // left
  [0, -1],  // up
  [-1, -1], // diagonal up-left
  [1, -1],  // diagonal up-right
];

export interface WordSearchConfig {
  width: number;
  height: number;
  seed: number;
  words: string[];
  clues: string[];
}

/**
 * Generate a word search puzzle.
 * Returns the same CrosswordResult type for compatibility with the grid display.
 */
export function generateWordSearch(config: WordSearchConfig): CrosswordResult {
  const { width, height, seed, words, clues } = config;
  const random = new SeededRandom(seed);

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
    const placed = tryPlaceWord(grid, pair.word, pair.clue, width, height, random, wordLocations);
    if (!placed) {
      // Word didn't fit — skip it (this is expected for large words on small grids)
    }
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
 * Try to place a word on the grid in a random direction.
 * Attempts all 8 directions at random starting positions.
 * Returns true if successfully placed.
 */
function tryPlaceWord(
  grid: string[][],
  word: string,
  clue: string,
  width: number,
  height: number,
  random: SeededRandom,
  wordLocations: DirectionalWord[]
): boolean {
  // Shuffle direction order for variety
  const directionOrder = [0, 1, 2, 3, 4, 5, 6, 7];
  random.shuffle(directionOrder);

  // Try each direction
  for (const dirIndex of directionOrder) {
    const [dx, dy] = DIRECTIONS[dirIndex];

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

    // Determine if this is horizontal for the DirectionalWord type
    // (word search has more directions, but we map to horizontal/vertical for clue display)
    const isHorizontal = dy === 0;

    wordLocations.push({
      word: word,
      isHorizontal: isHorizontal,
      isReversed: dx < 0 || (dx === 0 && dy < 0),
      clue: clue,
      x: startX,
      y: startY,
    });

    return true;
  }

  return false;
}

/**
 * Check if a word can be placed at (x, y) going in direction (dx, dy).
 * A word can be placed if:
 * - Every cell is within bounds
 * - Every cell is either empty or already contains the matching letter
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

    // Bounds check
    if (cx < 0 || cx >= width || cy < 0 || cy >= height) {
      return false;
    }

    // Cell must be empty or already have the correct letter
    const existing = grid[cy][cx];
    if (existing !== EMPTY_CELL && existing !== word[i]) {
      return false;
    }
  }

  return true;
}
