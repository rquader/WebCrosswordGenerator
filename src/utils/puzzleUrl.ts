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
import type { CrosswordResult, DirectionalWord } from '../logic/types';

/* ── Compact serialization format ─────────────────────────────────────── */

/**
 * Compact representation of a puzzle for URL encoding.
 * Uses short keys to minimize JSON size before compression.
 */
interface CompactPuzzle {
  /** Version — for future format migrations */
  v: number;
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
  /** Word text */
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
}


/* ── Encode: puzzle → URL hash ────────────────────────────────────────── */

/**
 * Encode a puzzle into a shareable URL.
 * Returns the full URL with the puzzle encoded in the hash.
 */
export function encodePuzzleToUrl(puzzle: CrosswordResult): string {
  const compact = toCompact(puzzle);
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
export async function copyPuzzleUrlToClipboard(puzzle: CrosswordResult): Promise<boolean> {
  const url = encodePuzzleToUrl(puzzle);
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
 * Returns the decoded puzzle or null if no puzzle is in the hash.
 */
export function decodePuzzleFromUrl(): CrosswordResult | null {
  const hash = window.location.hash;
  if (!hash.startsWith('#puzzle=')) return null;

  try {
    const encoded = hash.slice('#puzzle='.length);
    const compressed = base64UrlDecode(encoded);
    const json = new TextDecoder().decode(inflate(compressed));
    const compact: CompactPuzzle = JSON.parse(json);

    if (compact.v !== 1) {
      console.warn(`Unknown puzzle URL version: ${compact.v}`);
      return null;
    }

    return fromCompact(compact);
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

function toCompact(puzzle: CrosswordResult): CompactPuzzle {
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
  return cw;
}

function wordFromCompact(cw: CompactWord): DirectionalWord {
  return {
    word: cw.w,
    clue: cw.c,
    x: cw.x,
    y: cw.y,
    isHorizontal: cw.d === 'a',
    isReversed: cw.r === 1,
  };
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
