/**
 * Crossword grid display component.
 *
 * Renders the puzzle grid with:
 * - Filled cells showing letters (in answer mode) or empty (in play mode)
 * - Blocked cells (dark squares) for empty positions
 * - Cell numbers for word starts (standard crossword numbering)
 * - Responsive sizing that adapts to container width
 */

import { useMemo } from 'react';
import type { CrosswordResult } from '../../logic/types';
import { assignNumbers } from '../../logic/numbering';

interface CrosswordGridProps {
  puzzle: CrosswordResult;
  showAnswers: boolean;
}

// The empty cell marker from the generator
const EMPTY_CELL = '-';

export function CrosswordGrid({ puzzle, showAnswers }: CrosswordGridProps) {
  // Compute cell numbers using the numbering utility
  const { cells: numberedCells } = useMemo(() => {
    return assignNumbers(puzzle.wordLocations, puzzle.width, puzzle.height);
  }, [puzzle]);

  // Build a lookup map for cell numbers: "x,y" -> number
  const numberMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const cell of numberedCells) {
      map.set(cell.x + ',' + cell.y, cell.number);
    }
    return map;
  }, [numberedCells]);

  return (
    <div className="inline-block" aria-label="Crossword grid">
      <div
        role="grid"
        className="grid gap-0 border-2 border-stone-800 dark:border-stone-300 rounded-sm"
        style={{
          gridTemplateColumns: `repeat(${puzzle.width}, minmax(0, 1fr))`,
        }}
      >
        {puzzle.grid.map((row, y) =>
          row.map((cell, x) => {
            const isEmpty = cell === EMPTY_CELL;
            const cellNumber = numberMap.get(x + ',' + y);

            let ariaLabel: string;
            if (isEmpty) {
              ariaLabel = 'Blocked cell';
            } else {
              ariaLabel = `Row ${y + 1}, Column ${x + 1}`;
              if (cellNumber !== undefined) {
                ariaLabel += `, number ${cellNumber}`;
              }
              if (showAnswers) {
                ariaLabel += `, letter ${cell.toUpperCase()}`;
              }
            }

            return (
              <div
                key={x + '-' + y}
                role="gridcell"
                aria-label={ariaLabel}
                className={`
                  relative w-10 h-10 sm:w-12 sm:h-12 border border-stone-300 dark:border-stone-600
                  flex items-center justify-center
                  ${isEmpty
                    ? 'bg-stone-800 dark:bg-stone-900'
                    : 'bg-white dark:bg-grid-cell-dark'
                  }
                `}
              >
                {/* Cell number (top-left corner) */}
                {cellNumber !== undefined && (
                  <span className="absolute top-0.5 left-0.5 text-[9px] sm:text-[10px] font-medium leading-none text-stone-500 dark:text-stone-400">
                    {cellNumber}
                  </span>
                )}

                {/* Letter */}
                {!isEmpty && showAnswers && (
                  <span className="text-sm sm:text-base font-semibold text-stone-900 dark:text-stone-100 uppercase select-none">
                    {cell}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
