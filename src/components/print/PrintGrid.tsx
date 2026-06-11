/**
 * Print-optimized crossword grid.
 *
 * Pure black & white, no animations, no dark mode, no Tailwind color utilities.
 * Designed to render cleanly on paper at any printer resolution.
 *
 * This is intentionally separate from CrosswordGrid.tsx — the display grid
 * uses warm colors, animations, and dark mode. Print needs none of that.
 */

import { useMemo } from 'react';
import type { CrosswordResult } from '../../logic/types';
import { assignNumbers } from '../../logic/numbering';

interface PrintGridProps {
  puzzle: CrosswordResult;
  showAnswers: boolean;
  /**
   * The cell size the caller's wrapper width works out to, in px.
   * Type scales from this so letters and numbers fit any grid density
   * (the print page uses ~18-40px cells, the preview can go down to ~13px).
   */
  cellSizePx: number;
}

const EMPTY_CELL = '-';

export function PrintGrid({ puzzle, showAnswers, cellSizePx }: PrintGridProps) {
  const numberMap = useMemo(() => {
    const { cells } = assignNumbers(puzzle.wordLocations, puzzle.width, puzzle.height);
    const map = new Map<string, number>();
    for (const cell of cells) {
      map.set(`${cell.x},${cell.y}`, cell.number);
    }
    return map;
  }, [puzzle]);

  const letterSize = Math.min(12, Math.max(6, Math.round(cellSizePx * 0.68)));
  const numberSize = Math.min(7, Math.max(4, Math.round(cellSizePx * 0.39)));

  return (
    // display: grid (not inline-grid) — the grid must fill its wrapper's
    // definite width. An inline-grid shrink-to-fits its content, and blank
    // student cells have none (numbers are absolutely positioned), so every
    // 1fr track collapsed to border width and the preview showed a tiny grid.
    // minmax(0, 1fr) keeps tracks even — plain 1fr min-sizes to the widest
    // letter, which skewed answer-key columns.
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${puzzle.width}, minmax(0, 1fr))`,
        border: '2px solid #000',
        lineHeight: 1,
      }}
    >
      {puzzle.grid.map((row, y) =>
        row.map((cell, x) => {
          const isEmpty = cell === EMPTY_CELL;
          const cellNumber = numberMap.get(`${x},${y}`);

          return (
            <div
              key={`${x}-${y}`}
              style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '1',
                backgroundColor: isEmpty ? '#000' : '#fff',
                border: '0.5px solid #000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                // Content must never set the row height — only aspect-ratio.
                // Without this, letter line boxes stretch rows on dense grids.
                overflow: 'hidden',
              }}
            >
              {cellNumber !== undefined && (
                <span
                  style={{
                    position: 'absolute',
                    top: '1px',
                    left: '2px',
                    fontSize: `${numberSize}px`,
                    fontWeight: 600,
                    color: '#555',
                    lineHeight: 1,
                  }}
                >
                  {cellNumber}
                </span>
              )}

              {!isEmpty && showAnswers && (
                <span
                  style={{
                    fontSize: `${letterSize}px`,
                    fontWeight: 700,
                    color: '#000',
                    textTransform: 'uppercase',
                    userSelect: 'none',
                    lineHeight: 1,
                  }}
                >
                  {cell}
                </span>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
