/**
 * Client-side PDF export for crossword puzzles.
 *
 * Generates a real vector PDF using jsPDF — no server, no network calls.
 * Produces crisp output at any zoom level (unlike html2canvas raster approach).
 *
 * Layout targets US Letter (8.5" x 11") portrait:
 * - 0.75" margins on all sides
 * - Title centered at top
 * - Optional Name/Date line below title
 * - Grid centered in the upper portion
 * - Clues in two columns (Across | Down) below the grid
 */

import { jsPDF } from 'jspdf';
import type { CrosswordResult } from '../logic/types';
import { assignNumbers } from '../logic/numbering';
import {
  PAGE_WIDTH_PT as PAGE_WIDTH,
  PAGE_HEIGHT_PT as PAGE_HEIGHT,
  MARGIN_PT as MARGIN,
  USABLE_WIDTH_PT as USABLE_WIDTH,
  planBothPrintLayout,
  studentCellPt,
} from './printLayout';

export interface PdfExportOptions {
  title: string;
  showNameDate: boolean;
  showAnswers: boolean;
  /**
   * Blocked squares as light gray instead of solid black — saves toner.
   * Default true (matches the print preview's default).
   */
  inkSaver?: boolean;
}

/** Ink-saver blocked-square gray (matches PrintGrid's #D0D0D0). */
const INK_SAVER_GRAY = 208;

/**
 * Generate and download a PDF of the puzzle.
 *
 * All rendering happens locally in the browser.
 * The file is downloaded immediately — no preview, no upload.
 */
export function exportAsPdf(puzzle: CrosswordResult, options: PdfExportOptions): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });

  renderPuzzlePage(doc, puzzle, options);

  // Build filename from title
  const slug = options.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'crossword';
  const suffix = options.showAnswers ? '-answer-key' : '';

  doc.save(`${slug}${suffix}.pdf`);
}

/**
 * Generate a PDF with both student puzzle and answer key.
 *
 * One page when everything fits readably (student grid + clues + a
 * compact answer-key grid below); two pages past the threshold in
 * printLayout.planBothPrintLayout. The browser print path makes the
 * same call from the same plan.
 */
export function exportBothAsPdf(puzzle: CrosswordResult, options: Omit<PdfExportOptions, 'showAnswers'>): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });
  const plan = planBothPrintLayout(puzzle);

  if (plan.singlePage) {
    const bottomY = renderPuzzlePage(doc, puzzle, { ...options, showAnswers: false });
    renderCompactAnswerKey(doc, puzzle, bottomY, plan.keyCellPt, plan.keyShowsNumbers, options.inkSaver ?? true);
  } else {
    // Page 1: Student puzzle
    renderPuzzlePage(doc, puzzle, { ...options, showAnswers: false });

    // Page 2: Answer key
    doc.addPage();
    renderPuzzlePage(doc, puzzle, {
      title: `${options.title} — Answer Key`,
      showNameDate: false,
      showAnswers: true,
      inkSaver: options.inkSaver,
    });
  }

  const slug = options.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'crossword';

  doc.save(`${slug}-complete.pdf`);
}


/* ── Internal rendering ───────────────────────────────────────────────── */
// Page geometry lives in printLayout.ts — shared with the browser print path.

/** Render a full puzzle page; returns the y below the last drawn content. */
function renderPuzzlePage(doc: jsPDF, puzzle: CrosswordResult, options: PdfExportOptions): number {
  const { title, showNameDate, showAnswers } = options;
  let cursorY = MARGIN;

  // ── Title ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  const titleWidth = doc.getTextWidth(title);
  doc.text(title, (PAGE_WIDTH - titleWidth) / 2, cursorY + 14);
  cursorY += 28;

  // ── Name / Date line ──
  if (showNameDate) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Name:', MARGIN, cursorY + 9);
    doc.line(MARGIN + 32, cursorY + 10, MARGIN + 200, cursorY + 10);
    doc.text('Date:', MARGIN + 220, cursorY + 9);
    doc.line(MARGIN + 250, cursorY + 10, MARGIN + 380, cursorY + 10);
    cursorY += 22;
  }

  // ── Grid ──
  cursorY += 4;
  const gridResult = renderGrid(doc, puzzle, showAnswers, cursorY, options.inkSaver ?? true);
  cursorY = gridResult.bottomY + 16;

  // ── Clues ──
  return renderClues(doc, puzzle, cursorY);
}

/**
 * Compact answer-key grid appended below the clues on a single-page
 * "both" export. Small by design — it's a reference, not the hero.
 */
function renderCompactAnswerKey(
  doc: jsPDF,
  puzzle: CrosswordResult,
  startY: number,
  cellPt: number,
  showNumbers: boolean,
  inkSaver: boolean
): void {
  let y = startY + 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  const header = 'ANSWER KEY';
  doc.text(header, (PAGE_WIDTH - doc.getTextWidth(header)) / 2, y + 8);
  y += 14;

  renderGrid(doc, puzzle, true, y, inkSaver, { cellSize: cellPt, showNumbers });
}

interface GridRenderResult {
  bottomY: number;
}

function renderGrid(
  doc: jsPDF,
  puzzle: CrosswordResult,
  showAnswers: boolean,
  startY: number,
  inkSaver: boolean,
  gridOptions?: { cellSize?: number; showNumbers?: boolean }
): GridRenderResult {
  const { cells } = assignNumbers(puzzle.wordLocations, puzzle.width, puzzle.height);
  const numberMap = new Map<string, number>();
  for (const cell of cells) {
    numberMap.set(`${cell.x},${cell.y}`, cell.number);
  }

  // Default sizing fits the grid in the upper portion of the page;
  // callers (compact answer key) may pin an explicit cell size.
  const cellSize = gridOptions?.cellSize ?? studentCellPt(puzzle);
  const showNumbers = gridOptions?.showNumbers ?? true;

  // Type scales with the cell so dense grids stay inside their cells.
  const letterSize = Math.min(11, Math.max(4, cellSize * 0.62));
  const numberSize = Math.min(6, Math.max(3, cellSize * 0.33));

  const gridWidth = cellSize * puzzle.width;
  const gridHeight = cellSize * puzzle.height;
  const gridX = (PAGE_WIDTH - gridWidth) / 2; // center horizontally

  const EMPTY_CELL = '-';

  for (let y = 0; y < puzzle.height; y++) {
    for (let x = 0; x < puzzle.width; x++) {
      const cellX = gridX + x * cellSize;
      const cellY = startY + y * cellSize;
      const letter = puzzle.grid[y][x];
      const isEmpty = letter === EMPTY_CELL;

      // Cell background
      if (isEmpty) {
        if (inkSaver) {
          doc.setFillColor(INK_SAVER_GRAY, INK_SAVER_GRAY, INK_SAVER_GRAY);
        } else {
          doc.setFillColor(0, 0, 0);
        }
        doc.rect(cellX, cellY, cellSize, cellSize, 'F');
      } else {
        doc.setFillColor(255, 255, 255);
        doc.rect(cellX, cellY, cellSize, cellSize, 'F');
      }

      // Cell border
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.rect(cellX, cellY, cellSize, cellSize, 'S');

      if (!isEmpty) {
        // Cell number
        const num = numberMap.get(`${x},${y}`);
        if (num !== undefined && showNumbers) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(numberSize);
          doc.setTextColor(100, 100, 100);
          doc.text(String(num), cellX + 1.5, cellY + numberSize + 0.5);
        }

        // Answer letter
        if (showAnswers) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(letterSize);
          doc.setTextColor(0, 0, 0);
          const letterText = letter.toUpperCase();
          const letterWidth = doc.getTextWidth(letterText);
          doc.text(letterText, cellX + (cellSize - letterWidth) / 2, cellY + cellSize * 0.68);
        }
      }
    }
  }

  // Outer border (thicker)
  doc.setLineWidth(1.5);
  doc.rect(gridX, startY, gridWidth, gridHeight, 'S');

  return { bottomY: startY + gridHeight };
}

/**
 * Page-split threshold: if less than this much vertical space remains under
 * the grid, the clues start on a fresh page instead of cramming a sliver at
 * the bottom. 120pt fits a column header plus roughly eight clue lines —
 * anything less reads as a layout mistake on paper.
 *
 * Decision (Phase 15 / session 3): puzzle and answer key always stay one
 * page EACH ("Both" = two pages — a teacher hands out page 1 and keeps
 * page 2). Within a page, clues flow onto continuation pages as needed;
 * the old behavior silently truncated them with "(continued...)".
 */
const MIN_CLUE_SPACE_PT = 120;

const CLUE_FONT_SIZE = 8.5;
const CLUE_LINE_HEIGHT = 11;
const CLUE_HEADER_HEIGHT = 16;
const COLUMN_GAP = 20;

interface MeasuredClue {
  numberText: string;
  numberWidth: number;
  lines: string[];
}

/** Pre-wrap a clue list so pagination can measure before drawing. */
function measureClues(
  doc: jsPDF,
  clues: { number: number; clue: string }[],
  columnWidth: number
): MeasuredClue[] {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(CLUE_FONT_SIZE);

  return clues.map(clue => {
    const numberText = `${clue.number}. `;
    const numberWidth = doc.getTextWidth(numberText);
    return {
      numberText,
      numberWidth,
      lines: doc.splitTextToSize(clue.clue, columnWidth - numberWidth) as string[],
    };
  });
}

function clueItemHeight(item: MeasuredClue): number {
  return item.lines.length * CLUE_LINE_HEIGHT + 1;
}

/** Render all clues (paginating as needed); returns the y below the last clue drawn. */
function renderClues(doc: jsPDF, puzzle: CrosswordResult, startY: number): number {
  const { acrossClues, downClues } = assignNumbers(
    puzzle.wordLocations, puzzle.width, puzzle.height
  );

  const columnWidth = (USABLE_WIDTH - COLUMN_GAP) / 2;
  const leftX = MARGIN;
  const rightX = MARGIN + columnWidth + COLUMN_GAP;

  const acrossQueue = measureClues(doc, acrossClues, columnWidth);
  const downQueue = measureClues(doc, downClues, columnWidth);

  // Not enough room under the grid for a meaningful start? Fresh page.
  let y = startY;
  if (PAGE_HEIGHT - MARGIN - y < MIN_CLUE_SPACE_PT) {
    doc.addPage();
    y = MARGIN;
  }

  // Each page renders the next chunk of Across on the left and Down on the
  // right. Loop until both queues are drained — no truncation, ever.
  let acrossIndex = 0;
  let downIndex = 0;
  let isFirstCluePage = true;
  let lastY = y;

  while (acrossIndex < acrossQueue.length || downIndex < downQueue.length) {
    if (!isFirstCluePage) {
      doc.addPage();
      y = MARGIN;
    }

    const pageBottom = PAGE_HEIGHT - MARGIN;
    lastY = y;

    if (acrossIndex < acrossQueue.length) {
      const title = isFirstCluePage ? 'Across' : 'Across (cont.)';
      const chunk = renderClueColumnChunk(
        doc, title, acrossQueue, acrossIndex, leftX, y, columnWidth, pageBottom
      );
      acrossIndex = chunk.index;
      lastY = Math.max(lastY, chunk.y);
    }
    if (downIndex < downQueue.length) {
      const title = isFirstCluePage ? 'Down' : 'Down (cont.)';
      const chunk = renderClueColumnChunk(
        doc, title, downQueue, downIndex, rightX, y, columnWidth, pageBottom
      );
      downIndex = chunk.index;
      lastY = Math.max(lastY, chunk.y);
    }

    isFirstCluePage = false;
  }

  return lastY;
}

/**
 * Render as many clues as fit in one column on the current page.
 * Returns the index of the first clue that did NOT fit (= queue position
 * for the next page) and the y below the last clue drawn.
 */
function renderClueColumnChunk(
  doc: jsPDF,
  title: string,
  queue: MeasuredClue[],
  startIndex: number,
  x: number,
  startY: number,
  columnWidth: number,
  pageBottom: number
): { index: number; y: number } {
  let y = startY;

  // Column header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text(title.toUpperCase(), x, y + 8);
  y += 4;
  doc.setLineWidth(0.5);
  doc.line(x, y + 6, x + columnWidth, y + 6);
  y += CLUE_HEADER_HEIGHT - 4;

  let index = startIndex;
  while (index < queue.length) {
    const item = queue[index];
    if (y + clueItemHeight(item) > pageBottom) {
      break; // continues on the next page
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(CLUE_FONT_SIZE);
    doc.setTextColor(0, 0, 0);
    doc.text(item.numberText, x, y + CLUE_LINE_HEIGHT * 0.75);

    doc.setFont('helvetica', 'normal');
    for (let i = 0; i < item.lines.length; i++) {
      doc.text(item.lines[i], x + item.numberWidth, y + CLUE_LINE_HEIGHT * 0.75 + i * CLUE_LINE_HEIGHT);
    }

    y += clueItemHeight(item);
    index++;
  }

  return { index, y };
}
