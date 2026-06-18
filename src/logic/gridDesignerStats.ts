/**
 * Live feedback summary for the "build your own grid" editor (GridDesigner).
 *
 * The editor recomputes this on every cell edit to show the user, in plain
 * language, what their geometry currently yields: how many word slots it has,
 * the longest and shortest, any stray (isolated) open cells, and whether the
 * grid has split into more than one disconnected section.
 *
 * Pure TypeScript — no DOM, no React. It is a thin composition over the
 * already-tested geometry helpers in gridSkeleton.ts, pulled out here so the
 * component stays presentational and the numbers it shows are unit-tested.
 */

import type { BlockMask } from './gridSkeleton';
import {
  deriveSlotsFromBlockMask,
  findStrayOpenCells,
  countComponents,
} from './gridSkeleton';

/** Everything the GridDesigner needs to render its live readout. */
export interface GridDesignerStats {
  /** Number of word slots (maximal open runs of length >= 2). */
  slotCount: number;
  /** Length of the longest slot, or 0 when there are no slots. */
  longestSlot: number;
  /** Length of the shortest slot, or 0 when there are no slots. */
  shortestSlot: number;
  /** Open cells that belong to no slot — isolated cells the user should fix. */
  strayCells: { x: number; y: number }[];
  /**
   * Number of disconnected slot groups. A well-formed crossword is a single
   * component; > 1 means the puzzle has separate islands (allowed, but worth a
   * warning). 0 when there are no slots.
   */
  componentCount: number;
  /** True when at least one slot exists — the gate for "Fill this grid". */
  canFill: boolean;
}

/**
 * Compute the live readout for a block mask. Derives slots once and reads the
 * stray cells and component count from the same geometry, so the numbers shown
 * always agree with what "Fill this grid" will produce.
 */
export function computeGridDesignerStats(
  mask: BlockMask,
  width: number,
  height: number,
): GridDesignerStats {
  const { slots } = deriveSlotsFromBlockMask(mask, width, height);
  const strayCells = findStrayOpenCells(mask, width, height);

  let longestSlot = 0;
  let shortestSlot = 0;
  if (slots.length > 0) {
    longestSlot = slots[0].length;
    shortestSlot = slots[0].length;
    for (const slot of slots) {
      if (slot.length > longestSlot) longestSlot = slot.length;
      if (slot.length < shortestSlot) shortestSlot = slot.length;
    }
  }

  return {
    slotCount: slots.length,
    longestSlot,
    shortestSlot,
    strayCells,
    componentCount: countComponents(slots),
    canFill: slots.length > 0,
  };
}
