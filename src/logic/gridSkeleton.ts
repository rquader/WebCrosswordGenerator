/**
 * Geometry-based slot derivation for the skeleton-first ("build your own
 * grid") flow.
 *
 * In the classic skeleton flow the GENERATOR decides where words go and we
 * strip filler to blank slots. Here the USER draws the geometry directly:
 * they paint each cell open or block, and we read maximal open runs back out
 * as crossword slots (across + down), numbered exactly as the finished puzzle
 * will be.
 *
 * This module is pure TypeScript — no DOM, no React, no randomness. The block
 * mask is a local representation owned by this module; the rest of the app
 * keeps using the '-' empty-cell convention for grids (see EMPTY_CELL below),
 * which is what the SkeletonResult.grid this module produces is filled with.
 *
 * Id note: each slot gets a UNIQUE sequential id (row-major scan order). The id
 * is a per-slot identity, NOT a crossword display number — every consumer (the
 * fill solver, the AI-fill parser, the fill view, skeletonToPuzzle) keys slots
 * by id and requires uniqueness, so an across and a down that begin at the SAME
 * cell get DIFFERENT ids (they must never collide). Display numbering is a
 * separate concern: the finished puzzle is renumbered by numbering.ts/
 * assignNumbers when it leaves the skeleton, so nothing here needs to match it.
 */

import type { SkeletonResult, SkeletonSlot } from './types';

/** Empty-cell sentinel, matching the rest of the grid code (skeletonGenerator). */
const EMPTY_CELL = '-';

// A run must be length >= 2 to be a slot; length-1 open runs (isolated cells)
// are not slots (see findStrayOpenCells). This minimum is enforced implicitly:
// a run only "starts" when the next cell along its axis is also open.

/**
 * A user-drawn grid as a blocked mask: `mask[y][x] === true` means the cell at
 * column x, row y is a BLOCK (black square); `false` means it's OPEN (a cell a
 * letter can live in). Indexed [row][col] = [y][x], matching string[][] grids
 * elsewhere in the codebase. Local to this module by design.
 */
export type BlockMask = boolean[][];

/**
 * One crossing between an across slot and a down slot that share a cell.
 *
 * - `acrossSlotId` / `downSlotId` — the `id` (slot number) of each slot.
 * - `x` / `y` — grid coordinates of the shared cell.
 * - `acrossPos` — zero-based position of the shared cell within the across
 *   slot (`x - acrossSlot.startX`).
 * - `downPos` — zero-based position of the shared cell within the down slot
 *   (`y - downSlot.startY`).
 *
 * The solver locks `acrossSlot[acrossPos] === downSlot[downPos]`; the AI prompt
 * uses these to describe the interlock.
 */
export interface SlotIntersection {
  acrossSlotId: number;
  downSlotId: number;
  x: number;
  y: number;
  acrossPos: number;
  downPos: number;
}

/** True when the cell at (x, y) is OPEN (in range and not a block). */
function isOpen(mask: BlockMask, width: number, height: number, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= width || y >= height) return false;
  return mask[y][x] === false;
}

/**
 * Derive crossword slots from a user-drawn block mask.
 *
 * Scans for maximal OPEN runs of length >= 2: horizontal runs become `across`
 * slots, vertical runs become `down` slots, each bounded by a block cell or
 * the grid edge. Length-1 open runs (isolated cells) are NOT slots — see
 * `findStrayOpenCells` for surfacing those.
 *
 * The returned SkeletonResult has:
 * - `grid`: width x height, every cell EMPTY_CELL ('-') — no letters yet. Open
 *   cells are blank slot cells to be filled later; non-slot cells (blocks and
 *   strays) are also '-', which the finished puzzle treats as empty too.
 * - `slots`: every derived slot, `constraints` empty (no crossing letters yet),
 *   `word`/`clue` undefined, `isUserWord` false (no words placed at this stage).
 * - count fields all 0 (no must/can words exist in geometry-only derivation).
 * - `failures` empty.
 *
 * Slot `id`s are crossword numbers matching numbering.ts/assignNumbers (see the
 * module doc): assigned in a single row-major pass over cells that START a run,
 * with an across and a down at the same start cell sharing one number.
 */
export function deriveSlotsFromBlockMask(
  mask: BlockMask,
  width: number,
  height: number,
): SkeletonResult {
  const slots: SkeletonSlot[] = [];

  // Single row-major scan (y outer, x inner) over cells that start a run. Each
  // across/down run gets its OWN unique sequential id in scan order. Ids are a
  // stable per-slot identity (consumers key by them), NOT crossword display
  // numbers — an across and a down sharing a start cell get DIFFERENT ids so
  // they never collide. The finished puzzle's display numbers come later from
  // numbering.ts.
  let nextId = 1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!isOpen(mask, width, height, x, y)) continue;

      // An across run STARTS here if this open cell has a block/edge to its
      // left and an open cell to its right (so the run is length >= 2).
      const startsAcross =
        !isOpen(mask, width, height, x - 1, y) && isOpen(mask, width, height, x + 1, y);

      // A down run STARTS here if this open cell has a block/edge above and an
      // open cell below.
      const startsDown =
        !isOpen(mask, width, height, x, y - 1) && isOpen(mask, width, height, x, y + 1);

      if (!startsAcross && !startsDown) continue;

      // This cell starts at least one slot. Across and down each get their OWN
      // id (they do NOT share one) so slot ids stay globally unique — the fill
      // solver, AI-fill parser, fill view and skeletonToPuzzle all key by id.
      if (startsAcross) {
        let length = 0;
        while (isOpen(mask, width, height, x + length, y)) length++;
        slots.push(makeEmptySlot(nextId++, 'across', x, y, length));
      }

      if (startsDown) {
        let length = 0;
        while (isOpen(mask, width, height, x, y + length)) length++;
        slots.push(makeEmptySlot(nextId++, 'down', x, y, length));
      }
    }
  }

  // Grid is all empty cells: open cells are blanks to fill, blocks/strays are
  // '-' too (the finished puzzle treats every non-word cell as '-').
  const grid: string[][] = [];
  for (let y = 0; y < height; y++) {
    grid.push(new Array<string>(width).fill(EMPTY_CELL));
  }

  return {
    grid,
    slots,
    width,
    height,
    // No words placed in geometry-only derivation; these get populated when a
    // later stage (solver / AI fill) actually places words into the slots.
    mustPlacedCount: 0,
    mustTotalCount: 0,
    canPlacedCount: 0,
    canTotalCount: 0,
    failures: [],
  };
}

/** Build an empty (unfilled) SkeletonSlot from geometry. */
function makeEmptySlot(
  id: number,
  direction: 'across' | 'down',
  startX: number,
  startY: number,
  length: number,
): SkeletonSlot {
  return {
    id,
    direction,
    startX,
    startY,
    length,
    constraints: new Map<number, string>(), // no crossing letters yet
    isUserWord: false,
  };
}

/**
 * Compute every crossing between an across slot and a down slot that share a
 * cell. Returns one SlotIntersection per shared cell.
 *
 * Uses the coordinate-walk pattern from skeletonGenerator: walk each across
 * slot's cells, walk each down slot's cells, and record where they coincide.
 * (In a legal grid an across and a down can share at most one cell, but we
 * record every coincidence so callers don't have to assume that.)
 */
export function computeIntersections(slots: SkeletonSlot[]): SlotIntersection[] {
  const acrossSlots = slots.filter(s => s.direction === 'across');
  const downSlots = slots.filter(s => s.direction === 'down');
  const crossings: SlotIntersection[] = [];

  for (const across of acrossSlots) {
    for (const down of downSlots) {
      // Across occupies a single row (across.startY) across a span of columns;
      // down occupies a single column (down.startX) across a span of rows. They
      // can only meet at (down.startX, across.startY) — check it's inside both.
      const x = down.startX;
      const y = across.startY;

      const acrossPos = x - across.startX;
      const downPos = y - down.startY;

      const withinAcross = acrossPos >= 0 && acrossPos < across.length;
      const withinDown = downPos >= 0 && downPos < down.length;

      if (withinAcross && withinDown) {
        crossings.push({
          acrossSlotId: across.id,
          downSlotId: down.id,
          x,
          y,
          acrossPos,
          downPos,
        });
      }
    }
  }

  return crossings;
}

/**
 * Find OPEN cells that belong to NO slot of length >= 2 — isolated cells and
 * length-1 runs. The editor flags these (a letter there can never be part of a
 * word, so the geometry is incomplete).
 *
 * A cell is NOT stray if it lies on any across run >= 2 (a horizontal neighbor
 * is open) OR any down run >= 2 (a vertical neighbor is open). So a cell is
 * stray exactly when it's open but has no open orthogonal neighbor.
 */
export function findStrayOpenCells(
  mask: BlockMask,
  width: number,
  height: number,
): { x: number; y: number }[] {
  const strays: { x: number; y: number }[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!isOpen(mask, width, height, x, y)) continue;

      const hasOpenNeighbor =
        isOpen(mask, width, height, x - 1, y) ||
        isOpen(mask, width, height, x + 1, y) ||
        isOpen(mask, width, height, x, y - 1) ||
        isOpen(mask, width, height, x, y + 1);

      if (!hasOpenNeighbor) {
        strays.push({ x, y });
      }
    }
  }

  return strays;
}

/**
 * Count connected components over the slots: two slots are connected when they
 * share a cell (an across/down crossing), and connectivity is transitive.
 * Returns the number of disjoint groups (union-find).
 *
 * The editor uses this for a connectivity warning — a well-formed puzzle is
 * usually a single connected component (every word reachable from every other
 * through crossings). Zero slots -> 0 components.
 */
export function countComponents(slots: SkeletonSlot[]): number {
  if (slots.length === 0) return 0;

  // Union-find over slot array indices.
  const parent = slots.map((_, i) => i);

  function find(i: number): number {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]]; // path halving
      i = parent[i];
    }
    return i;
  }

  function union(a: number, b: number): void {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  }

  // Map every occupied cell to the slots that cover it; any two slots sharing a
  // cell get unioned. This catches across-down crossings (the only way two
  // legal slots touch) without assuming a particular grid shape.
  const cellToSlotIndices = new Map<string, number[]>();
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    for (let pos = 0; pos < slot.length; pos++) {
      const x = slot.direction === 'across' ? slot.startX + pos : slot.startX;
      const y = slot.direction === 'across' ? slot.startY : slot.startY + pos;
      const key = `${x},${y}`;
      const list = cellToSlotIndices.get(key);
      if (list) {
        for (const other of list) union(i, other);
        list.push(i);
      } else {
        cellToSlotIndices.set(key, [i]);
      }
    }
  }

  const roots = new Set<number>();
  for (let i = 0; i < slots.length; i++) roots.add(find(i));
  return roots.size;
}
