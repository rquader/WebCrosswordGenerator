/**
 * Crossword puzzle generator engine.
 *
 * This is a faithful port of Generator.java by Armaan Saini.
 * The algorithm places words into a grid using character intersections:
 *
 *   1. Pair words with clues, shuffle (seeded), sort by length descending
 *   2. Place the longest word first at (0,0)
 *   3. For each remaining word, find grid cells where characters match
 *   4. Try to place at each intersection, respecting direction balancing
 *   5. If placement fails and reverse is allowed, try the word reversed
 *
 * Direction balancing logic ensures a mix of horizontal and vertical words.
 */

import type { DirectionalWord, Intersection, WordCluePair, CrosswordResult, GeneratorConfig } from './types';
import { SeededRandom } from './seedRandom';

// Empty cell marker (matches Java's '-' character)
const EMPTY_CELL = '-';

/**
 * Generate a crossword puzzle from the given configuration.
 * This is the main entry point — replaces `new Generator(...)` from Java.
 */
export function generateCrossword(config: GeneratorConfig): CrosswordResult {
  const generator = new CrosswordGenerator(config);
  return generator.getResult();
}

/**
 * Internal generator class. Encapsulates all state during generation.
 * Not exported — use generateCrossword() instead.
 */
class CrosswordGenerator {
  private grid: string[][];
  private readonly width: number;
  private readonly height: number;
  private words: string[];
  private clues: string[];
  private random: SeededRandom;
  private reverseBlacklist: Set<string>;
  private allowReverseWords: boolean;
  private wordLocations: DirectionalWord[];
  private reversedWordsMap: Map<string, string>;
  private debug: boolean;
  private presorted: boolean;

  constructor(config: GeneratorConfig) {
    this.width = config.width;
    this.height = config.height;
    this.words = [...config.words];
    this.clues = [...config.clues];
    this.random = new SeededRandom(config.seed);
    this.allowReverseWords = config.allowReverseWords;
    this.reverseBlacklist = new Set();
    this.wordLocations = [];
    this.reversedWordsMap = new Map();
    this.debug = config.debug ?? false;
    this.presorted = config.presorted ?? false;

    // Initialize grid with empty cells
    this.grid = [];
    for (let y = 0; y < this.height; y++) {
      const row: string[] = [];
      for (let x = 0; x < this.width; x++) {
        row.push(EMPTY_CELL);
      }
      this.grid.push(row);
    }

    this.generate();
  }

  /**
   * Returns the completed crossword result.
   */
  getResult(): CrosswordResult {
    return {
      grid: this.grid,
      wordLocations: this.wordLocations,
      width: this.width,
      height: this.height,
    };
  }

  // --- Bounds checking ---

  /** Check if a word of given length fits horizontally starting at (x, y). */
  private checkFitsInRow(x: number, y: number, length: number): boolean {
    return (x + length <= this.width) && (y < this.height);
  }

  /** Check if a word of given length fits vertically starting at (x, y). */
  private checkFitsInColumn(x: number, y: number, length: number): boolean {
    return (x < this.width) && (y + length <= this.height);
  }

  // --- Debug utilities ---

  private debugPrint(message: string): void {
    if (this.debug) {
      console.log('[DBG] ' + message);
    }
  }

  private printGrid(): void {
    for (const row of this.grid) {
      console.log(row.join(' '));
    }
  }

  // --- Cell inspection ---

  /** Check if a grid cell is occupied (not empty). */
  private isOccupied(x: number, y: number): boolean {
    return this.grid[y][x] !== EMPTY_CELL;
  }

  /**
   * Count occupied cells in a row segment from x1 to x2 (inclusive).
   * Returns -1 if the segment is out of bounds.
   */
  private getPartialRowOccupations(y: number, x1: number, x2: number): number {
    if (x1 < 0 || x2 >= this.width || y < 0 || y >= this.height) {
      return -1;
    }

    let count = 0;
    for (let i = x1; i <= x2; i++) {
      if (this.isOccupied(i, y)) {
        count++;
      }
    }
    return count;
  }

  /**
   * Count occupied cells in a column segment from y1 to y2 (inclusive).
   * Returns -1 if the segment is out of bounds.
   */
  private getPartialColumnOccupations(x: number, y1: number, y2: number): number {
    if (y1 < 0 || y2 >= this.height || x < 0 || x >= this.width) {
      return -1;
    }

    let count = 0;
    for (let i = y1; i <= y2; i++) {
      if (this.isOccupied(x, i)) {
        count++;
      }
    }
    return count;
  }

  // --- Word placement ---

  /**
   * Place a word on the grid at (x, y) in the given direction.
   * Records the placement in wordLocations.
   */
  private placeWord(word: string, clue: string, x: number, y: number, horizontal: boolean): void {
    if (horizontal) {
      for (let i = 0; i < word.length; i++) {
        this.grid[y][x + i] = word.charAt(i);
      }
    } else {
      for (let i = 0; i < word.length; i++) {
        this.grid[y + i][x] = word.charAt(i);
      }
    }

    // Check if this word is a reversed version of another
    const originalWord = this.reversedWordsMap.get(word);
    const isReversed = originalWord !== undefined;
    const actualWord = isReversed ? originalWord : word;

    this.wordLocations.push({
      word: actualWord,
      isHorizontal: horizontal,
      isReversed: isReversed,
      clue: clue,
      x: x,
      y: y,
    });
  }

  // --- Intersection detection ---

  /**
   * Find all grid positions where a character in the word matches
   * an already-placed character on the grid.
   */
  private findAllIntersections(word: string): Intersection[] {
    const result: Intersection[] = [];
    this.debugPrint('Current word: ' + word);

    for (let charIndex = 0; charIndex < word.length; charIndex++) {
      const c = word.charAt(charIndex);
      for (let x = 0; x < this.width; x++) {
        for (let y = 0; y < this.height; y++) {
          if (this.grid[y][x] === c) {
            result.push({ x, y, charIndex });
          }
        }
      }
    }

    return result;
  }

  // --- Row/column placement validation ---

  /**
   * Try to place a word horizontally at an intersection point.
   * The word is valid if the row segment has exactly 1 occupied cell
   * (the intersection itself) and it fits within bounds.
   */
  private checkRow(word: string, clue: string, loc: Intersection): boolean {
    const startX = loc.x - loc.charIndex;
    const endX = startX + word.length - 1;

    const occupations = this.getPartialRowOccupations(loc.y, startX, endX);
    if (occupations === 1 && this.checkFitsInRow(startX, loc.y, word.length)) {
      this.placeWord(word, clue, startX, loc.y, true);
      return true;
    }
    return false;
  }

  /**
   * Try to place a word vertically at an intersection point.
   * The word is valid if the column segment has exactly 1 occupied cell
   * (the intersection itself) and it fits within bounds.
   */
  private checkColumn(word: string, clue: string, loc: Intersection): boolean {
    const startY = loc.y - loc.charIndex;
    const endY = startY + word.length - 1;

    const occupations = this.getPartialColumnOccupations(loc.x, startY, endY);
    if (occupations === 1 && this.checkFitsInColumn(loc.x, startY, word.length)) {
      this.placeWord(word, clue, loc.x, startY, false);
      return true;
    }
    return false;
  }

  // --- Main generation algorithm ---

  /**
   * The core generation loop — faithful port of Generator.java's generate().
   *
   * Algorithm:
   *   1. Pair words with clues
   *   2. Shuffle pairs (seeded for reproducibility)
   *   3. Sort by word length descending (longer words placed first)
   *   4. Place first word at origin
   *   5. For each remaining word, find intersections and attempt placement
   *   6. Direction balancing ensures a mix of horizontal/vertical words
   *   7. Failed words can be retried reversed (if allowed)
   */
  private generate(): void {
    this.debugPrint('Words: ' + this.words.join(', '));

    // Step 1: Combine words and clues into pairs
    const pairs: WordCluePair[] = [];
    for (let i = 0; i < this.words.length; i++) {
      pairs.push({ word: this.words[i], clue: this.clues[i] });
    }

    // Step 2-3: Shuffle and sort — unless the caller pre-sorted the words
    // (used by the priority generator to control placement order).
    if (!this.presorted) {
      this.random.shuffle(pairs);
      this.debugPrint('Shuffled: ' + pairs.map(p => p.word).join(', '));

      pairs.sort((a, b) => b.word.length - a.word.length);
      this.debugPrint('Sorted: ' + pairs.map(p => p.word).join(', '));
    } else {
      this.debugPrint('Pre-sorted (skipping shuffle/sort): ' + pairs.map(p => p.word).join(', '));
    }

    // Unpack back to separate arrays
    this.words = pairs.map(p => p.word);
    this.clues = pairs.map(p => p.clue);

    // Step 4: Place the first (longest) word at origin.
    // Words are pre-filtered by databaseProcessor to fit within max(width, height),
    // so the first word is guaranteed to fit in at least one direction.
    const firstWord = this.words.shift()!;
    const firstClue = this.clues.shift()!;
    const firstHorizontal = firstWord.length <= this.width;
    this.placeWord(firstWord, firstClue, 0, 0, firstHorizontal);

    // Track direction counts for balancing
    let horizontalCount = firstHorizontal ? 1 : 0;
    let verticalCount = firstHorizontal ? 0 : 1;

    // Step 5: Place remaining words using intersections
    while (this.words.length > 0) {
      const word = this.words.shift()!;
      const clue = this.clues.shift()!;
      const locations = this.findAllIntersections(word);
      let placementFound = false;

      // Try each intersection point
      for (let i = 0; i < locations.length; i++) {
        const loc = locations[i];

        // Step 6: Direction balancing logic
        // Determines which direction to try first, and whether to allow fallback
        let tryHorizontalFirst: boolean;
        let forceDirection = false;
        const gap = horizontalCount - verticalCount;

        if (horizontalCount === 0) {
          // No horizontal words yet — force horizontal
          tryHorizontalFirst = true;
          forceDirection = true;
        } else if (verticalCount === 0) {
          // No vertical words yet — force vertical
          tryHorizontalFirst = false;
          forceDirection = true;
        } else if (gap <= -3) {
          // 3+ more verticals than horizontals — force horizontal
          tryHorizontalFirst = true;
          forceDirection = true;
        } else if (gap >= 3) {
          // 3+ more horizontals than verticals — force vertical
          tryHorizontalFirst = false;
          forceDirection = true;
        } else if (horizontalCount < 2) {
          // Only 1 horizontal — try horizontal first, allow fallback
          tryHorizontalFirst = true;
        } else if (verticalCount < 2) {
          // Only 1 vertical — try vertical first, allow fallback
          tryHorizontalFirst = false;
        } else if (horizontalCount <= verticalCount) {
          // Fewer horizontals — 2-in-3 chance to try horizontal first
          tryHorizontalFirst = this.random.nextInt(3) < 2;
        } else {
          // Fewer verticals — 1-in-3 chance horizontal (2-in-3 vertical)
          tryHorizontalFirst = this.random.nextInt(3) < 1;
        }

        // Attempt placement in preferred direction, fallback to other if allowed
        if (tryHorizontalFirst) {
          if (this.checkRow(word, clue, loc)) {
            horizontalCount++;
            placementFound = true;
          } else if (!forceDirection && this.checkColumn(word, clue, loc)) {
            verticalCount++;
            placementFound = true;
          }
        } else {
          if (this.checkColumn(word, clue, loc)) {
            verticalCount++;
            placementFound = true;
          } else if (!forceDirection && this.checkRow(word, clue, loc)) {
            horizontalCount++;
            placementFound = true;
          }
        }

        if (placementFound) {
          break;
        }
      }

      // Step 7: If placement failed, try the word reversed
      if (this.allowReverseWords && !placementFound && !this.reverseBlacklist.has(word)) {
        const reversed = word.split('').reverse().join('');
        this.words.unshift(reversed);
        this.clues.unshift(clue);
        this.reverseBlacklist.add(reversed);
        this.reversedWordsMap.set(reversed, word);
      }
    }

    this.debugPrint('Final grid:');
    if (this.debug) {
      this.printGrid();
    }
  }
}
