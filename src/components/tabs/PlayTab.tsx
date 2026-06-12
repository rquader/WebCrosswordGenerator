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
import { usePuzzleState, HINT_BUDGET, canUseHint } from '../../hooks/usePuzzleState';
import { CompletionConfetti } from '../CompletionConfetti';
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
  const [hasCheckErrors, setHasCheckErrors] = useState(false);

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
      // Echo the error beyond the grid: the progress strip shudders too
      setHasCheckErrors(true);
      setTimeout(() => setHasCheckErrors(false), 600);
    }
  }, [state.checkPuzzle, state.userGrid, puzzle]);

  const hintsLeft = HINT_BUDGET - state.hintsUsed;
  const hintsAvailable = canUseHint(state.hintsUsed);

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
      {/* Completion — a quiet editorial moment, not a popup */}
      {state.isComplete && !state.revealedCells.size && (
        <div className="mb-6 px-6 py-8 warm-card text-center animate-slide-up relative overflow-hidden">
          <CompletionConfetti />

          <div className="relative z-10">
            <p className="font-display text-4xl text-ink" style={{ fontVariationSettings: "'SOFT' 40" }}>
              Solved.
            </p>
            <div className="mx-auto mt-3 mb-2.5 w-10 border-t-2 border-rubric" aria-hidden="true" />
            <p className="text-ink-2 text-sm tabular-nums">
              {formatTime(state.elapsedSeconds).mins}:{formatTime(state.elapsedSeconds).secs}
              {state.hintsUsed > 0 && (
                <span className="text-ink-3">
                  {' '}&middot; {state.hintsUsed} hint{state.hintsUsed !== 1 ? 's' : ''}
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
              {/* Progress — the bar fills as you type, the count is letters
                  that are actually RIGHT, so guessing can't inflate it. */}
              <div className={`flex items-center gap-1.5 ${hasCheckErrors ? 'cell-shake' : ''}`}>
                <div className="w-16 h-1.5 bg-well rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-accent rounded-full transition-all duration-300 ease-out
                      ${state.correctCount === state.totalCount && state.totalCount > 0 ? 'animate-completion-pulse' : ''}`}
                    style={{ width: `${state.totalCount > 0 ? (state.filledCount / state.totalCount) * 100 : 0}%` }}
                  />
                </div>
                <span
                  className="text-xs text-ink-3 font-mono tabular-nums"
                  title="Letters correct so far"
                >
                  {state.correctCount}/{state.totalCount}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={state.hintCell}
                disabled={!state.selectedCell || !hintsAvailable}
                className="btn-ghost btn-sm text-rubric hover:bg-rubric/10 hover:text-rubric"
                title={hintsAvailable ? 'Reveal this letter (+15s)' : 'No hints left'}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                </svg>
                Hint
              </button>
              <button
                onClick={state.hintWord}
                disabled={!state.selectedCell || !hintsAvailable}
                className="btn-ghost btn-sm text-rubric hover:bg-rubric/10 hover:text-rubric"
                title={hintsAvailable ? 'Reveal the whole word (+45s)' : 'No hints left'}
              >
                Hint word
              </button>
              <span
                className="text-[11px] text-ink-3 font-mono tabular-nums -ml-0.5 mr-1"
                title={`${hintsLeft} of ${HINT_BUDGET} hints left`}
                aria-label={`${hintsLeft} of ${HINT_BUDGET} hints left`}
              >
                {hintsLeft}/{HINT_BUDGET}
              </span>
              <button onClick={handleCheck} className="btn-secondary btn-sm">
                Check
              </button>
              {state.checkedCells.size > 0 && (
                <button
                  onClick={state.clearIncorrect}
                  className="btn-ghost btn-sm text-warn hover:bg-warn/10 hover:text-warn
                             animate-scale-in"
                >
                  Clear wrong
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

          {/* Active clue — inline on desktop, pinned above the thumb zone on
              phones so the clue stays visible while typing into the grid. */}
          {activeClueText && (
            <>
              <div className="hidden lg:block mt-3 note">
                <p className="text-sm text-ink">
                  {activeClueText}
                </p>
              </div>
              <div className="lg:hidden fixed bottom-3 inset-x-3 z-30 rounded-md border border-line
                              border-l-2 border-l-rubric bg-card shadow-raise px-3 py-2 animate-slide-up">
                <p className="text-sm text-ink">
                  {activeClueText}
                </p>
              </div>
            </>
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
