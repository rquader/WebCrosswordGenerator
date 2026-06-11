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
import { getFullBlocklist, MIN_BLOCKED_LENGTH } from '../data/blocklist';

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

/**
 * The unit vector a placed word runs along.
 *
 * Word-search words carry the exact dx/dy (any of 8 directions). Older
 * results and crossword words only have the isHorizontal/isReversed flags,
 * which can express the 4 straight directions — derive from those.
 */
export function getWordVector(wl: DirectionalWord): { dx: number; dy: number } {
  if (wl.dx !== undefined && wl.dy !== undefined) {
    return { dx: wl.dx, dy: wl.dy };
  }
  const sign = wl.isReversed ? -1 : 1;
  return wl.isHorizontal ? { dx: sign, dy: 0 } : { dx: 0, dy: sign };
}

/** Grid coordinates of every cell a placed word covers, in word order. */
export function getWordCellCoords(wl: DirectionalWord): { x: number; y: number }[] {
  const { dx, dy } = getWordVector(wl);
  const cells: { x: number; y: number }[] = [];
  for (let i = 0; i < wl.word.length; i++) {
    cells.push({ x: wl.x + i * dx, y: wl.y + i * dy });
  }
  return cells;
}

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

/** How many layout attempts to make before keeping the one placing the most words. */
const WORD_SEARCH_ATTEMPTS = 5;

/**
 * Generate a word search puzzle.
 * Returns the same CrosswordResult type for compatibility with the grid display.
 *
 * Tries several layouts (derived deterministically from the seed) and keeps
 * the one that places the most words. Words that still don't fit are listed
 * in `skippedWords` so the UI can tell the user instead of dropping them
 * silently.
 */
export function generateWordSearch(config: WordSearchConfig): CrosswordResult {
  let best: CrosswordResult | null = null;

  for (let i = 0; i < WORD_SEARCH_ATTEMPTS; i++) {
    const attemptSeed = i === 0 ? config.seed : config.seed + i * 7919;
    const attempt = generateWordSearchOnce(config, attemptSeed);

    if (best === null || attempt.wordLocations.length > best.wordLocations.length) {
      best = attempt;
    }
    if (best.skippedWords === undefined) {
      break; // Everything placed — no better outcome possible
    }
  }

  return best!;
}

/** Single word-search layout attempt with a specific seed. */
function generateWordSearchOnce(config: WordSearchConfig, seed: number): CrosswordResult {
  const { width, height, words, clues } = config;
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
  const skipped: string[] = [];

  // Try to place each word
  for (const pair of pairs) {
    const placed = tryPlaceWord(grid, pair.word, pair.clue, width, height, random, wordLocations, directions);
    if (!placed) {
      skipped.push(pair.word);
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

  // Random fill can spell profanity across any of the 8 directions —
  // scrub it before the grid leaves the generator.
  sanitizeFillerLetters(grid, width, height, wordLocations, random);

  return {
    grid,
    wordLocations,
    width,
    height,
    ...(skipped.length > 0 ? { skippedWords: skipped } : {}),
  };
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

    // Legacy flags kept for crossword-shaped consumers; the dx/dy vector is
    // the authoritative direction (flags can't distinguish the 4 diagonals).
    const isHorizontal = dy === 0;
    const isReversed = dx < 0 || (dx === 0 && dy < 0);

    wordLocations.push({
      word,
      isHorizontal,
      isReversed,
      clue,
      x: startX,
      y: startY,
      dx,
      dy,
    });

    return true;
  }

  return false;
}

/* ── Filler profanity filter ──────────────────────────────────────────────
 *
 * Scans the finished grid in all 8 directions (4 line orientations, each
 * read forward and backward) for blocklisted strings and re-randomizes the
 * FILLER cells of any match. Cells belonging to placed words are never
 * altered — if a match is spelled entirely by real words, it is the user's
 * own content and is left alone. Runs silently; teachers never see it.
 */

/** Re-randomize attempts per offending region before giving up on it. */
const MAX_REGION_FIX_ATTEMPTS = 50;

/** Absolute ceiling of fix iterations per grid — the loop can never hang. */
const MAX_SANITIZE_PASSES = 400;

/**
 * Blocklist entries the scanner acts on (floor applied), cached. Every
 * language's list is active in every puzzle — see src/data/blocklist.ts
 * for why the filter is language-independent.
 */
let activeBlocklist: string[] | null = null;
function getActiveBlocklist(): string[] {
  if (activeBlocklist === null) {
    activeBlocklist = getFullBlocklist().filter(w => w.length >= MIN_BLOCKED_LENGTH);
  }
  return activeBlocklist;
}

interface GridCell {
  x: number;
  y: number;
}

interface BlockedMatch {
  /** Cells covered by the matched string, in line order. */
  cells: GridCell[];
  /** Stable identity of the offending region (start cell – end cell). */
  key: string;
}

/**
 * Every scan line of the grid: rows, columns, and both diagonal
 * orientations. Reading each line's text forward and backward covers
 * all 8 word-search directions. Lines shorter than the match floor
 * are skipped.
 */
function collectScanLines(width: number, height: number): GridCell[][] {
  const lines: GridCell[][] = [];

  const addLine = (startX: number, startY: number, dx: number, dy: number) => {
    const line: GridCell[] = [];
    for (let x = startX, y = startY; x >= 0 && x < width && y >= 0 && y < height; x += dx, y += dy) {
      line.push({ x, y });
    }
    if (line.length >= MIN_BLOCKED_LENGTH) {
      lines.push(line);
    }
  };

  for (let y = 0; y < height; y++) addLine(0, y, 1, 0);            // rows
  for (let x = 0; x < width; x++) addLine(x, 0, 0, 1);             // columns
  for (let y = 0; y < height; y++) addLine(0, y, 1, 1);            // ↘ from left edge
  for (let x = 1; x < width; x++) addLine(x, 0, 1, 1);             // ↘ from top edge
  for (let y = 0; y < height; y++) addLine(width - 1, y, -1, 1);   // ↙ from right edge
  for (let x = 0; x < width - 1; x++) addLine(x, 0, -1, 1);        // ↙ from top edge

  return lines;
}

function matchKey(cells: GridCell[]): string {
  const first = cells[0];
  const last = cells[cells.length - 1];
  return `${first.x},${first.y}-${last.x},${last.y}`;
}

/**
 * First blocklisted string in the grid that isn't already given up on.
 * Deterministic scan order keeps same-seed grids reproducible.
 */
function findBlockedMatch(
  grid: string[][],
  lines: GridCell[][],
  blocklist: string[],
  ignored: Set<string>
): BlockedMatch | null {
  for (const line of lines) {
    const text = line.map(cell => grid[cell.y][cell.x]).join('');

    for (const bad of blocklist) {
      if (bad.length > text.length) continue;
      const reversed = bad.split('').reverse().join('');
      const needles = bad === reversed ? [bad] : [bad, reversed];

      for (const needle of needles) {
        for (let idx = text.indexOf(needle); idx !== -1; idx = text.indexOf(needle, idx + 1)) {
          const cells = line.slice(idx, idx + needle.length);
          const key = matchKey(cells);
          if (!ignored.has(key)) {
            return { cells, key };
          }
        }
      }
    }
  }
  return null;
}

/**
 * Scrub blocklisted strings from the finished grid by re-randomizing the
 * filler cells they run through, rescanning after every fix. Exported for
 * tests; production callers go through generateWordSearch.
 */
export function sanitizeFillerLetters(
  grid: string[][],
  width: number,
  height: number,
  wordLocations: DirectionalWord[],
  random: SeededRandom
): void {
  const blocklist = getActiveBlocklist();
  if (blocklist.length === 0) return;

  const locked = new Set<string>();
  for (const wl of wordLocations) {
    for (const { x, y } of getWordCellCoords(wl)) {
      locked.add(`${x},${y}`);
    }
  }

  const lines = collectScanLines(width, height);
  const ignored = new Set<string>();
  const fixAttempts = new Map<string, number>();

  for (let pass = 0; pass < MAX_SANITIZE_PASSES; pass++) {
    const match = findBlockedMatch(grid, lines, blocklist, ignored);
    if (match === null) {
      return; // clean (modulo regions deliberately left alone)
    }

    const fillerCells = match.cells.filter(cell => !locked.has(`${cell.x},${cell.y}`));
    if (fillerCells.length === 0) {
      // Spelled entirely by placed words ("anal" inside CANAL) — the
      // user's own content, never altered. Skip without noise.
      ignored.add(match.key);
      continue;
    }

    const attempts = (fixAttempts.get(match.key) ?? 0) + 1;
    fixAttempts.set(match.key, attempts);
    if (attempts > MAX_REGION_FIX_ATTEMPTS) {
      console.warn(`word search filler filter: region ${match.key} still matches after ${MAX_REGION_FIX_ATTEMPTS} fixes — leaving it`);
      ignored.add(match.key);
      continue;
    }

    for (const { x, y } of fillerCells) {
      grid[y][x] = ALPHABET[random.nextInt(ALPHABET.length)];
    }
  }

  console.warn('word search filler filter: pass ceiling reached — a blocked string may remain');
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
