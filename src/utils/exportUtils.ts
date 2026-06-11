/**
 * Export utilities for crossword puzzles.
 *
 * All exports are generated locally in the browser:
 * - JSON: Serializes puzzle state as a downloadable file
 * - Print: Triggers browser's native print dialog
 * - PNG: Renders the grid to a canvas element and downloads it
 *
 * Zero external calls — everything stays on the user's device.
 */

import type { CrosswordResult, PuzzleMode } from '../logic/types';
import { assignNumbers } from '../logic/numbering';
import { getWordVector } from '../logic/wordSearchGenerator';
import { WORD_CIRCLE_COLORS } from './wordCircleColors';

/**
 * Export the puzzle as a JSON file.
 * Crosswords include numbered across/down clues; word searches include a
 * flat word list (across/down numbering is meaningless there).
 */
export function exportAsJson(
  puzzle: CrosswordResult,
  puzzleMode: PuzzleMode = 'crossword',
  filename?: string
): void {
  if (puzzleMode === 'wordsearch') {
    const data = {
      version: 1,
      mode: 'wordsearch',
      width: puzzle.width,
      height: puzzle.height,
      grid: puzzle.grid,
      words: puzzle.wordLocations.map(wl => ({
        word: wl.displayWord ?? wl.word,
        clue: wl.clue,
        x: wl.x,
        y: wl.y,
        ...getWordVector(wl),
      })),
    };
    downloadFile(JSON.stringify(data, null, 2), filename ?? 'word-search.json', 'application/json');
    return;
  }

  const { acrossClues, downClues } = assignNumbers(
    puzzle.wordLocations, puzzle.width, puzzle.height
  );

  const data = {
    version: 1,
    mode: 'crossword',
    width: puzzle.width,
    height: puzzle.height,
    grid: puzzle.grid,
    clues: {
      across: acrossClues.map(c => ({
        number: c.number,
        clue: c.clue,
        answer: c.displayWord ?? c.word,
      })),
      down: downClues.map(c => ({
        number: c.number,
        clue: c.clue,
        answer: c.displayWord ?? c.word,
      })),
    },
    wordLocations: puzzle.wordLocations,
  };

  downloadFile(JSON.stringify(data, null, 2), filename ?? 'crossword.json', 'application/json');
}

/**
 * Render the puzzle grid to a canvas and download as PNG.
 * This is a pure canvas implementation — no external libraries.
 *
 * Crossword: numbered cells, letters only when showAnswers.
 * Word search: letters always (they ARE the puzzle), no numbers, no cell
 * borders; showAnswers circles every placed word like the answer key.
 */
export function exportAsPng(
  puzzle: CrosswordResult,
  showAnswers: boolean,
  filename?: string,
  puzzleMode: PuzzleMode = 'crossword'
): void {
  const isWordSearch = puzzleMode === 'wordsearch';
  const numberMap = new Map<string, number>();
  if (!isWordSearch) {
    const { cells } = assignNumbers(puzzle.wordLocations, puzzle.width, puzzle.height);
    for (const cell of cells) {
      numberMap.set(cell.x + ',' + cell.y, cell.number);
    }
  }

  const cellSize = 48;
  const padding = 20;
  const canvasWidth = puzzle.width * cellSize + padding * 2;
  const canvasHeight = puzzle.height * cellSize + padding * 2;

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const EMPTY_CELL = '-';

  for (let y = 0; y < puzzle.height; y++) {
    for (let x = 0; x < puzzle.width; x++) {
      const cellX = padding + x * cellSize;
      const cellY = padding + y * cellSize;
      const letter = puzzle.grid[y][x];
      const isEmpty = letter === EMPTY_CELL;

      if (!isWordSearch) {
        // Cell background
        if (isEmpty) {
          ctx.fillStyle = '#1a1a1e';
        } else {
          ctx.fillStyle = '#ffffff';
        }
        ctx.fillRect(cellX, cellY, cellSize, cellSize);

        // Cell border
        ctx.strokeStyle = '#d4d4d8';
        ctx.lineWidth = 1;
        ctx.strokeRect(cellX, cellY, cellSize, cellSize);
      }

      if (!isEmpty) {
        // Cell number (crossword only)
        const num = numberMap.get(x + ',' + y);
        if (num !== undefined) {
          ctx.fillStyle = '#71717a';
          ctx.font = '10px system-ui, sans-serif';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.fillText(String(num), cellX + 3, cellY + 3);
        }

        // Letter
        if (isWordSearch || showAnswers) {
          ctx.fillStyle = '#18181b';
          ctx.font = `${isWordSearch ? '' : 'bold '}18px system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(letter.toUpperCase(), cellX + cellSize / 2, cellY + cellSize / 2 + 1);
        }
      }
    }
  }

  // Answer circles (word search answer key)
  if (isWordSearch && showAnswers) {
    ctx.lineWidth = cellSize * 0.07;
    puzzle.wordLocations.forEach((wl, index) => {
      const { dx, dy } = getWordVector(wl);
      const x0 = padding + (wl.x + 0.5) * cellSize;
      const y0 = padding + (wl.y + 0.5) * cellSize;
      const x1 = padding + (wl.x + (wl.word.length - 1) * dx + 0.5) * cellSize;
      const y1 = padding + (wl.y + (wl.word.length - 1) * dy + 0.5) * cellSize;

      const length = Math.hypot(x1 - x0, y1 - y0) + cellSize * 0.84;
      const height = cellSize * 0.78;

      ctx.save();
      ctx.translate((x0 + x1) / 2, (y0 + y1) / 2);
      ctx.rotate(Math.atan2(y1 - y0, x1 - x0));
      ctx.strokeStyle = WORD_CIRCLE_COLORS[index % WORD_CIRCLE_COLORS.length];
      ctx.beginPath();
      ctx.roundRect(-length / 2, -height / 2, length, height, height / 2);
      ctx.stroke();
      ctx.restore();
    });
  }

  // Outer border
  ctx.strokeStyle = '#18181b';
  ctx.lineWidth = 2;
  ctx.strokeRect(padding, padding, puzzle.width * cellSize, puzzle.height * cellSize);

  // Download
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename ?? (isWordSearch ? 'word-search.png' : 'crossword.png');
    link.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}

/**
 * Helper: trigger a file download from a string.
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
