/**
 * Shared print layout planning.
 *
 * The browser print path (PrintContainer) and the PDF path (pdfExport)
 * render independently, but the decision "do puzzle + answer key fit on
 * ONE page?" must be the same in both — a teacher who sees a one-page
 * preview should get a one-page PDF. This module owns that decision and
 * the page geometry constants both renderers share.
 *
 * All measurements are in PDF points (1pt = 1/72in, US Letter portrait).
 * The browser side converts to CSS px via ptToPx (96dpi: 1pt = 4/3px).
 */

import type { CrosswordResult } from '../logic/types';
import { assignNumbers } from '../logic/numbering';

// US Letter portrait with 0.75in margins — mirrors pdfExport's page setup.
export const PAGE_WIDTH_PT = 612;
export const PAGE_HEIGHT_PT = 792;
export const MARGIN_PT = 54;
export const USABLE_WIDTH_PT = PAGE_WIDTH_PT - MARGIN_PT * 2;
export const USABLE_HEIGHT_PT = PAGE_HEIGHT_PT - MARGIN_PT * 2;

/**
 * Single-page threshold: the compact answer-key grid may shrink down to
 * this cell size before we give up and split to a second page. Below 8pt
 * cells (~11px) the key letters stop being legible on paper, which
 * defeats the point of printing the key at all.
 */
export const MIN_KEY_CELL_PT = 8;

/** Compact answer-key cells never grow past this — it's a reference, not the hero. */
export const MAX_KEY_CELL_PT = 12;

/**
 * Cell numbers clutter the compact key below this cell size; the key is
 * for checking letters, so numbers are dropped when cells get small.
 */
export const KEY_NUMBERS_MIN_CELL_PT = 12;

/**
 * Conservative clue-wrap estimate: average characters per line in a
 * two-column clue layout at ~8.5pt type. Real wrapping (measured by
 * jsPDF) fits MORE per line, so estimates here only over-count height —
 * a "fits on one page" verdict is safe in both renderers.
 */
const CLUE_CHARS_PER_LINE = 44;
const CLUE_LINE_HEIGHT_PT = 11;
const CLUE_HEADER_HEIGHT_PT = 16;

// Header block above the grid (title + name/date line), grid size caps —
// all mirror pdfExport's student-page renderer.
const TITLE_BLOCK_PT = 28;
const NAME_DATE_BLOCK_PT = 22;
const GRID_TOP_GAP_PT = 4;
const GRID_BOTTOM_GAP_PT = 16;
const KEY_HEADER_PT = 14;
const KEY_TOP_GAP_PT = 8;
const STUDENT_CELL_CAP_PT = 30;

export interface BothPrintPlan {
  /** True: student grid + clues + compact answer key all on one page. */
  singlePage: boolean;
  /** Cell size for the compact answer-key grid (pt). */
  keyCellPt: number;
  /** Whether the compact key is large enough to keep cell numbers. */
  keyShowsNumbers: boolean;
}

/** Convert PDF points to CSS pixels (96dpi). */
export function ptToPx(pt: number): number {
  return Math.round(pt * (4 / 3));
}

/** Student-page grid cell size — the same formula pdfExport uses. */
export function studentCellPt(puzzle: CrosswordResult): number {
  return Math.min(
    Math.floor((USABLE_WIDTH_PT * 0.85) / puzzle.width),
    Math.floor((USABLE_HEIGHT_PT * 0.5) / puzzle.height),
    STUDENT_CELL_CAP_PT
  );
}

/**
 * Decide whether "print both" fits on a single page.
 *
 * Estimates the student page's total height (title + name/date + grid +
 * clues) plus a compact answer-key grid. The clue estimate deliberately
 * over-counts (see CLUE_CHARS_PER_LINE), so a positive verdict holds in
 * both the browser and PDF renderers.
 */
export function planBothPrintLayout(puzzle: CrosswordResult): BothPrintPlan {
  const keyCellPt = Math.min(
    Math.floor((USABLE_WIDTH_PT * 0.6) / puzzle.width),
    MAX_KEY_CELL_PT
  );

  const plan: BothPrintPlan = {
    singlePage: false,
    keyCellPt,
    keyShowsNumbers: keyCellPt >= KEY_NUMBERS_MIN_CELL_PT,
  };

  if (keyCellPt < MIN_KEY_CELL_PT) {
    return plan; // key would be illegible — two pages
  }

  const { acrossClues, downClues } = assignNumbers(
    puzzle.wordLocations, puzzle.width, puzzle.height
  );

  const columnHeight = (clues: { clue: string }[]) => {
    let lines = 0;
    for (const c of clues) {
      lines += Math.max(1, Math.ceil(c.clue.length / CLUE_CHARS_PER_LINE));
    }
    return CLUE_HEADER_HEIGHT_PT + lines * CLUE_LINE_HEIGHT_PT + clues.length;
  };

  const cluesHeight = Math.max(columnHeight(acrossClues), columnHeight(downClues));
  const gridHeight = studentCellPt(puzzle) * puzzle.height;
  const keyHeight = KEY_TOP_GAP_PT + KEY_HEADER_PT + keyCellPt * puzzle.height;

  const total =
    TITLE_BLOCK_PT +
    NAME_DATE_BLOCK_PT +
    GRID_TOP_GAP_PT +
    gridHeight +
    GRID_BOTTOM_GAP_PT +
    cluesHeight +
    keyHeight;

  plan.singlePage = total <= USABLE_HEIGHT_PT;
  return plan;
}
