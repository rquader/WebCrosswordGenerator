/**
 * Play tab — interactive puzzle solving experience.
 *
 * Routes to either:
 * - Crossword mode: typing letters, checking, revealing, hints, undo/redo
 * - Word search mode: finding words by selecting start/end cells
 */

import { useMemo, useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { CrosswordResult, PuzzleMode } from '../../logic/types';
import { PlayableGrid } from '../grid/PlayableGrid';
import type { PlayableGridHandle } from '../grid/PlayableGrid';
import { WordSearchGrid } from '../grid/WordSearchGrid';
import { PlayBar } from '../play/PlayBar';
import { PlayToolsSheet } from '../play/PlayToolsSheet';
import { usePuzzleState, HINT_BUDGET, canUseHint } from '../../hooks/usePuzzleState';
import { useVisualViewport } from '../../hooks/useVisualViewport';
import { useMediaQuery, PLAY_COMPACT_QUERY } from '../../hooks/useMediaQuery';
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

/** One-time flag: has the solver seen the touch orientation cue (P5)? */
const TOUCH_CUE_KEY = 'crossword-touch-cue-seen';

function hasSeenTouchCue(): boolean {
  try {
    return localStorage.getItem(TOUCH_CUE_KEY) === '1';
  } catch {
    return true; // no storage — don't nag
  }
}

function markTouchCueSeen(): void {
  try {
    localStorage.setItem(TOUCH_CUE_KEY, '1');
  } catch {
    // best effort
  }
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

  // Mobile/tablet play chrome: the keyboard-aware play bar + tools sheet.
  // Gated to compact widths so desktop play is untouched.
  const isCompact = useMediaQuery(PLAY_COMPACT_QUERY);
  const { keyboardOffset } = useVisualViewport();
  const [toolsOpen, setToolsOpen] = useState(false);
  // P10 — a short margin-note summary of the last Check ("2 squares to fix" /
  // "No mistakes so far"). A snapshot, cleared as soon as the solver edits.
  const [checkSummary, setCheckSummary] = useState<{ tone: 'warn' | 'info'; text: string } | null>(null);
  const gridHandle = useRef<PlayableGridHandle>(null);
  const completionRef = useRef<HTMLDivElement>(null);

  // P5 — one-time touch orientation cue, shown on compact widths before the
  // solver has typed anything, then retired for good once they engage.
  const [touchCueSeen, setTouchCueSeen] = useState(hasSeenTouchCue);
  const showTouchCue = isCompact && !touchCueSeen && state.filledCount === 0;

  // Closing the tools sheet returns focus to the grid's hidden input (so the
  // soft keyboard comes back) without a scroll jump.
  const closeTools = useCallback(() => {
    setToolsOpen(false);
    gridHandle.current?.focusInput();
  }, []);

  // P3 — keep the active square visible on compact widths. scrollIntoView with
  // 'nearest' (inside the grid handle) is a no-op when the square is already on
  // screen, so typing within a visible word never janks; it only moves the view
  // when a clue tap or the play bar's ‹ › jump lands the cursor off-screen.
  useEffect(() => {
    if (!isCompact || !state.selectedCell) return;
    gridHandle.current?.scrollCellIntoView(state.selectedCell.x, state.selectedCell.y);
  }, [isCompact, state.selectedCell]);

  // The Check summary is a snapshot of one Check; drop it the moment the grid
  // changes (a typed letter, Clear wrong, Reset) so it can never go stale.
  useEffect(() => {
    setCheckSummary(null);
  }, [state.userGrid]);

  // P5 — retire the touch cue for good once the solver enters a letter.
  useEffect(() => {
    if (state.filledCount > 0 && !touchCueSeen) {
      markTouchCueSeen();
      setTouchCueSeen(true);
    }
  }, [state.filledCount, touchCueSeen]);

  // P9 — when the puzzle is solved, bring the "Solved" card into view (the
  // grid can be tall on mobile, so the card may be off-screen). Reduced-motion
  // safe. Only for an earned solve, not a full Reveal (the card hides then).
  useEffect(() => {
    if (state.isComplete && state.revealedCells.size === 0) {
      const reduce = typeof window !== 'undefined'
        && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      completionRef.current?.scrollIntoView({
        behavior: reduce ? 'auto' : 'smooth',
        block: 'center',
      });
    }
  }, [state.isComplete, state.revealedCells.size]);

  const handleCheck = useCallback(() => {
    state.checkPuzzle();
    // After checkPuzzle runs, checkedCells will update on next render.
    // We read from the puzzle directly to find incorrect cells.
    const incorrect = new Set<string>();
    let firstWrong: { x: number; y: number } | null = null;
    let emptyCount = 0;
    for (let y = 0; y < puzzle.height; y++) {
      for (let x = 0; x < puzzle.width; x++) {
        if (puzzle.grid[y][x] === '-') continue;
        const userLetter = state.userGrid[y]?.[x] ?? '';
        if (userLetter === '') { emptyCount++; continue; }
        if (userLetter.toLowerCase() !== puzzle.grid[y][x].toLowerCase()) {
          incorrect.add(x + ',' + y);
          if (!firstWrong) firstWrong = { x, y };
        }
      }
    }
    if (incorrect.size > 0) {
      setShakingCells(incorrect);
      setTimeout(() => setShakingCells(new Set()), 300);
      // Echo the error beyond the grid: the progress strip shudders too
      setHasCheckErrors(true);
      setTimeout(() => setHasCheckErrors(false), 600);
      setCheckSummary({
        tone: 'warn',
        text: `${incorrect.size} square${incorrect.size === 1 ? '' : 's'} to fix.`,
      });
      // Bring the first wrong square into view so the shake isn't off-screen
      // (matters on mobile, where Check lives in the bottom play bar).
      if (firstWrong) gridHandle.current?.scrollCellIntoView(firstWrong.x, firstWrong.y);
    } else {
      // Nothing wrong among the filled squares.
      setCheckSummary({
        tone: 'info',
        text: emptyCount > 0 ? 'No mistakes so far.' : 'All correct.',
      });
    }
  }, [state.checkPuzzle, state.userGrid, puzzle]);

  const hintsLeft = HINT_BUDGET - state.hintsUsed;
  const hintsAvailable = canUseHint(state.hintsUsed);

  const { acrossClues, downClues } = useMemo(() => {
    return assignNumbers(puzzle.wordLocations, puzzle.width, puzzle.height);
  }, [puzzle]);

  // Global keyboard shortcuts. e.key is 'Z' (uppercase) while Shift is
  // held, so the comparison must be case-insensitive or redo never fires.
  useEffect(() => {
    function handleGlobalKey(e: KeyboardEvent) {
      const key = e.key.toLowerCase();
      if ((e.metaKey || e.ctrlKey) && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          state.redo();
        } else {
          state.undo();
        }
      }
      if ((e.metaKey || e.ctrlKey) && key === 'y') {
        // Windows-style redo
        e.preventDefault();
        state.redo();
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
    // Bottom padding on compact widths reserves room so the grid + clue lists
    // can scroll clear of the fixed PlayBar (which is out of normal flow).
    <div className="animate-fade-in pb-24 lg:pb-0">
      {/* Completion — a quiet editorial moment, not a popup */}
      {state.isComplete && !state.revealedCells.size && (
        <div ref={completionRef} className="mb-6 px-6 py-8 warm-card text-center animate-slide-up relative overflow-hidden">
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

            {/* Tools cluster — desktop only. On compact widths these live in
                the play bar (Check) + tools sheet (hints, undo/redo, reveal,
                clear, reset), so showing them here too would duplicate the UI
                and drive horizontal overflow (P6). The timer + progress above
                stay visible on every width. */}
            <div className="hidden lg:flex items-center gap-1.5">
              <button
                onClick={state.hintCell}
                disabled={!state.selectedCell || !hintsAvailable}
                className="btn-ghost btn-sm text-rubric hover:bg-rubric/10 hover:text-rubric"
                title={hintsAvailable ? 'Reveal this letter (+15s)' : 'No hints left'}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                </svg>
                Hint letter
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
              <button
                onClick={state.undo}
                className="btn-ghost btn-sm px-1.5"
                title="Undo (Ctrl+Z)"
                aria-label="Undo"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                </svg>
              </button>
              <button
                onClick={state.redo}
                className="btn-ghost btn-sm px-1.5"
                title="Redo (Ctrl+Shift+Z)"
                aria-label="Redo"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" />
                </svg>
              </button>
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
                title="Show the full solution (ends the solve)"
              >
                Reveal all
              </button>
              <button onClick={state.resetPuzzle} className="btn-ghost btn-sm">
                Reset
              </button>
            </div>
          </div>

          {/* P5 — one-time touch orientation cue (compact only, before the
              first letter). Margin note with a gentle pulse, reduced-motion
              safe; retires once the solver types. */}
          {showTouchCue && (
            <div className="mb-3 note" role="status">
              <p className="text-sm text-ink">
                <span className="mr-1.5 inline-block w-1.5 h-1.5 rounded-full bg-rubric align-middle
                                 animate-pulse motion-reduce:animate-none" aria-hidden="true" />
                Tap a square to type &middot; tap it again to switch direction.
              </p>
            </div>
          )}

          {/* Direction + keyboard hints — desktop only (physical keyboard). On
              touch these chords don't apply; the cue above orients instead (P5). */}
          {state.selectedCell && (
            <div className="mb-3 hidden lg:flex items-center gap-3 text-xs text-ink-3">
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

          {/* P10 — Check result summary. A margin note, not a colored box: the
              lead-in is colored, the body is ink. Read aloud for screen readers. */}
          {checkSummary && (
            <div
              className={`mb-3 ${checkSummary.tone === 'warn' ? 'note-warn' : 'note'}`}
              aria-live="polite"
            >
              <p className="text-sm text-ink">{checkSummary.text}</p>
            </div>
          )}

          {/* Interactive Grid */}
          <div className="flex justify-center lg:justify-start">
            <PlayableGrid
              ref={gridHandle}
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

          {/* Active clue — inline on desktop. On mobile/tablet the persistent
              PlayBar (below, rendered at view root) shows the clue instead, so
              it can ride above the soft keyboard. */}
          {activeClueText && (
            <div className="hidden lg:block mt-3 note">
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
            onClueClick={(clue) => state.selectCellWithDirection(clue.x, clue.y, true)}
          />
          <PlayClueList
            title="Down"
            clues={downClues}
            activeNumber={!state.isAcross ? activeClueNumber : null}
            onClueClick={(clue) => state.selectCellWithDirection(clue.x, clue.y, false)}
          />
        </div>
        </div>
      </div>

      {/* Mobile/tablet play chrome. Mounted only on compact widths so desktop
          play is untouched. Rendered through a portal to <body> so the fixed
          bar/sheet escape this view's animation/stacking contexts (otherwise
          the grid can paint over them) and always sit above the page. The bar
          lifts above the keyboard via transform. */}
      {isCompact && createPortal(
        <>
          <PlayBar
            clueText={activeClueText}
            isAcross={state.isAcross}
            keyboardOffset={keyboardOffset}
            onToggleDirection={() => state.setIsAcross(!state.isAcross)}
            onPrevClue={() => state.goToAdjacentClue('prev')}
            onNextClue={() => state.goToAdjacentClue('next')}
            onCheck={handleCheck}
            onOpenTools={() => setToolsOpen(true)}
          />
          <PlayToolsSheet
            open={toolsOpen}
            onClose={closeTools}
            hintsLeft={hintsLeft}
            hintBudget={HINT_BUDGET}
            hintsAvailable={hintsAvailable}
            hasSelection={!!state.selectedCell}
            hasChecked={state.checkedCells.size > 0}
            onHintCell={state.hintCell}
            onHintWord={state.hintWord}
            onRevealAll={state.revealPuzzle}
            onClearIncorrect={state.clearIncorrect}
            onReset={state.resetPuzzle}
            onUndo={state.undo}
            onRedo={state.redo}
          />
        </>,
        document.body,
      )}
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
