/**
 * Interactive crossword grid for the Play tab.
 *
 * Features:
 * - Click cells to select, click again to toggle direction
 * - Type letters to fill cells (auto-advances)
 * - Cell-pop animation on letter entry
 * - Warm color palette with teal glow on selection
 * - Arrow key navigation, backspace delete
 * - Highlighted word (current across/down word)
 * - Visual feedback for checked cells (blue/orange, not red/green for accessibility)
 * - Revealed cells shown in a distinct color
 *
 * Mobile input: a real but visually-hidden <input> owns text entry. Tapping a
 * cell focuses that input, which is what raises the iOS/Android soft keyboard —
 * a focused non-editable <div> never does. Characters arrive via onInput (works
 * for both soft and physical keyboards); the field is cleared after every
 * keystroke so autocorrect can't accumulate or mangle a word. Navigation keys
 * (arrows, Space-to-toggle, Backspace) stay on the input's onKeyDown so the
 * desktop physical-keyboard experience is unchanged. Character entry lives ONLY
 * in onInput, so a keystroke is never handled twice.
 */

import { useEffect, useRef, useMemo, useCallback, useState } from 'react';
import type { CrosswordResult } from '../../logic/types';
import { assignNumbers } from '../../logic/numbering';
import type { CellPosition } from '../../hooks/usePuzzleState';
import {
  GRID_PAN, GRID_PAGE, GRID_FRAME,
  CELL_BASE, CELL_PAPER, CELL_BLOCKED, CELL_NUMBER,
  gridFitSizingStyle, NUMBER_FONT_SIZE, LETTER_FONT_SIZE,
} from './gridStyles';

const EMPTY_CELL = '-';

interface PlayableGridProps {
  puzzle: CrosswordResult;
  userGrid: string[][];
  selectedCell: CellPosition | null;
  isAcross: boolean;
  checkedCells: Map<string, 'correct' | 'incorrect'>;
  revealedCells: Set<string>;
  highlightedCells: Set<string>;
  shakingCells?: Set<string>;
  onCellClick: (x: number, y: number) => void;
  onLetterInput: (letter: string) => void;
  onDelete: () => void;
  onMove: (direction: 'up' | 'down' | 'left' | 'right') => void;
}

function cellKey(x: number, y: number): string {
  return x + ',' + y;
}

export function PlayableGrid({
  puzzle,
  userGrid,
  selectedCell,
  isAcross,
  checkedCells,
  revealedCells,
  highlightedCells,
  shakingCells,
  onCellClick,
  onLetterInput,
  onDelete,
  onMove,
}: PlayableGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Per-cell DOM refs, keyed by "x,y". Plumbing for a later scrollIntoView
  // fix (keeping the active cell in view) — populated here, not yet consumed.
  const cellRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const [announcement, setAnnouncement] = useState('');
  const [poppedCell, setPoppedCell] = useState<string | null>(null);

  // Cell numbering
  const numberMap = useMemo(() => {
    const { cells } = assignNumbers(puzzle.wordLocations, puzzle.width, puzzle.height);
    const map = new Map<string, number>();
    for (const cell of cells) {
      map.set(cellKey(cell.x, cell.y), cell.number);
    }
    return map;
  }, [puzzle]);

  // Focus the hidden input (NOT the grid div) when a cell is selected. A
  // focused form control is what raises the mobile soft keyboard; a focused
  // div never does. preventScroll keeps loading a shared link from jump-
  // scrolling the page to wherever focus lands. This covers programmatic
  // selection (clue-list taps, shared-link auto-select); a direct cell tap
  // ALSO focuses synchronously in the gesture (see handleCellTap) — iOS is
  // stricter about raising the keyboard outside the gesture handler.
  useEffect(() => {
    if (selectedCell && inputRef.current) {
      inputRef.current.focus({ preventScroll: true });
    }
  }, [selectedCell]);

  // A tap on a lettered cell: select it, then focus the input synchronously
  // within the gesture so iOS reliably raises the keyboard.
  const handleCellTap = useCallback((x: number, y: number) => {
    onCellClick(x, y);
    inputRef.current?.focus({ preventScroll: true });
  }, [onCellClick]);

  // Route a single typed character into the selected cell, with the same
  // cell-pop animation and screen-reader announcement the keyboard path used.
  const commitLetter = useCallback((char: string) => {
    if (!selectedCell) return;
    onLetterInput(char);
    setAnnouncement(`Entered ${char.toUpperCase()}`);
    setPoppedCell(cellKey(selectedCell.x, selectedCell.y));
    setTimeout(() => setPoppedCell(null), 200);
  }, [selectedCell, onLetterInput]);

  // Text entry — the single source of character input for BOTH soft and
  // physical keyboards. Soft keyboards (and desktop typing) fire input events
  // with the inserted text; we take the last character, keep only letters /
  // digits (matches [A-Z] storage; allows Ñ, accented vowels), and clear the
  // field every time so autocorrect/autocomplete can never accumulate a word.
  const handleInput = useCallback((e: React.FormEvent<HTMLInputElement>) => {
    const native = e.nativeEvent as InputEvent;
    const target = e.currentTarget;

    // Deletions from the soft keyboard (Android often reports the backspace
    // here rather than as a keydown) map to delete.
    if (native.inputType && native.inputType.startsWith('delete')) {
      target.value = '';
      onDelete();
      setAnnouncement('Deleted');
      return;
    }

    const value = target.value;
    target.value = ''; // clear immediately — never let the field hold a word
    if (!value) return;

    const lastChar = Array.from(value).pop() ?? '';
    if (lastChar.length === 1 && lastChar.match(/[\p{L}0-9]/u)) {
      commitLetter(lastChar);
    }
  }, [commitLetter, onDelete]);

  // Navigation + control keys. Character entry is intentionally NOT handled
  // here (it lives in handleInput) so a physical keystroke is never entered
  // twice. These keys don't produce text, except Space, which we swallow.
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!selectedCell) return;

    // Shortcut chords are not navigation: let the window-level Ctrl+Z / Ctrl+Y
    // (undo/redo) handler own them instead of swallowing them here.
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    // Spacebar toggles direction (and must not type a space into the field).
    if (e.key === ' ') {
      e.preventDefault();
      onCellClick(selectedCell.x, selectedCell.y);
      return;
    }

    switch (e.key) {
      case 'Backspace':
      case 'Delete':
        // Field is cleared after every keystroke, so it's empty here and the
        // browser has nothing of its own to delete — we drive the grid.
        e.preventDefault();
        onDelete();
        setAnnouncement('Deleted');
        break;
      case 'ArrowUp':
        e.preventDefault();
        onMove('up');
        break;
      case 'ArrowDown':
        e.preventDefault();
        onMove('down');
        break;
      case 'ArrowLeft':
        e.preventDefault();
        onMove('left');
        break;
      case 'ArrowRight':
        e.preventDefault();
        onMove('right');
        break;
      case 'Escape':
        e.preventDefault();
        // Deselect handled by parent via click outside
        break;
      case 'Tab':
        e.preventDefault();
        break;
    }
  }, [selectedCell, onDelete, onMove, onCellClick]);

  return (
    <div className={GRID_PAN}>
      <div
        ref={gridRef}
        className={`${GRID_PAGE} outline-none`}
        aria-label="Crossword puzzle grid"
      >
      <div
        role="grid"
        className={`${GRID_FRAME} relative`}
        // Play grid fits the viewport width (cells shrink to fit, no
        // horizontal pan on a phone) — see gridFitSizingStyle. 50px cap on
        // desktop, 18px floor before GRID_PAN takes over on huge grids.
        // Viewing/generation grids keep gridSizingStyle (the 34/50 clamp).
        style={gridFitSizingStyle(puzzle.width, 18, 50)}
      >
        {puzzle.grid.map((row, y) => (
          <div key={`row-${y}`} role="row" className="contents">
            {row.map((cell, x) => {
              const isEmpty = cell === EMPTY_CELL;
              const key = cellKey(x, y);
              const cellNumber = numberMap.get(key);
              const isSelected = selectedCell !== null && selectedCell.x === x && selectedCell.y === y;
              const isHighlighted = highlightedCells.has(key);
              const checkStatus = checkedCells.get(key);
              const isRevealed = revealedCells.has(key);
              const userLetter = userGrid[y]?.[x] ?? '';
              const isPopping = poppedCell === key;
              const isShaking = shakingCells?.has(key) ?? false;

              let ariaLabel: string;
              if (isEmpty) {
                ariaLabel = 'Blocked cell';
              } else {
                ariaLabel = `Row ${y + 1}, Column ${x + 1}`;
                if (cellNumber !== undefined) {
                  ariaLabel += `, number ${cellNumber}`;
                }
                if (userLetter) {
                  ariaLabel += `, letter ${userLetter.toUpperCase()}`;
                } else {
                  ariaLabel += ', empty';
                }
                if (checkStatus === 'correct') ariaLabel += ', correct';
                else if (checkStatus === 'incorrect') ariaLabel += ', incorrect';
                if (isRevealed) ariaLabel += ', revealed';
              }

              // Cell background. The paper stays light in every theme, so
              // interaction colors don't need dark variants.
              let bgClass = CELL_PAPER;
              if (isEmpty) {
                bgClass = CELL_BLOCKED;
              } else if (isSelected) {
                bgClass = 'bg-grid-active dark:bg-grid-active-dark';
              } else if (isHighlighted) {
                bgClass = 'bg-grid-highlight dark:bg-grid-highlight-dark';
              }

              // Letter ink — blue/orange for check (color-blind safe)
              let textClass = 'text-grid-ink';
              if (checkStatus === 'correct') {
                textClass = 'text-blue-700';
              } else if (checkStatus === 'incorrect') {
                textClass = 'text-orange-700';
              } else if (isRevealed) {
                textClass = 'text-primary-700';
              }

              return (
                <div
                  key={key}
                  ref={(node) => { cellRefs.current.set(key, node); }}
                  role="gridcell"
                  aria-label={ariaLabel}
                  aria-selected={isSelected}
                  onClick={() => {
                    if (!isEmpty) handleCellTap(x, y);
                  }}
                  className={`
                    ${CELL_BASE} ${isEmpty ? 'cursor-default' : 'cursor-text'}
                    transition-colors duration-75
                    ${bgClass}
                    ${!isEmpty && !isSelected && !isHighlighted ? 'hover:bg-grid-highlight/70 dark:hover:bg-grid-highlight-dark/70' : ''}
                    ${isPopping ? 'animate-cell-pop' : ''}
                    ${isShaking ? 'animate-cell-shake' : ''}
                  `}
                  style={isSelected ? {
                    boxShadow: 'inset 0 0 0 2px rgba(82,88,228,0.55)',
                  } : undefined}
                >
                  {cellNumber !== undefined && (
                    <span className={CELL_NUMBER} style={{ fontSize: NUMBER_FONT_SIZE }}>
                      {cellNumber}
                    </span>
                  )}

                  {!isEmpty && userLetter && (
                    <span
                      className={`font-semibold uppercase ${textClass}`}
                      style={{ fontSize: LETTER_FONT_SIZE }}
                    >
                      {userLetter}
                    </span>
                  )}

                  {/* Direction indicator */}
                  {isSelected && (
                    <div className={`absolute ${isAcross ? 'bottom-0 left-0 right-0 h-[3px]' : 'top-0 bottom-0 right-0 w-[3px]'} bg-primary-500`} />
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {/* Mobile input proxy — a single, persistent, focusable text input
            that owns text entry. Tapping a cell focuses it, which is what
            raises the soft keyboard (a focused <div> never does). It rides
            over the active cell so iOS scrolls to the right spot and the
            caret would sit there; it is NEVER unmounted (a per-cell input
            re-mounting each keystroke would blur and drop the keyboard on
            auto-advance). Visually hidden (transparent text + caret) but not
            display:none, which would stop it focusing. The grid keeps its
            full gridcell ARIA; this input is the single keyboard tab stop
            (tabIndex 0) so keyboard-only users can Tab back into the grid —
            the highlighted selected cell is its visible focus indicator (the
            input itself is transparent). */}
        {selectedCell && (
          <input
            ref={inputRef}
            type="text"
            inputMode="text"
            autoCapitalize="characters"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="next"
            aria-label="Type a letter for the selected square"
            tabIndex={0}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            className="absolute pointer-events-none bg-transparent border-0 p-0 m-0
                       text-transparent caret-transparent outline-none
                       [appearance:none] [-webkit-tap-highlight-color:transparent]"
            style={{
              // Absolute offset is from the frame's padding box (inside the
              // border), the same origin the cell tracks start from — so the
              // cell index maps directly with no border fudge.
              left: `calc(var(--cell) * ${selectedCell.x})`,
              top: `calc(var(--cell) * ${selectedCell.y})`,
              width: 'var(--cell)',
              height: 'var(--cell)',
              fontSize: LETTER_FONT_SIZE,
            }}
          />
        )}
      </div>
      {/* Screen reader announcements */}
      <div aria-live="polite" className="sr-only">{announcement}</div>
      </div>
    </div>
  );
}
