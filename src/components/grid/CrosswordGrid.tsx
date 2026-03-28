/**
 * Crossword grid display component (read-only, for Generate + Export tabs).
 *
 * Features:
 * - Staggered cell reveal animation on generation
 * - Warm color palette with noise texture
 * - Cell numbers for word starts
 * - Responsive sizing
 */

import { useMemo } from 'react';
import type { CrosswordResult } from '../../logic/types';
import { assignNumbers } from '../../logic/numbering';

interface CrosswordGridProps {
  puzzle: CrosswordResult;
  showAnswers: boolean;
}

const EMPTY_CELL = '-';

export function CrosswordGrid({ puzzle, showAnswers }: CrosswordGridProps) {
  const { cells: numberedCells } = useMemo(() => {
    return assignNumbers(puzzle.wordLocations, puzzle.width, puzzle.height);
  }, [puzzle]);

  const numberMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const cell of numberedCells) {
      map.set(cell.x + ',' + cell.y, cell.number);
    }
    return map;
  }, [numberedCells]);

  const totalCells = puzzle.width * puzzle.height;

  return (
    <div className="inline-block relative noise-texture rounded-lg" aria-label="Crossword grid">
      <div
        role="grid"
        className="grid gap-0 border-2 border-stone-700 dark:border-stone-500/70 rounded-sm overflow-hidden"
        style={{
          gridTemplateColumns: `repeat(${puzzle.width}, minmax(0, 1fr))`,
        }}
      >
        {puzzle.grid.map((row, y) =>
          row.map((cell, x) => {
            const isEmpty = cell === EMPTY_CELL;
            const cellNumber = numberMap.get(x + ',' + y);
            const cellIndex = y * puzzle.width + x;
            // Stagger: 30ms per cell, max 600ms total
            const delay = Math.min(cellIndex * (600 / totalCells), 600);

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
                  relative w-10 h-10 sm:w-12 sm:h-12
                  border border-grid-border dark:border-grid-border-dark
                  flex items-center justify-center
                  grid-stagger
                  ${isEmpty
                    ? 'bg-grid-blocked dark:bg-grid-blocked-dark'
                    : 'bg-grid-cell dark:bg-grid-cell-dark'
                  }
                `}
                style={{ animationDelay: `${delay}ms` }}
              >
                {cellNumber !== undefined && (
                  <span className="absolute top-0.5 left-1 text-[9px] sm:text-[10px] font-medium leading-none text-stone-500 dark:text-stone-400">
                    {cellNumber}
                  </span>
                )}

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
