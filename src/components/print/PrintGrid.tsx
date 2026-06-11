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
  /** Blocked squares as light gray instead of solid black (saves toner). */
  inkSaver: boolean;
  /** Cell numbers — dropped on the compact answer key where they'd clutter. */
  showNumbers?: boolean;
  /**
   * Word search rendering: no inner cell borders (a printed word search is
   * letters in open space inside one frame), no cell numbers, regular-weight
   * letters. Blocked squares can't occur — every cell holds a letter.
   */
  wordSearch?: boolean;
}

const EMPTY_CELL = '-';

/** Ink-saver blocked-square gray — light enough to save toner, dark enough to read as "blocked". */
export const INK_SAVER_BLOCKED = '#D0D0D0';

export function PrintGrid({ puzzle, showAnswers, cellSizePx, inkSaver, showNumbers = true, wordSearch = false }: PrintGridProps) {
  const numberMap = useMemo(() => {
    if (wordSearch) return new Map<string, number>();
    const { cells } = assignNumbers(puzzle.wordLocations, puzzle.width, puzzle.height);
    const map = new Map<string, number>();
    for (const cell of cells) {
      map.set(`${cell.x},${cell.y}`, cell.number);
    }
    return map;
  }, [puzzle, wordSearch]);

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
        // Word search: the page draws its own frame OUTSIDE this component so
        // the circle overlay can align 1:1 with the borderless cell area.
        border: wordSearch ? 'none' : '2px solid #000',
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
                backgroundColor: isEmpty ? (inkSaver ? INK_SAVER_BLOCKED : '#000') : '#fff',
                border: wordSearch ? 'none' : '0.5px solid #000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                // Content must never set the row height — only aspect-ratio.
                // Without this, letter line boxes stretch rows on dense grids.
                overflow: 'hidden',
              }}
            >
              {cellNumber !== undefined && showNumbers && (
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
                    fontWeight: wordSearch ? 500 : 700,
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
