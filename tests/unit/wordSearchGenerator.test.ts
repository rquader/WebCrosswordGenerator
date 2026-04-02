/**
 * Comprehensive tests for the word search generator.
 *
 * Tests cover:
 * 1. Direction settings — each direction toggle is respected
 * 2. Placement correctness — words appear in the grid where stated
 * 3. Seed reproducibility
 * 4. Edge cases — small grids, no directions, overlapping words
 * 5. Random fill — empty cells are filled with letters
 * 6. Integration with createPuzzle functions
 */

import { describe, it, expect } from 'vitest';
import { generateWordSearch, DEFAULT_WORD_SEARCH_DIRECTIONS } from '@logic/wordSearchGenerator';
import type { WordSearchConfig } from '@logic/wordSearchGenerator';
import type { WordSearchDirectionSettings, DirectionalWord } from '@logic/types';
import { createWordSearchFromEntries } from '@logic/createPuzzle';

// Helper: build a config
function makeConfig(overrides: Partial<WordSearchConfig> = {}): WordSearchConfig {
  return {
    width: 10,
    height: 10,
    seed: 42,
    words: ['java', 'array', 'loop', 'class', 'method'],
    clues: [
      'A programming language',
      'A collection of elements',
      'Repeating code block',
      'A blueprint for objects',
      'A function in a class',
    ],
    ...overrides,
  };
}

// Helper: verify a placed word's letters exist in the grid at its stated position
function verifyWordInGrid(
  grid: string[][],
  placed: DirectionalWord,
  width: number,
  height: number
): boolean {
  // Determine the direction vector from isHorizontal and isReversed
  // For word search, we need to check all 8 directions
  // The word is stored as placed.word, and we need to find it starting at (placed.x, placed.y)
  // The direction is encoded as isHorizontal + isReversed, but for diagonal words this is approximate.
  // Instead, just check that the word letters match starting from the position in some valid direction.
  const directions: [number, number][] = [
    [1, 0], [0, 1], [1, 1], [-1, 1],
    [-1, 0], [0, -1], [-1, -1], [1, -1],
  ];

  for (const [dx, dy] of directions) {
    let matches = true;
    for (let i = 0; i < placed.word.length; i++) {
      const cx = placed.x + i * dx;
      const cy = placed.y + i * dy;
      if (cx < 0 || cx >= width || cy < 0 || cy >= height) {
        matches = false;
        break;
      }
      if (grid[cy][cx] !== placed.word[i]) {
        matches = false;
        break;
      }
    }
    if (matches) return true;
  }
  return false;
}

// Helper: extract the direction vector of a placed word by checking the grid
function getPlacedDirection(
  grid: string[][],
  placed: DirectionalWord,
  width: number,
  height: number
): [number, number] | null {
  const directions: [number, number][] = [
    [1, 0], [0, 1], [1, 1], [-1, 1],
    [-1, 0], [0, -1], [-1, -1], [1, -1],
  ];

  for (const [dx, dy] of directions) {
    let matches = true;
    for (let i = 0; i < placed.word.length; i++) {
      const cx = placed.x + i * dx;
      const cy = placed.y + i * dy;
      if (cx < 0 || cx >= width || cy < 0 || cy >= height) {
        matches = false;
        break;
      }
      if (grid[cy][cx] !== placed.word[i]) {
        matches = false;
        break;
      }
    }
    if (matches) return [dx, dy];
  }
  return null;
}

describe('WordSearchGenerator', () => {
  describe('default behavior', () => {
    it('generates a grid of the correct dimensions', () => {
      const result = generateWordSearch(makeConfig({ width: 8, height: 6 }));
      expect(result.width).toBe(8);
      expect(result.height).toBe(6);
      expect(result.grid.length).toBe(6);
      expect(result.grid[0].length).toBe(8);
    });

    it('places at least one word', () => {
      const result = generateWordSearch(makeConfig());
      expect(result.wordLocations.length).toBeGreaterThan(0);
    });

    it('fills all cells with letters (no empty cells remain)', () => {
      const result = generateWordSearch(makeConfig());
      for (let y = 0; y < result.height; y++) {
        for (let x = 0; x < result.width; x++) {
          expect(result.grid[y][x]).toMatch(/^[a-z]$/);
        }
      }
    });

    it('places words at their stated positions in the grid', () => {
      const result = generateWordSearch(makeConfig());
      for (const placed of result.wordLocations) {
        expect(verifyWordInGrid(result.grid, placed, result.width, result.height)).toBe(true);
      }
    });

    it('every placed word has a non-empty clue', () => {
      const result = generateWordSearch(makeConfig());
      for (const placed of result.wordLocations) {
        expect(placed.clue).toBeTruthy();
        expect(placed.clue.length).toBeGreaterThan(0);
      }
    });
  });

  describe('seed reproducibility', () => {
    it('produces identical output for the same seed', () => {
      const config = makeConfig({ seed: 123 });
      const r1 = generateWordSearch(config);
      const r2 = generateWordSearch(config);

      expect(r1.grid).toEqual(r2.grid);
      expect(r1.wordLocations.length).toBe(r2.wordLocations.length);
      for (let i = 0; i < r1.wordLocations.length; i++) {
        expect(r1.wordLocations[i].word).toBe(r2.wordLocations[i].word);
        expect(r1.wordLocations[i].x).toBe(r2.wordLocations[i].x);
        expect(r1.wordLocations[i].y).toBe(r2.wordLocations[i].y);
      }
    });

    it('produces different output for different seeds', () => {
      const r1 = generateWordSearch(makeConfig({ seed: 1 }));
      const r2 = generateWordSearch(makeConfig({ seed: 9999 }));

      const grid1 = r1.grid.map(r => r.join('')).join('');
      const grid2 = r2.grid.map(r => r.join('')).join('');
      expect(grid1).not.toBe(grid2);
    });
  });

  describe('direction settings: horizontal only', () => {
    const dirs: WordSearchDirectionSettings = {
      horizontal: true, vertical: false, diagonal: false,
      reversed: false, reversedDiagonal: false,
    };

    it('only places words horizontally (left-to-right)', () => {
      const result = generateWordSearch(makeConfig({ directions: dirs }));
      for (const placed of result.wordLocations) {
        const dir = getPlacedDirection(result.grid, placed, result.width, result.height);
        expect(dir).not.toBeNull();
        // Horizontal: dx=1, dy=0
        expect(dir![1]).toBe(0); // dy must be 0
        expect(dir![0]).toBe(1); // dx must be 1 (right)
      }
    });
  });

  describe('direction settings: vertical only', () => {
    const dirs: WordSearchDirectionSettings = {
      horizontal: false, vertical: true, diagonal: false,
      reversed: false, reversedDiagonal: false,
    };

    it('only places words vertically (top-to-bottom)', () => {
      const result = generateWordSearch(makeConfig({ directions: dirs }));
      for (const placed of result.wordLocations) {
        const dir = getPlacedDirection(result.grid, placed, result.width, result.height);
        expect(dir).not.toBeNull();
        // Vertical: dx=0, dy=1
        expect(dir![0]).toBe(0); // dx must be 0
        expect(dir![1]).toBe(1); // dy must be 1 (down)
      }
    });
  });

  describe('direction settings: diagonal only', () => {
    const dirs: WordSearchDirectionSettings = {
      horizontal: false, vertical: false, diagonal: true,
      reversed: false, reversedDiagonal: false,
    };

    it('only places words diagonally (down-right or down-left)', () => {
      const result = generateWordSearch(makeConfig({ directions: dirs, width: 10, height: 10 }));
      expect(result.wordLocations.length).toBeGreaterThan(0);
      for (const placed of result.wordLocations) {
        const dir = getPlacedDirection(result.grid, placed, result.width, result.height);
        expect(dir).not.toBeNull();
        // Diagonal down: dy must be 1, dx must be 1 or -1
        expect(dir![1]).toBe(1);
        expect(Math.abs(dir![0])).toBe(1);
      }
    });
  });

  describe('direction settings: reversed only', () => {
    const dirs: WordSearchDirectionSettings = {
      horizontal: false, vertical: false, diagonal: false,
      reversed: true, reversedDiagonal: false,
    };

    it('only places words reversed (left or up)', () => {
      const result = generateWordSearch(makeConfig({ directions: dirs }));
      expect(result.wordLocations.length).toBeGreaterThan(0);
      for (const placed of result.wordLocations) {
        const dir = getPlacedDirection(result.grid, placed, result.width, result.height);
        expect(dir).not.toBeNull();
        // Reversed: [-1,0] (left) or [0,-1] (up)
        const isLeft = dir![0] === -1 && dir![1] === 0;
        const isUp = dir![0] === 0 && dir![1] === -1;
        expect(isLeft || isUp).toBe(true);
      }
    });
  });

  describe('direction settings: reversed diagonal only', () => {
    const dirs: WordSearchDirectionSettings = {
      horizontal: false, vertical: false, diagonal: false,
      reversed: false, reversedDiagonal: true,
    };

    it('only places words in reversed diagonal (up-left or up-right)', () => {
      const result = generateWordSearch(makeConfig({ directions: dirs, width: 10, height: 10 }));
      expect(result.wordLocations.length).toBeGreaterThan(0);
      for (const placed of result.wordLocations) {
        const dir = getPlacedDirection(result.grid, placed, result.width, result.height);
        expect(dir).not.toBeNull();
        // Reversed diagonal: dy must be -1, |dx| must be 1
        expect(dir![1]).toBe(-1);
        expect(Math.abs(dir![0])).toBe(1);
      }
    });
  });

  describe('direction settings: all enabled', () => {
    const dirs: WordSearchDirectionSettings = {
      horizontal: true, vertical: true, diagonal: true,
      reversed: true, reversedDiagonal: true,
    };

    it('places words in multiple directions', () => {
      // Use many words to increase chances of direction variety
      const words = ['java', 'array', 'loop', 'class', 'method', 'string', 'object', 'type', 'code', 'test'];
      const clues = words.map(w => `Clue for ${w}`);
      const result = generateWordSearch(makeConfig({
        directions: dirs,
        words,
        clues,
        width: 10,
        height: 10,
      }));

      const directionsSeen = new Set<string>();
      for (const placed of result.wordLocations) {
        const dir = getPlacedDirection(result.grid, placed, result.width, result.height);
        if (dir) {
          directionsSeen.add(`${dir[0]},${dir[1]}`);
        }
      }

      // With all directions enabled and many words, we should see more than 2 unique directions
      expect(directionsSeen.size).toBeGreaterThan(1);
    });
  });

  describe('direction settings: none enabled (fallback)', () => {
    const dirs: WordSearchDirectionSettings = {
      horizontal: false, vertical: false, diagonal: false,
      reversed: false, reversedDiagonal: false,
    };

    it('falls back to horizontal + vertical when no directions enabled', () => {
      const result = generateWordSearch(makeConfig({ directions: dirs }));
      expect(result.wordLocations.length).toBeGreaterThan(0);

      for (const placed of result.wordLocations) {
        const dir = getPlacedDirection(result.grid, placed, result.width, result.height);
        expect(dir).not.toBeNull();
        // Should only be right [1,0] or down [0,1]
        const isRight = dir![0] === 1 && dir![1] === 0;
        const isDown = dir![0] === 0 && dir![1] === 1;
        expect(isRight || isDown).toBe(true);
      }
    });
  });

  describe('direction settings: combined horizontal + diagonal', () => {
    const dirs: WordSearchDirectionSettings = {
      horizontal: true, vertical: false, diagonal: true,
      reversed: false, reversedDiagonal: false,
    };

    it('only places words horizontally or diagonally downward', () => {
      const result = generateWordSearch(makeConfig({ directions: dirs, width: 10, height: 10 }));
      for (const placed of result.wordLocations) {
        const dir = getPlacedDirection(result.grid, placed, result.width, result.height);
        expect(dir).not.toBeNull();
        // Horizontal: [1,0] or Diagonal: [1,1] or [-1,1]
        const isHoriz = dir![0] === 1 && dir![1] === 0;
        const isDiagDR = dir![0] === 1 && dir![1] === 1;
        const isDiagDL = dir![0] === -1 && dir![1] === 1;
        expect(isHoriz || isDiagDR || isDiagDL).toBe(true);
      }
    });
  });

  describe('edge cases', () => {
    it('handles a single word', () => {
      const result = generateWordSearch(makeConfig({
        words: ['test'],
        clues: ['A trial'],
      }));
      expect(result.wordLocations.length).toBe(1);
      expect(result.wordLocations[0].word).toBe('test');
    });

    it('handles minimum grid size (2x2)', () => {
      const result = generateWordSearch(makeConfig({
        width: 2,
        height: 2,
        words: ['ab'],
        clues: ['Two letters'],
      }));
      expect(result.grid.length).toBe(2);
      expect(result.grid[0].length).toBe(2);
      expect(result.wordLocations.length).toBeGreaterThan(0);
    });

    it('skips words too long for the grid', () => {
      const result = generateWordSearch(makeConfig({
        width: 3,
        height: 3,
        words: ['abcdefgh', 'ab', 'cd'],
        clues: ['Too long', 'Short one', 'Short two'],
      }));
      // 'abcdefgh' (8 chars) cannot fit in 3x3 grid in any direction
      for (const placed of result.wordLocations) {
        expect(placed.word.length).toBeLessThanOrEqual(3);
      }
    });

    it('handles diagonal words on small grid', () => {
      const dirs: WordSearchDirectionSettings = {
        horizontal: false, vertical: false, diagonal: true,
        reversed: false, reversedDiagonal: false,
      };
      const result = generateWordSearch(makeConfig({
        width: 5,
        height: 5,
        words: ['abc', 'de'],
        clues: ['First', 'Second'],
        directions: dirs,
      }));
      // Should still place words diagonally even on small grid
      expect(result.wordLocations.length).toBeGreaterThan(0);
    });

    it('supports overlapping words sharing letters', () => {
      // Two words sharing the letter 'a' — should be able to overlap
      const dirs: WordSearchDirectionSettings = {
        horizontal: true, vertical: true, diagonal: false,
        reversed: false, reversedDiagonal: false,
      };
      const result = generateWordSearch(makeConfig({
        width: 5,
        height: 5,
        words: ['abc', 'axe'],
        clues: ['First', 'Second'],
        directions: dirs,
        seed: 42,
      }));
      expect(result.wordLocations.length).toBe(2);
    });

    it('handles large grid (10x10) with many words', () => {
      const words = ['java', 'array', 'loop', 'class', 'method', 'string', 'object', 'type', 'code', 'test', 'bug', 'run'];
      const clues = words.map(w => `Clue for ${w}`);
      const result = generateWordSearch(makeConfig({ width: 10, height: 10, words, clues }));
      expect(result.wordLocations.length).toBeGreaterThan(5);
    });
  });

  describe('default direction settings export', () => {
    it('has horizontal and vertical enabled by default', () => {
      expect(DEFAULT_WORD_SEARCH_DIRECTIONS.horizontal).toBe(true);
      expect(DEFAULT_WORD_SEARCH_DIRECTIONS.vertical).toBe(true);
    });

    it('has diagonal, reversed, reversedDiagonal disabled by default', () => {
      expect(DEFAULT_WORD_SEARCH_DIRECTIONS.diagonal).toBe(false);
      expect(DEFAULT_WORD_SEARCH_DIRECTIONS.reversed).toBe(false);
      expect(DEFAULT_WORD_SEARCH_DIRECTIONS.reversedDiagonal).toBe(false);
    });
  });

  describe('integration with createPuzzle', () => {
    it('createWordSearchFromEntries passes direction settings', () => {
      const dirs: WordSearchDirectionSettings = {
        horizontal: true, vertical: false, diagonal: false,
        reversed: false, reversedDiagonal: false,
      };
      const result = createWordSearchFromEntries({
        entries: [
          { word: 'react', clue: 'A UI library' },
          { word: 'vite', clue: 'A build tool' },
          { word: 'node', clue: 'A runtime' },
        ],
        width: 10,
        height: 10,
        seed: 42,
        wordSearchDirections: dirs,
      });
      expect(result.wordLocations.length).toBeGreaterThan(0);
      // All words should be horizontal
      for (const placed of result.wordLocations) {
        const dir = getPlacedDirection(result.grid, placed, result.width, result.height);
        expect(dir).not.toBeNull();
        expect(dir![0]).toBe(1);
        expect(dir![1]).toBe(0);
      }
    });

    it('supports vertical-only settings with entry lists', () => {
      const dirs: WordSearchDirectionSettings = {
        horizontal: false, vertical: true, diagonal: false,
        reversed: false, reversedDiagonal: false,
      };
      const result = createWordSearchFromEntries({
        entries: [
          { word: 'test', clue: 'A test' },
          { word: 'code', clue: 'Write code' },
        ],
        width: 8,
        height: 8,
        seed: 77,
        wordSearchDirections: dirs,
      });
      expect(result.wordLocations.length).toBeGreaterThan(0);
      // All words should be vertical
      for (const placed of result.wordLocations) {
        const dir = getPlacedDirection(result.grid, placed, result.width, result.height);
        expect(dir).not.toBeNull();
        expect(dir![0]).toBe(0);
        expect(dir![1]).toBe(1);
      }
    });

    it('works without direction settings (uses defaults)', () => {
      const result = createWordSearchFromEntries({
        entries: [
          { word: 'array', clue: 'A collection' },
          { word: 'loop', clue: 'Repeating block' },
        ],
        width: 8,
        height: 8,
        seed: 42,
      });
      expect(result.wordLocations.length).toBeGreaterThan(0);
    });
  });
});
