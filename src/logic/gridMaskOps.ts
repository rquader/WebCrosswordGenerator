/**
 * Pure helpers for the user-drawn block mask behind the "build your own grid"
 * (skeleton-first) editor. A BlockMask is the editor's local representation of
 * grid geometry — see gridSkeleton.ts (true = block, false = open, [y][x]).
 *
 * These helpers create, resize, and toggle masks immutably; deriving slots from
 * a mask lives in gridSkeleton.ts. Pure TypeScript — no DOM, no React. The
 * editor holds a BlockMask in React state and calls these to update it with
 * cheap structural sharing, so a re-render only touches the changed row.
 */

import type { BlockMask } from './gridSkeleton';

/** Grid side bounds for the editor, in cells per side. */
export const MIN_GRID_SIDE = 5;
export const MAX_GRID_SIDE = 21;
export const DEFAULT_GRID_SIDE = 15;

/** Clamp a requested side length into [MIN, MAX] and round to a whole number. */
export function clampGridSide(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_GRID_SIDE;
  return Math.max(MIN_GRID_SIDE, Math.min(MAX_GRID_SIDE, Math.round(n)));
}

/** Create a width×height mask with every cell OPEN (false). */
export function createBlockMask(width: number, height: number): BlockMask {
  const mask: BlockMask = [];
  for (let y = 0; y < height; y++) {
    mask.push(new Array<boolean>(width).fill(false));
  }
  return mask;
}

/**
 * Resize a mask, preserving the overlapping top-left region. Cells added when
 * growing are OPEN; cells outside the new bounds when shrinking are dropped.
 * Returns a fresh mask; the input is not mutated.
 */
export function resizeBlockMask(
  mask: BlockMask,
  oldWidth: number,
  oldHeight: number,
  newWidth: number,
  newHeight: number,
): BlockMask {
  const next = createBlockMask(newWidth, newHeight);
  const copyH = Math.min(oldHeight, newHeight, mask.length);
  for (let y = 0; y < copyH; y++) {
    const row = mask[y];
    const copyW = Math.min(oldWidth, newWidth, row.length);
    for (let x = 0; x < copyW; x++) {
      next[y][x] = row[x];
    }
  }
  return next;
}

/**
 * Return a new mask with cell (x, y) set to `blocked`. Clones only the changed
 * row (structural sharing) so React updates stay cheap. If the cell is already
 * in the requested state, returns the SAME mask reference (a no-op) so callers
 * can skip the re-render. Out-of-bounds coordinates are ignored (same ref).
 */
export function setCell(mask: BlockMask, x: number, y: number, blocked: boolean): BlockMask {
  if (y < 0 || y >= mask.length) return mask;
  const row = mask[y];
  if (x < 0 || x >= row.length) return mask;
  if (row[x] === blocked) return mask;

  const next = mask.slice();
  const newRow = row.slice();
  newRow[x] = blocked;
  next[y] = newRow;
  return next;
}
