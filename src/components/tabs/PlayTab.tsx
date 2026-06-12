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
    const twoWordHint = clue.displayWord ? ' (2 words)' : '';
    return `${activeClueNumber} ${state.isAcross ? 'Across' : 'Down'}: ${clue.clue}${twoWordHint}`;
  }, [activeClueNumber, state.isAcross, acrossClues, downClues]);

  return (
    <div className="animate-fade-in">
      {/* Completion celebration */}
      {state.isComplete && !state.revealedCells.size && (
        <div className="mb-6 p-6 warm-card text-center animate-slide-up relative overflow-hidden">
          {/* Confetti in the house palette: ink-red, copper, found-word marker hues */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/3 w-2 h-2 rounded-sm bg-rubric animate-confetti-1" />
            <div className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full bg-ws-teal animate-confetti-2" />
            <div className="absolute top-1/2 left-2/3 w-1.5 h-1.5 rounded-sm bg-ws-amber animate-confetti-3" />
            <div className="absolute top-1/2 left-1/4 w-1.5 h-1.5 rounded-full bg-ws-blue animate-confetti-2" style={{ animationDelay: '0.1s' }} />
            <div className="absolute top-1/2 left-3/4 w-2 h-2 rounded-sm bg-accent animate-confetti-1" style={{ animationDelay: '0.15s' }} />
          </div>

          <div className="relative z-10">
            <div className="animate-completion-icon inline-block mb-3">
              <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center mx-auto animate-completion-pulse">
                <svg className="w-7 h-7 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="font-display text-2xl font-semibold text-ink">
              Puzzle Complete!
            </p>
            <p className="text-ink-2 text-sm mt-1.5">
              Solved in {formatTime(state.elapsedSeconds).mins}:{formatTime(state.elapsedSeconds).secs}
              {state.hintsUsed > 0 && (
                <span className="text-ink-3 ml-2">
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
          {/* Solving desk strip: time and progress on the left, the
              solver's tools on the right — one bound toolbar object. */}
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 mb-4
                          rounded-md border border-line bg-card shadow-paper px-3 py-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-lg font-semibold text-ink tabular-nums">
                  <span>{formatTime(state.elapsedSeconds).mins}</span>
                  <span className={state.isTimerRunning ? 'animate-timer-blink' : ''}>:</span>
                  <span>{formatTime(state.elapsedSeconds).secs}</span>
                </span>
                {state.isTimerRunning && (
                  <span className="w-2 h-2 rounded-full bg-rubric animate-pulse" />
                )}
              </div>
              {/* Progress — ink filling a rule */}
              <div className="flex items-center gap-1.5">
                <div className="w-16 h-1.5 bg-well rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${state.totalCount > 0 ? (state.filledCount / state.totalCount) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-xs text-ink-3 font-mono tabular-nums">
                  {state.filledCount}/{state.totalCount}{' '}
                  {Math.round((state.filledCount / state.totalCount) * 100)}%
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={state.hintCell}
                disabled={!state.selectedCell}
                className="btn-ghost btn-sm text-rubric hover:bg-rubric/10 hover:text-rubric"
                title="Reveal this cell (+15s penalty)"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                </svg>
                Hint
              </button>
              <button onClick={handleCheck} className="btn-secondary btn-sm">
                Check
              </button>
              {state.checkedCells.size > 0 && (
                <button
                  onClick={state.clearIncorrect}
                  className="btn-ghost btn-sm text-amber-700 dark:text-amber-400
                             hover:bg-amber-500/10 hover:text-amber-700 dark:hover:text-amber-400
                             animate-scale-in"
                >
                  Clear Wrong
                </button>
              )}
              <button
                onClick={state.revealPuzzle}
                className="btn-ghost btn-sm text-accent hover:bg-accent/10 hover:text-accent"
              >
                Reveal
              </button>
              <button onClick={state.resetPuzzle} className="btn-ghost btn-sm">
                Reset
              </button>
            </div>
          </div>

          {/* Direction + keyboard hints */}
          {state.selectedCell && (
            <div className="mb-3 flex items-center gap-3 text-xs text-ink-3">
              <span>
                Typing: <span className="font-medium text-rubric">{state.isAcross ? 'Across' : 'Down'}</span>
              </span>
              <span className="text-ink-3/60">|</span>
              <span>
                <kbd className="px-1 py-0.5 bg-well rounded text-[10px] font-mono border border-line">Space</kbd> switch
              </span>
              <span>
                <kbd className="px-1 py-0.5 bg-well rounded text-[10px] font-mono border border-line">Ctrl+Z</kbd> undo
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
            <div className="mt-3 px-3 py-2 rounded-md bg-well border border-line border-l-2 border-l-rubric">
              <p className="text-sm text-ink">
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
        <div className="flex-1 min-w-0 space-y-3">
        {puzzle.wordLocations.some(w => w.displayWord) && (
          <p className="text-xs text-ink-3 italic">
            Answers marked (2 words) are typed without the space.
          </p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
      <h3 className="section-label mb-3">
        {title}
      </h3>
      {clues.length === 0 ? (
        <p className="text-sm text-ink-3 italic">No {title.toLowerCase()} clues</p>
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
                    ? 'bg-well border-l-[3px] border-l-rubric border-y border-r border-y-line border-r-line'
                    : 'hover:bg-well border border-transparent'
                  }
                `}
              >
                <span className={`flex-shrink-0 text-sm font-semibold w-6 text-right tabular-nums
                  ${isActive ? 'text-rubric' : 'text-ink-3'}`}>
                  {clue.number}.
                </span>
                <span className={`text-sm leading-relaxed ${isActive ? 'text-ink' : 'text-ink-2'}`}>
                  {clue.clue}
                  {clue.displayWord && (
                    <span className="ml-1 text-xs text-ink-3" title="The answer is two words — type it without the space">
                      (2 words)
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
