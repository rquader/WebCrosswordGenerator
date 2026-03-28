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

import type { CrosswordResult } from '../logic/types';
import { assignNumbers } from '../logic/numbering';

/**
 * Export the puzzle as a JSON file.
 * Includes the grid, word locations, clues, and metadata.
 */
export function exportAsJson(puzzle: CrosswordResult, filename: string = 'crossword.json'): void {
  const { acrossClues, downClues } = assignNumbers(
    puzzle.wordLocations, puzzle.width, puzzle.height
  );

  const data = {
    version: 1,
    width: puzzle.width,
    height: puzzle.height,
    grid: puzzle.grid,
    clues: {
      across: acrossClues.map(c => ({
        number: c.number,
        clue: c.clue,
        answer: c.word,
      })),
      down: downClues.map(c => ({
        number: c.number,
        clue: c.clue,
        answer: c.word,
      })),
    },
    wordLocations: puzzle.wordLocations,
  };

  downloadFile(JSON.stringify(data, null, 2), filename, 'application/json');
}

/**
 * Trigger the browser's print dialog.
 * The print stylesheet (in index.css) handles formatting.
 */
export function printPuzzle(): void {
  window.print();
}

/**
 * Render the puzzle grid to a canvas and download as PNG.
 * This is a pure canvas implementation — no external libraries.
 */
export function exportAsPng(
  puzzle: CrosswordResult,
  showAnswers: boolean,
  filename: string = 'crossword.png'
): void {
  const { cells } = assignNumbers(puzzle.wordLocations, puzzle.width, puzzle.height);
  const numberMap = new Map<string, number>();
  for (const cell of cells) {
    numberMap.set(cell.x + ',' + cell.y, cell.number);
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

      if (!isEmpty) {
        // Cell number
        const num = numberMap.get(x + ',' + y);
        if (num !== undefined) {
          ctx.fillStyle = '#71717a';
          ctx.font = '10px system-ui, sans-serif';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.fillText(String(num), cellX + 3, cellY + 3);
        }

        // Letter
        if (showAnswers) {
          ctx.fillStyle = '#18181b';
          ctx.font = 'bold 18px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(letter.toUpperCase(), cellX + cellSize / 2, cellY + cellSize / 2 + 1);
        }
      }
    }
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
    link.download = filename;
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
