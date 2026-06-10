/**
 * Crossword grid display component (read-only, for Generate + Export tabs).
 *
 * Features:
 * - Print-style treatment (see gridStyles.ts) — paper cells, ink letters
 * - Staggered cell reveal animation on generation
 * - Cell numbers for word starts
 * - Pans inside a scroll frame when wider than the viewport
 */

import { useMemo } from 'react';
import type { CrosswordResult } from '../../logic/types';
import { assignNumbers } from '../../logic/numbering';
import {
  GRID_PAN, GRID_PAGE, GRID_FRAME,
  CELL_BASE, CELL_PAPER, CELL_BLOCKED, CELL_NUMBER, CELL_LETTER,
  gridSizingStyle, NUMBER_FONT_SIZE, LETTER_FONT_SIZE,
} from './gridStyles';

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
    <div className={GRID_PAN}>
      <div className={GRID_PAGE} aria-label="Crossword grid">
        <div
          role="grid"
          className={GRID_FRAME}
          style={gridSizingStyle(puzzle.width, 26, 44)}
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
                  className={`${CELL_BASE} grid-stagger ${isEmpty ? CELL_BLOCKED : CELL_PAPER}`}
                  style={{ animationDelay: `${delay}ms` }}
                >
                  {cellNumber !== undefined && (
                    <span className={CELL_NUMBER} style={{ fontSize: NUMBER_FONT_SIZE }}>
                      {cellNumber}
                    </span>
                  )}

                  {!isEmpty && showAnswers && (
                    <span className={CELL_LETTER} style={{ fontSize: LETTER_FONT_SIZE }}>
                      {cell}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
