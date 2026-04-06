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

export interface PdfExportOptions {
  title: string;
  showNameDate: boolean;
  showAnswers: boolean;
}

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
 * Generate a PDF with both student puzzle and answer key (two pages).
 */
export function exportBothAsPdf(puzzle: CrosswordResult, options: Omit<PdfExportOptions, 'showAnswers'>): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });

  // Page 1: Student puzzle
  renderPuzzlePage(doc, puzzle, { ...options, showAnswers: false });

  // Page 2: Answer key
  doc.addPage();
  renderPuzzlePage(doc, puzzle, {
    title: `${options.title} — Answer Key`,
    showNameDate: false,
    showAnswers: true,
  });

  const slug = options.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'crossword';

  doc.save(`${slug}-complete.pdf`);
}


/* ── Internal rendering ───────────────────────────────────────────────── */

// Page dimensions in points (US Letter)
const PAGE_WIDTH = 612;   // 8.5 inches
const PAGE_HEIGHT = 792;  // 11 inches
const MARGIN = 54;        // 0.75 inches
const USABLE_WIDTH = PAGE_WIDTH - MARGIN * 2;
const USABLE_HEIGHT = PAGE_HEIGHT - MARGIN * 2;

function renderPuzzlePage(doc: jsPDF, puzzle: CrosswordResult, options: PdfExportOptions): void {
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
  const gridResult = renderGrid(doc, puzzle, showAnswers, cursorY);
  cursorY = gridResult.bottomY + 16;

  // ── Clues ──
  renderClues(doc, puzzle, cursorY);
}

interface GridRenderResult {
  bottomY: number;
}

function renderGrid(
  doc: jsPDF,
  puzzle: CrosswordResult,
  showAnswers: boolean,
  startY: number
): GridRenderResult {
  const { cells } = assignNumbers(puzzle.wordLocations, puzzle.width, puzzle.height);
  const numberMap = new Map<string, number>();
  for (const cell of cells) {
    numberMap.set(`${cell.x},${cell.y}`, cell.number);
  }

  // Calculate cell size: fit grid within usable width, cap height to ~55% of page
  const maxGridHeight = USABLE_HEIGHT * 0.50;
  const maxGridWidth = USABLE_WIDTH * 0.85; // leave some horizontal breathing room
  const cellSize = Math.min(
    Math.floor(maxGridWidth / puzzle.width),
    Math.floor(maxGridHeight / puzzle.height),
    30 // cap so small grids don't look oversized
  );

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
        doc.setFillColor(0, 0, 0);
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
        if (num !== undefined) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(6);
          doc.setTextColor(100, 100, 100);
          doc.text(String(num), cellX + 1.5, cellY + 6.5);
        }

        // Answer letter
        if (showAnswers) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(11);
          doc.setTextColor(0, 0, 0);
          const letterText = letter.toUpperCase();
          const letterWidth = doc.getTextWidth(letterText);
          doc.text(letterText, cellX + (cellSize - letterWidth) / 2, cellY + cellSize * 0.65);
        }
      }
    }
  }

  // Outer border (thicker)
  doc.setLineWidth(1.5);
  doc.rect(gridX, startY, gridWidth, gridHeight, 'S');

  return { bottomY: startY + gridHeight };
}

function renderClues(doc: jsPDF, puzzle: CrosswordResult, startY: number): void {
  const { acrossClues, downClues } = assignNumbers(
    puzzle.wordLocations, puzzle.width, puzzle.height
  );

  const columnWidth = (USABLE_WIDTH - 20) / 2; // 20pt gap between columns
  const leftX = MARGIN;
  const rightX = MARGIN + columnWidth + 20;
  const fontSize = 8.5;
  const lineHeight = 11;

  // Across clues (left column)
  let y = startY;
  y = renderClueColumn(doc, 'Across', acrossClues, leftX, y, columnWidth, fontSize, lineHeight);

  // Down clues (right column)
  renderClueColumn(doc, 'Down', downClues, rightX, startY, columnWidth, fontSize, lineHeight);
}

function renderClueColumn(
  doc: jsPDF,
  title: string,
  clues: { number: number; clue: string }[],
  x: number,
  startY: number,
  columnWidth: number,
  fontSize: number,
  lineHeight: number
): number {
  let y = startY;

  // Column header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text(title.toUpperCase(), x, y + 8);
  y += 4;
  doc.setLineWidth(0.5);
  doc.line(x, y + 6, x + columnWidth, y + 6);
  y += 12;

  // Clue items
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(fontSize);

  for (const clue of clues) {
    const numberText = `${clue.number}. `;
    const numberWidth = doc.getTextWidth(numberText);
    const clueTextWidth = columnWidth - numberWidth;

    // Word-wrap the clue text
    const lines = doc.splitTextToSize(clue.clue, clueTextWidth);

    // Check if we'd overflow the page
    if (y + lines.length * lineHeight > PAGE_HEIGHT - MARGIN) {
      // Stop rendering clues — they don't fit
      doc.setFontSize(7);
      doc.setTextColor(120, 120, 120);
      doc.text('(continued...)', x, y + 8);
      break;
    }

    // Number
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(fontSize);
    doc.setTextColor(0, 0, 0);
    doc.text(numberText, x, y + lineHeight * 0.75);

    // Clue text (may be multi-line)
    doc.setFont('helvetica', 'normal');
    for (let i = 0; i < lines.length; i++) {
      doc.text(lines[i], x + numberWidth, y + lineHeight * 0.75 + i * lineHeight);
    }

    y += lines.length * lineHeight + 1;
  }

  return y;
}
