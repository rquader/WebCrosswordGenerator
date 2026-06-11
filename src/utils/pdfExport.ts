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
import type { CrosswordResult, PuzzleMode } from '../logic/types';
import { assignNumbers } from '../logic/numbering';
import { getWordVector } from '../logic/wordSearchGenerator';
import { WORD_CIRCLE_COLORS, hexToRgb } from './wordCircleColors';
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
  /**
   * Word search pages render differently: full letter grid (no cell
   * borders, no numbers), word bank instead of clues, circled words on
   * the answer key. Default 'crossword'.
   */
  puzzleMode?: PuzzleMode;
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

  if (options.puzzleMode === 'wordsearch') {
    renderWordSearchPage(doc, puzzle, {
      title: options.title,
      showNameDate: options.showNameDate,
      withCircles: options.showAnswers,
    });
  } else {
    renderPuzzlePage(doc, puzzle, options);
  }

  // Build filename from title
  const slug = options.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'puzzle';
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

  // Word search "both" is always two pages — the key is a full grid with
  // circled words; compacting it makes the circles unreadable. Mirrors
  // PrintContainer's call for the browser path.
  if (options.puzzleMode === 'wordsearch') {
    renderWordSearchPage(doc, puzzle, {
      title: options.title,
      showNameDate: options.showNameDate,
      withCircles: false,
    });
    doc.addPage();
    renderWordSearchPage(doc, puzzle, {
      title: `${options.title} — Answer Key`,
      showNameDate: false,
      withCircles: true,
    });

    const wsSlug = options.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'word-search';
    doc.save(`${wsSlug}-complete.pdf`);
    return;
  }

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

/* ── Word search pages ────────────────────────────────────────────────── */

interface WordSearchPageOptions {
  title: string;
  showNameDate: boolean;
  /** Answer key: circle every placed word. */
  withCircles: boolean;
}

/**
 * A word search page: full letter grid inside a single frame (no cell
 * borders, no numbers — letters in open space, like every printed word
 * search), word bank below on the student page, colored circles around
 * each word on the answer key.
 */
function renderWordSearchPage(doc: jsPDF, puzzle: CrosswordResult, options: WordSearchPageOptions): void {
  let cursorY = MARGIN;

  // ── Title ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  const titleWidth = doc.getTextWidth(options.title);
  doc.text(options.title, (PAGE_WIDTH - titleWidth) / 2, cursorY + 14);
  cursorY += 28;

  // ── Name / Date line ──
  if (options.showNameDate) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Name:', MARGIN, cursorY + 9);
    doc.line(MARGIN + 32, cursorY + 10, MARGIN + 200, cursorY + 10);
    doc.text('Date:', MARGIN + 220, cursorY + 9);
    doc.line(MARGIN + 250, cursorY + 10, MARGIN + 380, cursorY + 10);
    cursorY += 22;
  }
  cursorY += 6;

  // ── Letter grid ──
  const cellSize = Math.min(
    Math.floor((USABLE_WIDTH * 0.92) / puzzle.width),
    Math.floor(((PAGE_HEIGHT - MARGIN - cursorY) * 0.62) / puzzle.height),
    26
  );
  const gridWidth = cellSize * puzzle.width;
  const gridHeight = cellSize * puzzle.height;
  const gridX = (PAGE_WIDTH - gridWidth) / 2;
  const framePad = 6;

  // Single outer frame
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(1.2);
  doc.rect(gridX - framePad, cursorY - framePad, gridWidth + framePad * 2, gridHeight + framePad * 2, 'S');

  // Letters at cell centers
  const letterSize = Math.min(12, Math.max(5, cellSize * 0.6));
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(letterSize);
  doc.setTextColor(0, 0, 0);
  for (let y = 0; y < puzzle.height; y++) {
    for (let x = 0; x < puzzle.width; x++) {
      const letter = puzzle.grid[y][x].toUpperCase();
      const w = doc.getTextWidth(letter);
      doc.text(letter, gridX + x * cellSize + (cellSize - w) / 2, cursorY + y * cellSize + cellSize * 0.66);
    }
  }

  // ── Circles (answer key) ──
  if (options.withCircles) {
    doc.setLineWidth(Math.max(1, cellSize * 0.07));
    puzzle.wordLocations.forEach((wl, index) => {
      const [r, g, b] = hexToRgb(WORD_CIRCLE_COLORS[index % WORD_CIRCLE_COLORS.length]);
      doc.setDrawColor(r, g, b);

      const { dx, dy } = getWordVector(wl);
      const x0 = gridX + (wl.x + 0.5) * cellSize;
      const y0 = cursorY + (wl.y + 0.5) * cellSize;
      const x1 = gridX + (wl.x + (wl.word.length - 1) * dx + 0.5) * cellSize;
      const y1 = cursorY + (wl.y + (wl.word.length - 1) * dy + 0.5) * cellSize;
      drawCapsule(doc, x0, y0, x1, y1, cellSize * 0.38);
    });
    doc.setDrawColor(0, 0, 0);
  }

  cursorY += gridHeight + framePad + 18;

  // ── Word bank (student page) ──
  if (!options.withCircles) {
    renderWordBank(doc, puzzle, cursorY);
  }
}

/** Word bank: alphabetized words in three columns, no clues. */
function renderWordBank(doc: jsPDF, puzzle: CrosswordResult, startY: number): void {
  const words = puzzle.wordLocations.map(wl => wl.word.toUpperCase()).sort();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text('WORD BANK', MARGIN, startY + 8);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, startY + 12, MARGIN + USABLE_WIDTH, startY + 12);

  const columns = 3;
  const columnWidth = USABLE_WIDTH / columns;
  const rowHeight = 13;
  const rows = Math.ceil(words.length / columns);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  words.forEach((word, i) => {
    const col = Math.floor(i / rows);
    const row = i % rows;
    doc.text(word, MARGIN + col * columnWidth, startY + 26 + row * rowHeight);
  });
}

/**
 * Stroke a rotated capsule (stadium shape) around the segment from
 * (x0,y0) to (x1,y1) — the classic answer-key circle. Built from two
 * straight edges and two semicircular caps; each semicircle is two
 * 90-degree cubic Bezier arcs, all computed in rotated coordinates
 * directly (jsPDF has no rotation transform for paths).
 */
function drawCapsule(doc: jsPDF, x0: number, y0: number, x1: number, y1: number, radius: number): void {
  const theta = Math.atan2(y1 - y0, x1 - x0);

  // Sample a point on the circle of `radius` around (cx, cy)
  const at = (cx: number, cy: number, angle: number): [number, number] =>
    [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];

  // 90-degree arc (clockwise in screen coords) from `fromAngle` around
  // (cx, cy): returns the cubic control points and endpoint, absolute.
  const K = 0.5523; // standard circle-to-Bezier constant
  const arc90 = (cx: number, cy: number, fromAngle: number): [number, number, number, number, number, number] => {
    const toAngle = fromAngle - Math.PI / 2;
    const [sx, sy] = at(cx, cy, fromAngle);
    const [ex, ey] = at(cx, cy, toAngle);
    // Tangents for a decreasing-angle sweep: (sin a, -cos a)
    const c1x = sx + K * radius * Math.sin(fromAngle);
    const c1y = sy - K * radius * Math.cos(fromAngle);
    const c2x = ex - K * radius * Math.sin(toAngle);
    const c2y = ey + K * radius * Math.cos(toAngle);
    return [c1x, c1y, c2x, c2y, ex, ey];
  };

  // Path: start at P0's "upper" edge point, straight to P1, cap around P1,
  // straight back to P0, cap around P0. All angles relative to theta.
  const start = at(x0, y0, theta + Math.PI / 2);
  const absSegments: number[][] = [];

  const lineTo = (p: [number, number]) => absSegments.push([p[0], p[1]]);
  const curve = (c: [number, number, number, number, number, number]) => absSegments.push([...c]);

  lineTo(at(x1, y1, theta + Math.PI / 2));
  curve(arc90(x1, y1, theta + Math.PI / 2));
  curve(arc90(x1, y1, theta));
  lineTo(at(x0, y0, theta - Math.PI / 2));
  curve(arc90(x0, y0, theta - Math.PI / 2));
  curve(arc90(x0, y0, theta - Math.PI));

  // jsPDF's lines() wants every segment RELATIVE to the previous endpoint
  let prevX = start[0];
  let prevY = start[1];
  const relSegments = absSegments.map(seg => {
    if (seg.length === 2) {
      const rel = [seg[0] - prevX, seg[1] - prevY];
      prevX = seg[0]; prevY = seg[1];
      return rel;
    }
    const rel = [
      seg[0] - prevX, seg[1] - prevY,
      seg[2] - prevX, seg[3] - prevY,
      seg[4] - prevX, seg[5] - prevY,
    ];
    prevX = seg[4]; prevY = seg[5];
    return rel;
  });

  doc.lines(relSegments, start[0], start[1], [1, 1], 'S', true);
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
