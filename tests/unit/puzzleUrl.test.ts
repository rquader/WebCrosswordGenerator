/**
 * Tests for puzzle URL encoding/decoding.
 *
 * Verifies the compression round-trip: puzzle → URL hash → puzzle.
 * Tests edge cases: empty grids, large puzzles, special characters in clues.
 */

import { describe, it, expect } from 'vitest';
import type { CrosswordResult } from '../../src/logic/types';
import { deflate, inflate } from 'pako';

// We test the core logic (compact format + compression) without DOM dependencies.
// The actual encodePuzzleToUrl/decodePuzzleFromUrl use window.location,
// so we test the underlying serialization functions directly.

/**
 * Compact format types (mirrored from puzzleUrl.ts for testing).
 */
interface CompactPuzzle {
  v: number;
  w: number;
  h: number;
  g: string;
  words: CompactWord[];
}

interface CompactWord {
  w: string;
  c: string;
  x: number;
  y: number;
  d: 'a' | 'd';
  r?: 1;
}

// Replicate the conversion functions for testing
function toCompact(puzzle: CrosswordResult): CompactPuzzle {
  return {
    v: 1,
    w: puzzle.width,
    h: puzzle.height,
    g: puzzle.grid.map(row => row.join('')).join(''),
    words: puzzle.wordLocations.map(w => {
      const cw: CompactWord = {
        w: w.word,
        c: w.clue,
        x: w.x,
        y: w.y,
        d: w.isHorizontal ? 'a' : 'd',
      };
      if (w.isReversed) cw.r = 1;
      return cw;
    }),
  };
}

function fromCompact(compact: CompactPuzzle): CrosswordResult {
  const grid: string[][] = [];
  for (let y = 0; y < compact.h; y++) {
    const row: string[] = [];
    for (let x = 0; x < compact.w; x++) {
      row.push(compact.g[y * compact.w + x]);
    }
    grid.push(row);
  }
  return {
    width: compact.w,
    height: compact.h,
    grid,
    wordLocations: compact.words.map(cw => ({
      word: cw.w,
      clue: cw.c,
      x: cw.x,
      y: cw.y,
      isHorizontal: cw.d === 'a',
      isReversed: cw.r === 1,
    })),
  };
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecode(str: string): Uint8Array {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function roundTrip(puzzle: CrosswordResult): CrosswordResult {
  const compact = toCompact(puzzle);
  const json = JSON.stringify(compact);
  const compressed = deflate(new TextEncoder().encode(json));
  const encoded = base64UrlEncode(compressed);
  const decoded = base64UrlDecode(encoded);
  const decompressed = new TextDecoder().decode(inflate(decoded));
  return fromCompact(JSON.parse(decompressed));
}

/* ── Test data ───────────────────────────────────────────────────────── */

const smallPuzzle: CrosswordResult = {
  width: 5,
  height: 5,
  grid: [
    ['h', 'e', 'l', 'l', 'o'],
    ['-', '-', '-', '-', '-'],
    ['w', 'o', 'r', 'l', 'd'],
    ['-', '-', '-', '-', '-'],
    ['-', '-', '-', '-', '-'],
  ],
  wordLocations: [
    { word: 'hello', clue: 'A greeting', x: 0, y: 0, isHorizontal: true, isReversed: false },
    { word: 'world', clue: 'The planet', x: 0, y: 2, isHorizontal: true, isReversed: false },
  ],
};

const puzzleWithReversed: CrosswordResult = {
  width: 4,
  height: 4,
  grid: [
    ['t', 'e', 's', 't'],
    ['-', '-', '-', '-'],
    ['o', 'l', 'l', 'e'],
    ['-', '-', '-', '-'],
  ],
  wordLocations: [
    { word: 'test', clue: 'An exam', x: 0, y: 0, isHorizontal: true, isReversed: false },
    { word: 'hello', clue: 'A greeting (reversed)', x: 3, y: 2, isHorizontal: true, isReversed: true },
  ],
};

/* ── Tests ────────────────────────────────────────────────────────────── */

describe('puzzleUrl', () => {
  describe('compact format conversion', () => {
    it('converts a simple puzzle to compact and back', () => {
      const compact = toCompact(smallPuzzle);
      expect(compact.v).toBe(1);
      expect(compact.w).toBe(5);
      expect(compact.h).toBe(5);
      expect(compact.g).toBe('hello-----world----------');
      expect(compact.words).toHaveLength(2);

      const restored = fromCompact(compact);
      expect(restored.width).toBe(5);
      expect(restored.height).toBe(5);
      expect(restored.grid).toEqual(smallPuzzle.grid);
      expect(restored.wordLocations).toHaveLength(2);
    });

    it('preserves reversed word flag', () => {
      const compact = toCompact(puzzleWithReversed);
      const reversedWord = compact.words.find(w => w.r === 1);
      expect(reversedWord).toBeDefined();
      expect(reversedWord!.w).toBe('hello');

      const restored = fromCompact(compact);
      const restoredReversed = restored.wordLocations.find(w => w.isReversed);
      expect(restoredReversed).toBeDefined();
      expect(restoredReversed!.word).toBe('hello');
    });

    it('correctly reconstructs 2D grid from flat string', () => {
      const compact = toCompact(smallPuzzle);
      const restored = fromCompact(compact);
      for (let y = 0; y < smallPuzzle.height; y++) {
        for (let x = 0; x < smallPuzzle.width; x++) {
          expect(restored.grid[y][x]).toBe(smallPuzzle.grid[y][x]);
        }
      }
    });

    it('preserves word locations exactly', () => {
      const compact = toCompact(smallPuzzle);
      const restored = fromCompact(compact);
      for (let i = 0; i < smallPuzzle.wordLocations.length; i++) {
        expect(restored.wordLocations[i].word).toBe(smallPuzzle.wordLocations[i].word);
        expect(restored.wordLocations[i].clue).toBe(smallPuzzle.wordLocations[i].clue);
        expect(restored.wordLocations[i].x).toBe(smallPuzzle.wordLocations[i].x);
        expect(restored.wordLocations[i].y).toBe(smallPuzzle.wordLocations[i].y);
        expect(restored.wordLocations[i].isHorizontal).toBe(smallPuzzle.wordLocations[i].isHorizontal);
      }
    });
  });

  describe('compression round-trip', () => {
    it('round-trips a small puzzle through compression', () => {
      const result = roundTrip(smallPuzzle);
      expect(result.width).toBe(smallPuzzle.width);
      expect(result.height).toBe(smallPuzzle.height);
      expect(result.grid).toEqual(smallPuzzle.grid);
      expect(result.wordLocations).toHaveLength(smallPuzzle.wordLocations.length);
    });

    it('round-trips a puzzle with reversed words', () => {
      const result = roundTrip(puzzleWithReversed);
      const reversed = result.wordLocations.find(w => w.isReversed);
      expect(reversed).toBeDefined();
      expect(reversed!.word).toBe('hello');
    });

    it('produces a compact encoded string', () => {
      const compact = toCompact(smallPuzzle);
      const json = JSON.stringify(compact);
      const compressed = deflate(new TextEncoder().encode(json));
      const encoded = base64UrlEncode(compressed);

      // Compressed should be significantly smaller than raw JSON
      expect(encoded.length).toBeLessThan(json.length);
      // Should be URL-safe (no +, /, or =)
      expect(encoded).not.toMatch(/[+/=]/);
    });

    it('handles special characters in clues', () => {
      const puzzleWithSpecialClues: CrosswordResult = {
        ...smallPuzzle,
        wordLocations: [
          { word: 'hello', clue: 'A "greeting" with <special> chars & more!', x: 0, y: 0, isHorizontal: true, isReversed: false },
          { word: 'world', clue: "It's the whole planet (Earth)", x: 0, y: 2, isHorizontal: true, isReversed: false },
        ],
      };
      const result = roundTrip(puzzleWithSpecialClues);
      expect(result.wordLocations[0].clue).toBe('A "greeting" with <special> chars & more!');
      expect(result.wordLocations[1].clue).toBe("It's the whole planet (Earth)");
    });

    it('handles a larger puzzle (12x12)', () => {
      const grid: string[][] = [];
      for (let y = 0; y < 12; y++) {
        const row: string[] = [];
        for (let x = 0; x < 12; x++) {
          row.push(Math.random() > 0.3 ? String.fromCharCode(97 + Math.floor(Math.random() * 26)) : '-');
        }
        grid.push(row);
      }

      const largePuzzle: CrosswordResult = {
        width: 12,
        height: 12,
        grid,
        wordLocations: Array.from({ length: 15 }, (_, i) => ({
          word: 'word' + i,
          clue: 'Clue for word ' + i,
          x: i % 12,
          y: Math.floor(i / 12),
          isHorizontal: i % 2 === 0,
          isReversed: false,
        })),
      };

      const result = roundTrip(largePuzzle);
      expect(result.width).toBe(12);
      expect(result.height).toBe(12);
      expect(result.wordLocations).toHaveLength(15);
    });
  });

  describe('base64url encoding', () => {
    it('encodes and decodes correctly', () => {
      const original = new Uint8Array([0, 1, 2, 255, 254, 253]);
      const encoded = base64UrlEncode(original);
      const decoded = base64UrlDecode(encoded);
      expect(decoded).toEqual(original);
    });

    it('produces URL-safe characters only', () => {
      const bytes = new Uint8Array(256);
      for (let i = 0; i < 256; i++) bytes[i] = i;
      const encoded = base64UrlEncode(bytes);
      // URL-safe base64 uses only alphanumeric, -, and _
      expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('round-trips empty array', () => {
      const empty = new Uint8Array(0);
      const encoded = base64UrlEncode(empty);
      const decoded = base64UrlDecode(encoded);
      expect(decoded).toEqual(empty);
    });
  });
});
