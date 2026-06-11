/**
 * Static word search views for the Generate tab result panel.
 *
 * A word search shows every letter by nature — there is nothing to hide.
 * "Show answers" therefore means: circle the placed words, exactly like
 * the printed answer key (same WordCircleOverlay the play grid and print
 * pipeline use). The word bank below mirrors what a student gets on
 * paper: the words to find, alphabetical, no crossword numbering.
 */

import { useMemo } from 'react';
import type { CrosswordResult } from '../../logic/types';
import { WordCircleOverlay } from './WordCircleOverlay';
import {
  GRID_PAN,
  GRID_PAGE,
  GRID_FRAME,
  CELL_BASE,
  CELL_PAPER,
  CELL_LETTER,
  LETTER_FONT_SIZE,
  gridSizingStyle,
} from './gridStyles';

interface WordSearchPreviewGridProps {
  puzzle: CrosswordResult;
  /** Circle the placed words (answer key view). Letters always show. */
  showCircles: boolean;
}

export function WordSearchPreviewGrid({ puzzle, showCircles }: WordSearchPreviewGridProps) {
  return (
    <div className={GRID_PAN}>
      <div className={GRID_PAGE}>
        <div
          role="grid"
          aria-label={`Word search grid, ${puzzle.width} by ${puzzle.height}${showCircles ? ', answers circled' : ''}`}
          className={`relative ${GRID_FRAME}`}
          style={gridSizingStyle(puzzle.width, 26, 44)}
        >
          {puzzle.grid.map((row, y) =>
            row.map((cell, x) => (
              <div key={`${x},${y}`} role="gridcell" className={`${CELL_BASE} ${CELL_PAPER}`}>
                <span className={CELL_LETTER} style={{ fontSize: LETTER_FONT_SIZE }}>
                  {cell}
                </span>
              </div>
            ))
          )}

          {showCircles && (
            <WordCircleOverlay
              words={puzzle.wordLocations}
              gridWidth={puzzle.width}
              gridHeight={puzzle.height}
            />
          )}
        </div>
      </div>
    </div>
  );
}

interface WordBankPanelProps {
  puzzle: CrosswordResult;
}

/** The find-these-words list — what replaces crossword clues for a word search. */
export function WordBankPanel({ puzzle }: WordBankPanelProps) {
  const words = useMemo(
    () =>
      puzzle.wordLocations
        .map(wl => (wl.displayWord ?? wl.word).toUpperCase())
        .sort((a, b) => a.localeCompare(b)),
    [puzzle],
  );

  const hasTwoWordAnswers = puzzle.wordLocations.some(w => w.displayWord);

  return (
    <div className="warm-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="section-label">
          Word Bank
        </h3>
        <span className="text-xs font-mono text-stone-400 dark:text-stone-500">
          {words.length} {words.length === 1 ? 'word' : 'words'}
        </span>
      </div>
      <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-1.5">
        {words.map(word => (
          <li key={word} className="text-sm font-medium tracking-wide text-stone-700 dark:text-stone-300">
            {word}
          </li>
        ))}
      </ul>
      {hasTwoWordAnswers && (
        <p className="mt-3 text-xs text-stone-400 dark:text-stone-500 italic">
          Two-word entries hide in the grid without their space.
        </p>
      )}
    </div>
  );
}
