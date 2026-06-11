/**
 * Tests for the word search filler profanity filter.
 *
 * The filter's contract: a finished word search grid contains no
 * blocklisted string (>= MIN_BLOCKED_LENGTH) in any of the 8 directions,
 * unless the string is spelled by the user's own placed words — those are
 * never altered. The mildest blocklist entry ("damn") is used wherever a
 * test needs to plant an offending string.
 */

import { describe, it, expect } from 'vitest';
import { generateWordSearch, sanitizeFillerLetters } from '@logic/wordSearchGenerator';
import { SeededRandom } from '@logic/seedRandom';
import { BLOCKLIST, BLOCKLISTS, MIN_BLOCKED_LENGTH, getFullBlocklist } from '../../src/data/blocklist';
import type { WordSearchDirectionSettings } from '@logic/types';

/* ── Helpers ──────────────────────────────────────────────────────────── */

/** Every line text of the grid, read in all 8 directions. */
function allLineTexts(grid: string[][]): string[] {
  const h = grid.length;
  const w = grid[0].length;
  const lines: string[] = [];

  const walk = (sx: number, sy: number, dx: number, dy: number): string => {
    let s = '';
    for (let x = sx, y = sy; x >= 0 && x < w && y >= 0 && y < h; x += dx, y += dy) {
      s += grid[y][x];
    }
    return s;
  };

  for (let y = 0; y < h; y++) lines.push(walk(0, y, 1, 0));
  for (let x = 0; x < w; x++) lines.push(walk(x, 0, 0, 1));
  for (let y = 0; y < h; y++) lines.push(walk(0, y, 1, 1));
  for (let x = 1; x < w; x++) lines.push(walk(x, 0, 1, 1));
  for (let y = 0; y < h; y++) lines.push(walk(w - 1, y, -1, 1));
  for (let x = 0; x < w - 1; x++) lines.push(walk(x, 0, -1, 1));

  return [...lines, ...lines.map(s => s.split('').reverse().join(''))];
}

/** First blocklisted string found in the grid, or null when clean. */
function findBlockedInGrid(grid: string[][]): string | null {
  const active = BLOCKLIST.filter(wd => wd.length >= MIN_BLOCKED_LENGTH);
  for (const text of allLineTexts(grid)) {
    for (const bad of active) {
      if (text.includes(bad)) return bad;
    }
  }
  return null;
}

function makeGrid(rows: string[]): string[][] {
  return rows.map(r => r.split(''));
}

const ALL_DIRECTIONS: WordSearchDirectionSettings = {
  horizontal: true, vertical: true, diagonal: true,
  reversed: true, reversedDiagonal: true,
};

/* ── Blocklist data shape ─────────────────────────────────────────────── */

describe('blocklist data', () => {
  it('is non-empty, lowercase a-z only, and deduped', () => {
    expect(BLOCKLIST.length).toBeGreaterThan(50);
    for (const word of BLOCKLIST) {
      expect(word).toMatch(/^[a-z]+$/);
    }
    expect(new Set(BLOCKLIST).size).toBe(BLOCKLIST.length);
  });

  it('uses a match floor of at least 4 (shorter strings fight pure chance)', () => {
    expect(MIN_BLOCKED_LENGTH).toBeGreaterThanOrEqual(4);
  });
});

/* ── Sanitizer unit behavior ──────────────────────────────────────────── */

describe('sanitizeFillerLetters', () => {
  it('scrubs a planted horizontal match', () => {
    const grid = makeGrid([
      'damnq',
      'qqqqq',
      'qqqqq',
      'qqqqq',
      'qqqqq',
    ]);
    sanitizeFillerLetters(grid, 5, 5, [], new SeededRandom(1));
    expect(findBlockedInGrid(grid)).toBeNull();
  });

  it('scrubs planted vertical, diagonal, and reversed matches', () => {
    // Column 0 spells damn downward; the ↘ diagonal from (1,1) spells damn;
    // row 4 spells nmad = damn read right-to-left.
    const grid = makeGrid([
      'dqqqqq',
      'adqqqq',
      'mqaqqq',
      'nqqmqq',
      'nmadqn',
      'qqqqqq',
    ]);
    sanitizeFillerLetters(grid, 6, 6, [], new SeededRandom(7));
    expect(findBlockedInGrid(grid)).toBeNull();
  });

  it('never alters cells of placed words, even when they spell a blocked string', () => {
    // The teacher really did place the word "damn" — their content, not ours.
    const grid = makeGrid([
      'damnq',
      'qqqqq',
      'qqqqq',
      'qqqqq',
      'qqqqq',
    ]);
    const placed = [{
      word: 'damn', isHorizontal: true, isReversed: false,
      clue: '', x: 0, y: 0, dx: 1, dy: 0,
    }];
    sanitizeFillerLetters(grid, 5, 5, placed, new SeededRandom(1));
    expect(grid[0].join('')).toContain('damn');
  });

  it('fixes a match that only partially overlaps a placed word', () => {
    // Placed word "dam" at (0,0); a filler n right after completes "damn".
    // Only the filler cell may change.
    const grid = makeGrid([
      'damnq',
      'qqqqq',
      'qqqqq',
      'qqqqq',
      'qqqqq',
    ]);
    const placed = [{
      word: 'dam', isHorizontal: true, isReversed: false,
      clue: '', x: 0, y: 0, dx: 1, dy: 0,
    }];
    sanitizeFillerLetters(grid, 5, 5, placed, new SeededRandom(1));
    expect(grid[0].slice(0, 3).join('')).toBe('dam'); // placed word intact
    expect(findBlockedInGrid(grid)).toBeNull();
  });

  it('is deterministic for the same seed', () => {
    const build = () => makeGrid([
      'damnq',
      'qqqqq',
      'qdamn',
      'qqqqq',
      'qqqqq',
    ]);
    const a = build();
    const b = build();
    sanitizeFillerLetters(a, 5, 5, [], new SeededRandom(42));
    sanitizeFillerLetters(b, 5, 5, [], new SeededRandom(42));
    expect(a).toEqual(b);
  });
});

/* ── End-to-end guarantee through the generator ───────────────────────── */

describe('generated word searches are clean', () => {
  it('no blocklisted string survives in any direction across many seeds', () => {
    // Placed words must not themselves contain a blocklisted substring here:
    // the filter never alters real words ("meth" inside METHOD stays), so a
    // word like that would trip the grid-wide scan below by design.
    const words = ['java', 'array', 'loop', 'class', 'render', 'string', 'object'];
    const clues = words.map(w => `Clue for ${w}`);

    for (let seed = 1; seed <= 30; seed++) {
      const result = generateWordSearch({
        width: 12, height: 12, seed, words, clues,
        directions: ALL_DIRECTIONS,
      });
      const offender = findBlockedInGrid(result.grid);
      expect(offender, `seed ${seed} produced "${offender}"`).toBeNull();
    }
  });

  it('stays reproducible with the filter active', () => {
    const config = {
      width: 10, height: 10, seed: 99,
      words: ['test', 'code'], clues: ['a', 'b'],
      directions: ALL_DIRECTIONS,
    };
    const r1 = generateWordSearch(config);
    const r2 = generateWordSearch(config);
    expect(r1.grid).toEqual(r2.grid);
  });
});

describe('per-language blocklists', () => {
  it('scrub list combines every language, regardless of puzzle language', () => {
    const full = getFullBlocklist();
    expect(full).toContain('fuck');     // English
    expect(full).toContain('mierda');   // Spanish
    expect(full).toContain('merde');    // French
    expect(full).toContain('fotze');    // German
    expect(full).toContain('cazz');     // Italian
    expect(full).toContain('porra');    // Portuguese
    expect(full.length).toBeGreaterThan(300);
  });

  it('deduplicates entries shared between lists', () => {
    // 'merda' appears in both the Italian and Portuguese lists.
    const full = getFullBlocklist();
    expect(full.filter(w => w === 'merda')).toHaveLength(1);
  });

  it('every language list survives the scanner floor', () => {
    for (const lang of ['english', 'spanish', 'french', 'german', 'italian', 'portuguese'] as const) {
      const usable = BLOCKLISTS[lang].filter(w => w.length >= MIN_BLOCKED_LENGTH);
      expect(usable.length).toBeGreaterThan(25);
    }
  });
});
