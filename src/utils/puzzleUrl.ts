/**
 * URL-based puzzle sharing.
 *
 * Compresses a CrosswordResult into a URL hash that can be shared.
 * Recipients open the link and the puzzle loads instantly in solve mode.
 *
 * How it works:
 * 1. Serialize puzzle to a compact JSON format
 * 2. Deflate with pako (zlib compression)
 * 3. Base64url-encode the compressed bytes
 * 4. Append to current URL as #puzzle=<encoded>
 *
 * On the receiving end:
 * 1. Detect #puzzle= in the URL hash
 * 2. Base64url-decode → inflate → parse JSON
 * 3. Reconstruct CrosswordResult
 *
 * Privacy: The hash fragment is never sent to a server.
 * A typical 12x12 puzzle compresses to ~500-800 bytes.
 *
 * Zero external calls. pako runs entirely in the browser.
 */

import { deflate, inflate } from 'pako';
import type { CrosswordResult, DirectionalWord, PuzzleMode } from '../logic/types';

/* ── Compact serialization format ─────────────────────────────────────── */

/**
 * Compact representation of a puzzle for URL encoding.
 * Uses short keys to minimize JSON size before compression.
 *
 * Versions:
 *   v1 — crosswords only (the 'd'/'r' word flags can't express diagonals).
 *        Still what crosswords encode as, so old deployed clients keep
 *        decoding new crossword links.
 *   v2 — adds 'm' (mode) and per-word 'dx'/'dy' unit vectors; used for
 *        word searches, which v1 could never represent (they shared as
 *        broken crosswords before).
 */
interface CompactPuzzle {
  /** Version — for future format migrations */
  v: number;
  /** Mode (v2): 'c' = crossword, 'w' = word search. Absent = crossword. */
  m?: 'c' | 'w';
  /** Grid width */
  w: number;
  /** Grid height */
  h: number;
  /** Grid as a flat string (row-major, '-' for empty cells) */
  g: string;
  /** Word locations in compact form */
  words: CompactWord[];
}

interface CompactWord {
  /** Word text (grid form — no spaces) */
  w: string;
  /** Clue text */
  c: string;
  /** Start X */
  x: number;
  /** Start Y */
  y: number;
  /** Direction: 'a' = across (horizontal), 'd' = down (vertical) */
  d: 'a' | 'd';
  /** Reversed? Only included if true */
  r?: 1;
  /** Exact direction vector (v2 word search) — one of the 8 unit vectors */
  dx?: number;
  dy?: number;
  /**
   * Display word for two-word answers ("extra time"). Optional extra key —
   * old deployed clients parse and ignore it, so v1 stays compatible.
   */
  dw?: string;
}

/** A decoded shared puzzle with the mode it was shared as. */
export interface SharedPuzzle {
  puzzle: CrosswordResult;
  mode: PuzzleMode;
}


/* ── Encode: puzzle → URL hash ────────────────────────────────────────── */

/**
 * Encode a puzzle into a shareable URL.
 * Returns the full URL with the puzzle encoded in the hash.
 */
export function encodePuzzleToUrl(puzzle: CrosswordResult, mode: PuzzleMode = 'crossword'): string {
  const compact = toCompact(puzzle, mode);
  const json = JSON.stringify(compact);
  const compressed = deflate(new TextEncoder().encode(json));
  const encoded = base64UrlEncode(compressed);

  // Build URL from current location (works on GitHub Pages with base path)
  const base = window.location.href.split('#')[0];
  return `${base}#puzzle=${encoded}`;
}

/**
 * Copy the puzzle share URL to clipboard.
 * Returns true if successful, false if clipboard API isn't available.
 */
export async function copyPuzzleUrlToClipboard(puzzle: CrosswordResult, mode: PuzzleMode = 'crossword'): Promise<boolean> {
  const url = encodePuzzleToUrl(puzzle, mode);
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    // Fallback: create a temporary input element
    const input = document.createElement('input');
    input.value = url;
    document.body.appendChild(input);
    input.select();
    const success = document.execCommand('copy');
    document.body.removeChild(input);
    return success;
  }
}


/* ── Decode: URL hash → puzzle ────────────────────────────────────────── */

/**
 * Check if the current URL contains a shared puzzle.
 * Returns the decoded puzzle + mode, or null if no puzzle is in the hash.
 *
 * v1 links decode as crosswords — correct, v1 only ever stored crosswords.
 */
export function decodePuzzleFromUrl(): SharedPuzzle | null {
  const hash = window.location.hash;
  if (!hash.startsWith('#puzzle=')) return null;

  try {
    const encoded = hash.slice('#puzzle='.length);
    const compressed = base64UrlDecode(encoded);
    const json = new TextDecoder().decode(inflate(compressed));
    const compact: CompactPuzzle = JSON.parse(json);

    if (compact.v !== 1 && compact.v !== 2) {
      console.warn(`Unknown puzzle URL version: ${compact.v}`);
      return null;
    }

    return {
      puzzle: fromCompact(compact),
      mode: compact.m === 'w' ? 'wordsearch' : 'crossword',
    };
  } catch (err) {
    console.warn('Failed to decode puzzle from URL:', err);
    return null;
  }
}

/**
 * Clear the puzzle hash from the URL without triggering a page reload.
 * Called after the puzzle has been loaded so the hash doesn't persist.
 */
export function clearPuzzleHash(): void {
  if (window.location.hash.startsWith('#puzzle=')) {
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }
}


/* ── Compact format conversion ────────────────────────────────────────── */

function toCompact(puzzle: CrosswordResult, mode: PuzzleMode): CompactPuzzle {
  if (mode === 'wordsearch') {
    return {
      v: 2,
      m: 'w',
      w: puzzle.width,
      h: puzzle.height,
      g: puzzle.grid.map(row => row.join('')).join(''),
      words: puzzle.wordLocations.map(wordToCompactV2),
    };
  }

  // Crosswords stay on v1: the flags express across/down fully, and old
  // deployed clients keep decoding new crossword links.
  return {
    v: 1,
    w: puzzle.width,
    h: puzzle.height,
    g: puzzle.grid.map(row => row.join('')).join(''),
    words: puzzle.wordLocations.map(wordToCompact),
  };
}

function fromCompact(compact: CompactPuzzle): CrosswordResult {
  // Reconstruct 2D grid from flat string
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
    wordLocations: compact.words.map(wordFromCompact),
  };
}

function wordToCompact(word: DirectionalWord): CompactWord {
  const cw: CompactWord = {
    w: word.word,
    c: word.clue,
    x: word.x,
    y: word.y,
    d: word.isHorizontal ? 'a' : 'd',
  };
  if (word.isReversed) cw.r = 1;
  if (word.displayWord) cw.dw = word.displayWord;
  return cw;
}

/** v2 word-search words always carry the exact direction vector. */
function wordToCompactV2(word: DirectionalWord): CompactWord {
  const cw = wordToCompact(word);
  // Vector should always be present on engine output; the flag-derived
  // fallback keeps hand-built or legacy results shareable.
  const sign = word.isReversed ? -1 : 1;
  cw.dx = word.dx ?? (word.isHorizontal ? sign : 0);
  cw.dy = word.dy ?? (word.isHorizontal ? 0 : sign);
  return cw;
}

function wordFromCompact(cw: CompactWord): DirectionalWord {
  const word: DirectionalWord = {
    word: cw.w,
    clue: cw.c,
    x: cw.x,
    y: cw.y,
    isHorizontal: cw.d === 'a',
    isReversed: cw.r === 1,
  };
  if (cw.dx !== undefined && cw.dy !== undefined) {
    word.dx = cw.dx;
    word.dy = cw.dy;
  }
  if (cw.dw !== undefined) {
    word.displayWord = cw.dw;
  }
  return word;
}


/* ── Base64url encoding (URL-safe, no padding) ────────────────────────── */

function base64UrlEncode(bytes: Uint8Array): string {
  // Convert bytes to base64, then make URL-safe
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
  // Restore standard base64 characters
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  // Add padding if needed
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
