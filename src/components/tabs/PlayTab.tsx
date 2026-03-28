/**
 * Play tab — interactive puzzle solving experience.
 *
 * Routes to either:
 * - Crossword mode: typing letters, checking, revealing, hints, undo/redo
 * - Word search mode: finding words by selecting start/end cells
 */

import { useMemo, useEffect, useState, useCallback } from 'react';
import type { CrosswordResult, PuzzleMode } from '../../logic/types';
import { PlayableGrid } from '../grid/PlayableGrid';
import { WordSearchGrid } from '../grid/WordSearchGrid';
import { usePuzzleState } from '../../hooks/usePuzzleState';
import { assignNumbers } from '../../logic/numbering';
import type { NumberedClue } from '../../logic/numbering';

interface PlayTabProps {
  puzzle: CrosswordResult;
  puzzleMode: PuzzleMode;
}

function formatTime(seconds: number): { mins: string; secs: string } {
  const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
  const secs = String(seconds % 60).padStart(2, '0');
  return { mins, secs };
}

export function PlayTab({ puzzle, puzzleMode }: PlayTabProps) {
  if (puzzleMode === 'wordsearch') {
    return <WordSearchGrid puzzle={puzzle} />;
  }
  return <CrosswordPlayView puzzle={puzzle} />;
}

function CrosswordPlayView({ puzzle }: { puzzle: CrosswordResult }) {
  const state = usePuzzleState(puzzle);
  const highlighted = state.highlightedCells();
  const [shakingCells, setShakingCells] = useState<Set<string>>(new Set());

  const handleCheck = useCallback(() => {
    state.checkPuzzle();
    // After checkPuzzle runs, checkedCells will update on next render.
    // We read from the puzzle directly to find incorrect cells.
    const incorrect = new Set<string>();
    for (let y = 0; y < puzzle.height; y++) {
      for (let x = 0; x < puzzle.width; x++) {
        if (puzzle.grid[y][x] === '-') continue;
        const userLetter = state.userGrid[y]?.[x] ?? '';
        if (userLetter === '') continue;
        if (userLetter.toLowerCase() !== puzzle.grid[y][x].toLowerCase()) {
          incorrect.add(x + ',' + y);
        }
      }
    }
    if (incorrect.size > 0) {
      setShakingCells(incorrect);
      setTimeout(() => setShakingCells(new Set()), 300);
    }
  }, [state.checkPuzzle, state.userGrid, puzzle]);

  const { acrossClues, downClues } = useMemo(() => {
    return assignNumbers(puzzle.wordLocations, puzzle.width, puzzle.height);
  }, [puzzle]);

  // Global keyboard shortcuts
  useEffect(() => {
    function handleGlobalKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          state.redo();
        } else {
          state.undo();
        }
      }
      if (e.key === 'Escape') {
        state.deselectCell();
      }
    }
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [state.undo, state.redo, state.deselectCell]);

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

  const activeClueText = useMemo(() => {
    if (activeClueNumber === null) return null;
    const clues = state.isAcross ? acrossClues : downClues;
    const clue = clues.find(c => c.number === activeClueNumber);
    if (!clue) return null;
    return `${activeClueNumber} ${state.isAcross ? 'Across' : 'Down'}: ${clue.clue}`;
  }, [activeClueNumber, state.isAcross, acrossClues, downClues]);

  return (
    <div className="animate-fade-in">
      {/* Completion celebration */}
      {state.isComplete && !state.revealedCells.size && (
        <div className="mb-6 p-6 rounded-2xl bg-gradient-to-br from-primary-50 via-primary-50 to-accent-50 dark:from-primary-d/40 dark:via-primary-d/30 dark:to-accent-d/20 border border-primary-200/60 dark:border-primary-800/40 text-center animate-slide-up relative overflow-hidden">
          {/* Confetti particles */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/3 w-2 h-2 rounded-sm bg-primary-400 animate-confetti-1" />
            <div className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full bg-accent-400 animate-confetti-2" />
            <div className="absolute top-1/2 left-2/3 w-1.5 h-1.5 rounded-sm bg-primary-300 animate-confetti-3" />
            <div className="absolute top-1/2 left-1/4 w-1.5 h-1.5 rounded-full bg-accent-300 animate-confetti-2" style={{ animationDelay: '0.1s' }} />
            <div className="absolute top-1/2 left-3/4 w-2 h-2 rounded-sm bg-primary-500 animate-confetti-1" style={{ animationDelay: '0.15s' }} />
          </div>

          <div className="relative z-10">
            <div className="animate-completion-icon inline-block mb-3">
              <div className="w-14 h-14 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center mx-auto animate-completion-pulse">
                <svg className="w-7 h-7 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-primary-800 dark:text-primary-200 font-bold text-xl">
              Puzzle Complete!
            </p>
            <p className="text-primary-600 dark:text-primary-400 text-sm mt-1.5">
              Solved in {formatTime(state.elapsedSeconds).mins}:{formatTime(state.elapsedSeconds).secs}
              {state.hintsUsed > 0 && (
                <span className="text-stone-400 dark:text-stone-500 ml-2">
                  ({state.hintsUsed} hint{state.hintsUsed !== 1 ? 's' : ''} used)
                </span>
              )}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Grid + Controls */}
        <div className="flex-shrink-0">
          {/* Timer and controls bar */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-lg font-semibold text-stone-700 dark:text-stone-300 tabular-nums">
                  <span>{formatTime(state.elapsedSeconds).mins}</span>
                  <span className={state.isTimerRunning ? 'animate-timer-blink' : ''}>:</span>
                  <span>{formatTime(state.elapsedSeconds).secs}</span>
                </span>
                {state.isTimerRunning && (
                  <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
                )}
              </div>
              {/* Progress */}
              <div className="flex items-center gap-1.5">
                <div className="w-16 h-1.5 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-500 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${state.totalCount > 0 ? (state.filledCount / state.totalCount) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-xs text-stone-400 dark:text-stone-500 font-mono tabular-nums">
                  {state.filledCount}/{state.totalCount}{' '}
                  {Math.round((state.filledCount / state.totalCount) * 100)}%
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={state.hintCell}
                disabled={!state.selectedCell}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium
                           border border-primary-300 dark:border-primary-700
                           text-primary-700 dark:text-primary-400
                           hover:bg-primary-50 dark:hover:bg-primary-d/30
                           disabled:opacity-30 disabled:cursor-not-allowed
                           transition-colors btn-lift"
                title="Reveal this cell (+15s penalty)"
              >
                <svg className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                </svg>
                Hint
              </button>
              <button
                onClick={handleCheck}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium
                           border border-stone-300 dark:border-stone-600
                           text-stone-600 dark:text-stone-400
                           hover:bg-stone-50 dark:hover:bg-surface-dark-hover
                           transition-colors btn-lift"
              >
                Check
              </button>
              {state.checkedCells.size > 0 && (
                <button
                  onClick={state.clearIncorrect}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium
                             border border-orange-300 dark:border-orange-700
                             text-orange-700 dark:text-orange-400
                             hover:bg-orange-50 dark:hover:bg-orange-950/20
                             transition-colors btn-lift animate-scale-in"
                >
                  Clear Wrong
                </button>
              )}
              <button
                onClick={state.revealPuzzle}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium
                           border border-accent-300 dark:border-accent-700
                           text-accent-700 dark:text-accent-400
                           hover:bg-accent-50 dark:hover:bg-accent-950/30
                           transition-colors btn-lift"
              >
                Reveal
              </button>
              <button
                onClick={state.resetPuzzle}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium
                           border border-stone-300 dark:border-stone-600
                           text-stone-600 dark:text-stone-400
                           hover:bg-stone-50 dark:hover:bg-surface-dark-hover
                           transition-colors btn-lift"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Direction + keyboard hints */}
          {state.selectedCell && (
            <div className="mb-3 flex items-center gap-3 text-xs text-stone-400 dark:text-stone-500">
              <span>
                Typing: <span className="font-medium text-primary-600 dark:text-primary-400">{state.isAcross ? 'Across' : 'Down'}</span>
              </span>
              <span className="text-stone-300 dark:text-stone-600">|</span>
              <span>
                <kbd className="px-1 py-0.5 bg-stone-100 dark:bg-stone-800 rounded text-[10px] font-mono border border-stone-200 dark:border-stone-700">Space</kbd> switch
              </span>
              <span>
                <kbd className="px-1 py-0.5 bg-stone-100 dark:bg-stone-800 rounded text-[10px] font-mono border border-stone-200 dark:border-stone-700">Ctrl+Z</kbd> undo
              </span>
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
              shakingCells={shakingCells}
              onCellClick={state.selectCell}
              onLetterInput={state.enterLetter}
              onDelete={state.deleteLetter}
              onMove={state.moveSelection}
            />
          </div>

          {/* Active clue display below grid */}
          {activeClueText && (
            <div className="mt-3 px-3 py-2 rounded-lg bg-primary-50/50 dark:bg-primary-d/20 border border-primary-100 dark:border-primary-800/30">
              <p className="text-sm text-primary-800 dark:text-primary-300">
                {activeClueText}
              </p>
            </div>
          )}

          {/* Screen reader clue announcement */}
          {activeClueText && (
            <div aria-live="polite" className="sr-only">{activeClueText}</div>
          )}
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
    <div className="warm-card p-4">
      <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 mb-3 uppercase tracking-wider">
        {title}
      </h3>
      {clues.length === 0 ? (
        <p className="text-sm text-stone-400 italic">No {title.toLowerCase()} clues</p>
      ) : (
        <ol className="space-y-1">
          {clues.map((clue) => {
            const isActive = clue.number === activeNumber;
            return (
              <li
                key={clue.number}
                onClick={() => onClueClick(clue)}
                className={`
                  flex gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-all duration-150
                  ${isActive
                    ? 'bg-primary-50 dark:bg-primary-d/40 border-l-[3px] border-l-primary-500 border-y border-r border-y-primary-200 border-r-primary-200 dark:border-y-primary-800/40 dark:border-r-primary-800/40'
                    : 'hover:bg-stone-50 dark:hover:bg-surface-dark-hover border border-transparent'
                  }
                `}
              >
                <span className={`flex-shrink-0 text-sm font-semibold w-6 text-right tabular-nums
                  ${isActive ? 'text-primary-700 dark:text-primary-400' : 'text-stone-400 dark:text-stone-500'}`}>
                  {clue.number}.
                </span>
                <span className={`text-sm leading-relaxed ${isActive ? 'text-stone-800 dark:text-stone-200' : 'text-stone-600 dark:text-stone-400'}`}>
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
