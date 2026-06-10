/**
 * Shared print-style grid treatment.
 *
 * The grid is the product, so it is styled like PRINT in every theme:
 * paper cells, ink letters, hairline inner borders, a confident ink frame,
 * floating on the page like a physical puzzle. In dark mode the paper stays
 * light ("lit paper on a dark desk") — letters remain ink, never inverted.
 *
 * All three grid renderers (CrosswordGrid, PlayableGrid, SkeletonGrid) pull
 * from here so the treatment can be tuned in one place.
 */

import type { CSSProperties } from 'react';

/** Scrollable frame so large grids pan instead of crushing their cells. */
export const GRID_PAN = 'max-w-full overflow-auto scrollbar-thin';

/** The floating "printed page" wrapper around the grid. */
export const GRID_PAGE =
  'inline-block relative noise-texture rounded-[3px] shadow-page dark:shadow-page-dark';

/** The grid frame — a confident ink border around the paper. */
export const GRID_FRAME =
  'grid gap-0 border-2 border-grid-ink dark:border-grid-blocked-dark rounded-[2px] overflow-hidden';

/** Every cell: hairline borders, centered content. */
export const CELL_BASE =
  'relative w-full h-full flex items-center justify-center select-none ' +
  'border border-grid-border dark:border-grid-border-dark';

/** An open (letter) cell — paper in every theme. */
export const CELL_PAPER = 'bg-grid-cell dark:bg-grid-cell-dark';

/** A blocked cell — solid ink. */
export const CELL_BLOCKED = 'bg-grid-blocked dark:bg-grid-blocked-dark';

/** Clue number in the cell corner. */
export const CELL_NUMBER =
  'absolute top-[7%] left-[10%] font-medium leading-none text-grid-ink/60 pointer-events-none';

/** A letter on the paper. */
export const CELL_LETTER = 'font-semibold uppercase text-grid-ink';

/**
 * Cell sizing: tracks get a fixed --cell size (clamped between minPx and
 * maxPx, shrinking with viewport width for wide grids). Cells below minPx
 * never happen — the pan container scrolls instead. This is what keeps a
 * 26-wide grid usable on a phone.
 */
export function gridSizingStyle(width: number, minPx: number, maxPx: number): CSSProperties {
  const vwPerCell = (94 / (width + 1)).toFixed(2);
  return {
    gridTemplateColumns: `repeat(${width}, var(--cell))`,
    gridAutoRows: 'var(--cell)',
    ['--cell' as string]: `clamp(${minPx}px, ${vwPerCell}vw, ${maxPx}px)`,
  };
}

/** Font size for the clue number, derived from the cell size. */
export const NUMBER_FONT_SIZE = 'max(8px, calc(var(--cell) * 0.24))';

/** Font size for the letter, derived from the cell size. */
export const LETTER_FONT_SIZE = 'calc(var(--cell) * 0.46)';
