/**
 * Tests for the engine quality improvements:
 *  - puzzle scoring (puzzleScore.ts)
 *  - multi-candidate selection fixing the must-include placement bug
 *  - centered first-word placement
 *  - grid size suggestions on placement failures
 *  - word search skipped-word reporting
 *  - reversed words off by default for crosswords
 */

import { describe, it, expect } from 'vitest';
import { scoreCrossword } from '@logic/puzzleScore';
import { generateCrosswordWithPriority } from '@logic/priorityGenerator';
import { generateSkeleton } from '@logic/skeletonGenerator';
import { generateWordSearch } from '@logic/wordSearchGenerator';
import { createPuzzleFromEntries } from '@logic/createPuzzle';
import type { CrosswordResult, DirectionalWord } from '@logic/types';

// Helper: build a CrosswordResult by hand from word placements.
function makeResult(width: number, height: number, locations: DirectionalWord[]): CrosswordResult {
  const grid: string[][] = Array.from({ length: height }, () => Array(width).fill('-'));
  for (const loc of locations) {
    for (let i = 0; i < loc.word.length; i++) {
      const x = loc.isHorizontal ? loc.x + i : loc.x;
      const y = loc.isHorizontal ? loc.y : loc.y + i;
      grid[y][x] = loc.word[i];
    }
  }
  return { grid, wordLocations: locations, width, height };
}

function word(w: string, x: number, y: number, horizontal: boolean): DirectionalWord {
  return { word: w, isHorizontal: horizontal, isReversed: false, clue: '', x, y };
}

describe('puzzle scoring', () => {
  it('scores an empty puzzle as zero', () => {
    const score = scoreCrossword(makeResult(8, 8, []));
    expect(score.total).toBe(0);
    expect(score.wordCount).toBe(0);
  });

  it('prefers centered layouts over corner-crammed ones', () => {
    const centered = scoreCrossword(makeResult(9, 9, [word('cat', 3, 4, true)]));
    const cornered = scoreCrossword(makeResult(9, 9, [word('cat', 0, 0, true)]));
    expect(centered.centering).toBeGreaterThan(cornered.centering);
    expect(centered.total).toBeGreaterThan(cornered.total);
  });

  it('detects intersections between crossing words', () => {
    // "cat" across at (0,0) and "car" down at (0,0) share the 'c' cell
    const crossing = scoreCrossword(makeResult(5, 5, [
      word('cat', 0, 0, true),
      word('car', 0, 0, false),
    ]));
    expect(crossing.intersectionRatio).toBeGreaterThan(0);
    expect(crossing.directionBalance).toBe(1);
  });

  it('always ranks a layout with more words higher', () => {
    const oneWord = scoreCrossword(makeResult(8, 8, [word('cat', 2, 3, true)]));
    const twoWords = scoreCrossword(makeResult(8, 8, [
      word('cat', 0, 0, true),
      word('car', 0, 0, false),
    ]));
    expect(twoWords.total).toBeGreaterThan(oneWord.total);
  });
});

describe('must-include placement bug regression', () => {
  it('places both LOVE and ORANGE on 8x8 seed 470 with reversed words off', () => {
    // The documented bug: ORANGE at row 0 left no room above it, so LOVE
    // could never intersect. Centered first-word placement plus candidate
    // selection fixes it.
    const result = generateCrosswordWithPriority({
      width: 8,
      height: 8,
      seed: 470,
      mustIncludeWords: ['love', 'orange'],
      mustIncludeClues: ['Affection', 'Citrus fruit'],
      canIncludeWords: [],
      canIncludeClues: [],
      allowReverseWords: false,
    });

    expect(result.failedMust).toEqual([]);
    expect(result.placedMust.length).toBe(2);
  });

  it('keeps results reproducible with multi-candidate selection', () => {
    const config = {
      width: 10,
      height: 10,
      seed: 1234,
      mustIncludeWords: ['plant', 'leaf', 'stem', 'root'],
      mustIncludeClues: ['a', 'b', 'c', 'd'],
      canIncludeWords: ['seed', 'soil'],
      canIncludeClues: ['e', 'f'],
      allowReverseWords: false,
    };
    const result1 = generateCrosswordWithPriority(config);
    const result2 = generateCrosswordWithPriority(config);
    expect(result1.crossword.grid).toEqual(result2.crossword.grid);
  });

  it('drops can-include duplicates of must-include words', () => {
    const result = generateCrosswordWithPriority({
      width: 8,
      height: 8,
      seed: 99,
      mustIncludeWords: ['plant'],
      mustIncludeClues: ['Green organism'],
      canIncludeWords: ['plant', 'leaf'],
      canIncludeClues: ['Duplicate', 'Foliage'],
      allowReverseWords: false,
    });

    const placements = result.crossword.wordLocations.filter(l => l.word === 'plant');
    expect(placements.length).toBe(1);
  });
});

describe('grid size suggestion on failures', () => {
  it('suggests a larger grid when a must-include word is too long', () => {
    const result = generateSkeleton({
      width: 4,
      height: 4,
      seed: 42,
      entries: [
        { word: 'stream', clue: 'Flow of water', priority: 'must' },
        { word: 'sun', clue: 'The nearest star', priority: 'must' },
      ],
    });

    expect(result.failures.length).toBeGreaterThan(0);
    expect(result.suggestion).toBeDefined();
    // The suggested size must actually fit the longest word
    expect(Math.max(result.suggestion!.width, result.suggestion!.height)).toBeGreaterThanOrEqual(6);
  });

  it('omits the suggestion when every must-include word placed', () => {
    const result = generateSkeleton({
      width: 10,
      height: 10,
      seed: 42,
      entries: [
        { word: 'plant', clue: 'a', priority: 'must' },
        { word: 'leaf', clue: 'b', priority: 'must' },
      ],
    });

    expect(result.failures).toEqual([]);
    expect(result.suggestion).toBeUndefined();
  });
});

describe('word search skipped-word reporting', () => {
  it('lists words that cannot fit in the grid', () => {
    const result = generateWordSearch({
      width: 3,
      height: 3,
      seed: 7,
      words: ['cat', 'elephant'],
      clues: ['Pet', 'Big animal'],
    });

    expect(result.skippedWords).toEqual(['elephant']);
    expect(result.wordLocations.map(l => l.word)).toEqual(['cat']);
  });

  it('omits skippedWords when everything places', () => {
    const result = generateWordSearch({
      width: 8,
      height: 8,
      seed: 7,
      words: ['cat', 'dog'],
      clues: ['Pet', 'Other pet'],
    });

    expect(result.skippedWords).toBeUndefined();
  });
});

describe('reversed words default', () => {
  it('never reverses crossword words unless explicitly enabled', () => {
    const result = createPuzzleFromEntries({
      entries: [
        { word: 'plant', clue: 'a' },
        { word: 'leaf', clue: 'b' },
        { word: 'stem', clue: 'c' },
        { word: 'petal', clue: 'd' },
        { word: 'root', clue: 'e' },
      ],
      width: 8,
      height: 8,
      seed: 2752,
    });

    expect(result.wordLocations.every(l => !l.isReversed)).toBe(true);
  });
});
