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
}

const EMPTY_CELL = '-';

export function PrintGrid({ puzzle, showAnswers }: PrintGridProps) {
  const numberMap = useMemo(() => {
    const { cells } = assignNumbers(puzzle.wordLocations, puzzle.width, puzzle.height);
    const map = new Map<string, number>();
    for (const cell of cells) {
      map.set(`${cell.x},${cell.y}`, cell.number);
    }
    return map;
  }, [puzzle]);

  return (
    <div
      style={{
        display: 'inline-grid',
        gridTemplateColumns: `repeat(${puzzle.width}, 1fr)`,
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
              }}
            >
              {cellNumber !== undefined && (
                <span
                  style={{
                    position: 'absolute',
                    top: '1px',
                    left: '2px',
                    fontSize: '7px',
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
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#000',
                    textTransform: 'uppercase',
                    userSelect: 'none',
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
