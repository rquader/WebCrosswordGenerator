/**
 * Play tab — interactive crossword solving experience.
 *
 * Features:
 * - Interactive grid with keyboard navigation
 * - Timer display
 * - Clue panel that highlights the active clue
 * - Check, reveal, and reset buttons
 * - Completion celebration
 */

import { useMemo } from 'react';
import type { CrosswordResult } from '../../logic/types';
import { PlayableGrid } from '../grid/PlayableGrid';
import { usePuzzleState } from '../../hooks/usePuzzleState';
import { assignNumbers } from '../../logic/numbering';
import type { NumberedClue } from '../../logic/numbering';

interface PlayTabProps {
  puzzle: CrosswordResult;
}

/**
 * Format seconds into mm:ss display.
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
}

export function PlayTab({ puzzle }: PlayTabProps) {
  const state = usePuzzleState(puzzle);

  const highlighted = state.highlightedCells();

  const { acrossClues, downClues } = useMemo(() => {
    return assignNumbers(puzzle.wordLocations, puzzle.width, puzzle.height);
  }, [puzzle]);

  // Find the active clue based on selected cell
  const activeClueNumber = useMemo(() => {
    if (!state.selectedCell) return null;

    const allClues = state.isAcross ? acrossClues : downClues;
    for (const clue of allClues) {
      const wordLen = clue.word.length;
      if (clue.isHorizontal) {
        if (state.selectedCell.y === clue.y &&
            state.selectedCell.x >= clue.x &&
            state.selectedCell.x < clue.x + wordLen) {
          return clue.number;
        }
      } else {
        if (state.selectedCell.x === clue.x &&
            state.selectedCell.y >= clue.y &&
            state.selectedCell.y < clue.y + wordLen) {
          return clue.number;
        }
      }
    }
    return null;
  }, [state.selectedCell, state.isAcross, acrossClues, downClues]);

  return (
    <div className="animate-fade-in">
      {/* Completion banner */}
      {state.isComplete && !state.revealedCells.size && (
        <div className="mb-6 p-4 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800/50 text-center animate-slide-up">
          <p className="text-green-800 dark:text-green-300 font-semibold text-lg">
            Puzzle Complete!
          </p>
          <p className="text-green-600 dark:text-green-400 text-sm mt-1">
            Solved in {formatTime(state.elapsedSeconds)}
          </p>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Grid + Controls */}
        <div className="flex-shrink-0">
          {/* Timer and controls bar */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="font-mono text-lg font-semibold text-stone-700 dark:text-stone-300 tabular-nums">
                {formatTime(state.elapsedSeconds)}
              </span>
              {state.isTimerRunning && (
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={state.checkPuzzle}
                className="px-3 py-1.5 rounded-lg text-xs font-medium
                           border border-stone-300 dark:border-stone-600
                           text-stone-600 dark:text-stone-400
                           hover:bg-stone-50 dark:hover:bg-stone-800
                           transition-colors"
              >
                Check
              </button>
              <button
                onClick={state.revealPuzzle}
                className="px-3 py-1.5 rounded-lg text-xs font-medium
                           border border-accent-300 dark:border-accent-700
                           text-accent-700 dark:text-accent-400
                           hover:bg-accent-50 dark:hover:bg-accent-950/30
                           transition-colors"
              >
                Reveal
              </button>
              <button
                onClick={state.resetPuzzle}
                className="px-3 py-1.5 rounded-lg text-xs font-medium
                           border border-stone-300 dark:border-stone-600
                           text-stone-600 dark:text-stone-400
                           hover:bg-stone-50 dark:hover:bg-stone-800
                           transition-colors"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Direction indicator */}
          {state.selectedCell && (
            <div className="mb-3 text-xs text-stone-400 dark:text-stone-500">
              Typing: <span className="font-medium text-primary-600 dark:text-primary-400">{state.isAcross ? 'Across' : 'Down'}</span>
              <span className="ml-2 text-stone-300 dark:text-stone-600">click cell again to switch</span>
            </div>
          )}

          {/* Interactive Grid */}
          <div className="flex justify-center lg:justify-start">
            <PlayableGrid
              puzzle={puzzle}
              userGrid={state.userGrid}
              selectedCell={state.selectedCell}
              isAcross={state.isAcross}
              checkedCells={state.checkedCells}
              revealedCells={state.revealedCells}
              highlightedCells={highlighted}
              onCellClick={state.selectCell}
              onLetterInput={state.enterLetter}
              onDelete={state.deleteLetter}
              onMove={state.moveSelection}
            />
          </div>
        </div>

        {/* Right: Clues */}
        <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-2 gap-4">
          <PlayClueList
            title="Across"
            clues={acrossClues}
            activeNumber={state.isAcross ? activeClueNumber : null}
            onClueClick={(clue) => {
              state.selectCell(clue.x, clue.y);
              if (!state.isAcross) {
                // Switch to across
                state.selectCell(clue.x, clue.y);
              }
            }}
          />
          <PlayClueList
            title="Down"
            clues={downClues}
            activeNumber={!state.isAcross ? activeClueNumber : null}
            onClueClick={(clue) => {
              state.selectCell(clue.x, clue.y);
              if (state.isAcross) {
                // Switch to down
                state.selectCell(clue.x, clue.y);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}

interface PlayClueListProps {
  title: string;
  clues: NumberedClue[];
  activeNumber: number | null;
  onClueClick: (clue: NumberedClue) => void;
}

function PlayClueList({ title, clues, activeNumber, onClueClick }: PlayClueListProps) {
  return (
    <div className="bg-white dark:bg-surface-dark-alt rounded-xl border border-stone-200 dark:border-stone-700/50 p-4 shadow-card">
      <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 mb-3 uppercase tracking-wider">
        {title}
      </h3>
      {clues.length === 0 ? (
        <p className="text-sm text-stone-400 italic">No {title.toLowerCase()} clues</p>
      ) : (
        <ol className="space-y-1.5">
          {clues.map((clue) => {
            const isActive = clue.number === activeNumber;
            return (
              <li
                key={clue.number}
                onClick={() => onClueClick(clue)}
                className={`
                  flex gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors duration-75
                  ${isActive
                    ? 'bg-primary-50 dark:bg-primary-950/30 border border-primary-200 dark:border-primary-800/50'
                    : 'hover:bg-stone-50 dark:hover:bg-stone-800/50'
                  }
                `}
              >
                <span className={`flex-shrink-0 text-sm font-semibold w-6 text-right
                  ${isActive ? 'text-primary-700 dark:text-primary-400' : 'text-stone-400 dark:text-stone-500'}`}>
                  {clue.number}.
                </span>
                <span className={`text-sm ${isActive ? 'text-stone-800 dark:text-stone-200' : 'text-stone-600 dark:text-stone-400'}`}>
                  {clue.clue}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
