/**
 * Hook managing interactive puzzle state for the Play tab.
 *
 * Tracks:
 * - User-entered letters for each cell
 * - Currently selected cell and direction
 * - Timer (elapsed seconds)
 * - Completion status
 * - Undo/redo history
 * - Auto-save to localStorage
 *
 * All state is local — nothing leaves the browser.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { CrosswordResult } from '../logic/types';
import { assignNumbers } from '../logic/numbering';

const EMPTY_CELL = '-';
const AUTO_SAVE_KEY = 'crossword-autosave';
export const HINT_TIME_PENALTY = 15; // seconds added per cell hint
export const HINT_WORD_TIME_PENALTY = HINT_TIME_PENALTY * 3; // a whole word costs more time
export const HINT_BUDGET = 3; // hints per puzzle, cell or word alike

/** True while the solver still has hints to spend. */
export function canUseHint(hintsUsed: number): boolean {
  return hintsUsed < HINT_BUDGET;
}

export interface CellPosition {
  x: number;
  y: number;
}

export interface PuzzlePlayState {
  userGrid: string[][];
  selectedCell: CellPosition | null;
  isAcross: boolean;
  elapsedSeconds: number;
  isTimerRunning: boolean;
  isComplete: boolean;
  checkedCells: Map<string, 'correct' | 'incorrect'>;
  revealedCells: Set<string>;
}

interface UndoEntry {
  x: number;
  y: number;
  prevLetter: string;
  newLetter: string;
}

function createEmptyUserGrid(puzzle: CrosswordResult): string[][] {
  const grid: string[][] = [];
  for (let y = 0; y < puzzle.height; y++) {
    const row: string[] = [];
    for (let x = 0; x < puzzle.width; x++) {
      row.push('');
    }
    grid.push(row);
  }
  return grid;
}

function cellKey(x: number, y: number): string {
  return x + ',' + y;
}

/**
 * Where the cursor should start: the first across entry in numbering
 * order (row-major scan = lowest clue number, i.e. 1-Across), falling
 * back to the first down entry for puzzles without across words.
 */
function firstEntryStart(
  puzzle: CrosswordResult
): { x: number; y: number; isAcross: boolean } | null {
  let best: { x: number; y: number; isAcross: boolean } | null = null;
  for (const loc of puzzle.wordLocations) {
    const candidate = { x: loc.x, y: loc.y, isAcross: loc.isHorizontal };
    if (
      best === null
      || (candidate.isAcross && !best.isAcross)
      || (candidate.isAcross === best.isAcross
          && (candidate.y < best.y || (candidate.y === best.y && candidate.x < best.x)))
    ) {
      best = candidate;
    }
  }
  return best;
}

/**
 * Generate a simple hash of the puzzle grid for auto-save identification.
 */
function puzzleHash(puzzle: CrosswordResult): string {
  return puzzle.grid.map(r => r.join('')).join('|');
}

export function usePuzzleState(puzzle: CrosswordResult | null) {
  const [userGrid, setUserGrid] = useState<string[][]>([]);
  const [selectedCell, setSelectedCell] = useState<CellPosition | null>(null);
  const [isAcross, setIsAcross] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [checkedCells, setCheckedCells] = useState<Map<string, 'correct' | 'incorrect'>>(new Map());
  const [revealedCells, setRevealedCells] = useState<Set<string>>(new Set());
  const [hintsUsed, setHintsUsed] = useState(0);
  const timerRef = useRef<number | null>(null);

  // Undo/redo stacks
  const undoStack = useRef<UndoEntry[]>([]);
  const redoStack = useRef<UndoEntry[]>([]);

  // Progress tracking — correctCount keeps wrong letters from inflating progress
  const filledCount = puzzle ? countFilledCells(userGrid, puzzle) : 0;
  const correctCount = puzzle ? countCorrectCells(userGrid, puzzle) : 0;
  const totalCount = puzzle ? countTotalCells(puzzle) : 0;

  // Reset state when a new puzzle is loaded, try to restore auto-save.
  // The cursor starts on the first across entry (1-Across) — the natural
  // first move, and it makes the active-clue bar useful immediately.
  useEffect(() => {
    if (puzzle) {
      const start = firstEntryStart(puzzle);
      const saved = tryLoadAutoSave(puzzle);
      if (saved) {
        setUserGrid(saved.userGrid);
        setElapsedSeconds(saved.elapsedSeconds);
        setHintsUsed(saved.hintsUsed ?? 0);
      } else {
        setUserGrid(createEmptyUserGrid(puzzle));
        setElapsedSeconds(0);
        setHintsUsed(0);
      }
      setSelectedCell(start ? { x: start.x, y: start.y } : null);
      setIsAcross(start?.isAcross ?? true);
      setIsTimerRunning(false);
      setIsComplete(false);
      setCheckedCells(new Map());
      setRevealedCells(new Set());
      undoStack.current = [];
      redoStack.current = [];
    }
  }, [puzzle]);

  // Auto-save every time userGrid changes
  useEffect(() => {
    if (puzzle && userGrid.length > 0 && !isComplete) {
      saveAutoSave(puzzle, userGrid, elapsedSeconds, hintsUsed);
    }
  }, [userGrid, elapsedSeconds, puzzle, isComplete, hintsUsed]);

  // Timer tick
  useEffect(() => {
    if (isTimerRunning && !isComplete) {
      timerRef.current = window.setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isTimerRunning, isComplete]);

  // Pause the clock while the tab is hidden — walking away shouldn't cost
  // solve time. Resumes only if the timer was running when the tab hid.
  const pausedByHideRef = useRef(false);
  useEffect(() => {
    function handleVisibility() {
      if (document.hidden) {
        if (isTimerRunning) {
          pausedByHideRef.current = true;
          setIsTimerRunning(false);
        }
      } else if (pausedByHideRef.current) {
        pausedByHideRef.current = false;
        setIsTimerRunning(true);
      }
    }
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isTimerRunning]);

  // Check for puzzle completion whenever userGrid changes
  useEffect(() => {
    if (!puzzle || userGrid.length === 0) return;

    let allFilled = true;
    let allCorrect = true;

    for (let y = 0; y < puzzle.height; y++) {
      for (let x = 0; x < puzzle.width; x++) {
        if (puzzle.grid[y][x] === EMPTY_CELL) continue;

        const userLetter = userGrid[y]?.[x] ?? '';
        if (userLetter === '') {
          allFilled = false;
          allCorrect = false;
          break;
        }
        if (userLetter.toLowerCase() !== puzzle.grid[y][x].toLowerCase()) {
          allCorrect = false;
        }
      }
      if (!allFilled) break;
    }

    if (allFilled && allCorrect) {
      setIsComplete(true);
      setIsTimerRunning(false);
      clearAutoSave(puzzle);
    }
  }, [userGrid, puzzle]);

  // Enter a letter in the selected cell
  const enterLetter = useCallback((letter: string) => {
    if (!puzzle || !selectedCell) return;
    const { x, y } = selectedCell;
    if (puzzle.grid[y][x] === EMPTY_CELL) return;

    if (!isTimerRunning && !isComplete) {
      setIsTimerRunning(true);
    }

    const prevLetter = userGrid[y]?.[x] ?? '';
    const upper = letter.toUpperCase();

    // Push to undo stack
    undoStack.current.push({ x, y, prevLetter, newLetter: upper });
    redoStack.current = []; // clear redo on new action

    // Build the post-keystroke grid once so we can both commit it and feed it
    // to advanceCell — the "is the next cell empty" / "next unfilled clue"
    // decision must see the letter we just typed, not the stale userGrid.
    const gridAfter = userGrid.map(row => [...row]);
    gridAfter[y][x] = upper;
    setUserGrid(gridAfter);

    setCheckedCells(prev => {
      const next = new Map(prev);
      next.delete(cellKey(x, y));
      return next;
    });

    advanceCell(x, y, gridAfter);
  }, [puzzle, selectedCell, isAcross, isTimerRunning, isComplete, userGrid]);

  // Delete the letter in the selected cell
  const deleteLetter = useCallback(() => {
    if (!puzzle || !selectedCell) return;
    const { x, y } = selectedCell;
    if (puzzle.grid[y][x] === EMPTY_CELL) return;

    const currentLetter = userGrid[y]?.[x] ?? '';

    if (currentLetter !== '') {
      undoStack.current.push({ x, y, prevLetter: currentLetter, newLetter: '' });
      redoStack.current = [];
      setUserGrid(prev => {
        const newGrid = prev.map(row => [...row]);
        newGrid[y][x] = '';
        return newGrid;
      });
    } else {
      retreatCell(x, y);
    }
  }, [puzzle, selectedCell, userGrid, isAcross]);

  // Undo last action. Entries on cells that have since been revealed are
  // dead history — a hint/reveal letter is final (the penalty was paid),
  // so undoing must never hollow out a revealed cell. Dead entries are
  // discarded until a live one is found.
  const undo = useCallback(() => {
    let entry = undoStack.current.pop();
    while (entry && revealedCells.has(cellKey(entry.x, entry.y))) {
      entry = undoStack.current.pop();
    }
    if (!entry) return;
    redoStack.current.push(entry);
    const { x, y, prevLetter } = entry;
    setUserGrid(prev => {
      const newGrid = prev.map(row => [...row]);
      newGrid[y][x] = prevLetter;
      return newGrid;
    });
  }, [revealedCells]);

  // Redo last undone action (same revealed-cell rule as undo)
  const redo = useCallback(() => {
    let entry = redoStack.current.pop();
    while (entry && revealedCells.has(cellKey(entry.x, entry.y))) {
      entry = redoStack.current.pop();
    }
    if (!entry) return;
    undoStack.current.push(entry);
    const { x, y, newLetter } = entry;
    setUserGrid(prev => {
      const newGrid = prev.map(row => [...row]);
      newGrid[y][x] = newLetter;
      return newGrid;
    });
  }, [revealedCells]);

  // Reveal a single cell (hint) — no-op once the budget is spent
  const hintCell = useCallback(() => {
    if (!puzzle || !selectedCell) return;
    if (!canUseHint(hintsUsed)) return;
    const { x, y } = selectedCell;
    if (puzzle.grid[y][x] === EMPTY_CELL) return;

    const answer = puzzle.grid[y][x].toUpperCase();
    const current = userGrid[y]?.[x] ?? '';
    if (current === answer) return; // already correct

    // Apply hint
    setUserGrid(prev => {
      const newGrid = prev.map(row => [...row]);
      newGrid[y][x] = answer;
      return newGrid;
    });
    setRevealedCells(prev => new Set(prev).add(cellKey(x, y)));
    setHintsUsed(prev => prev + 1);

    // Time penalty
    setElapsedSeconds(prev => prev + HINT_TIME_PENALTY);

    if (!isTimerRunning && !isComplete) {
      setIsTimerRunning(true);
    }
  }, [puzzle, selectedCell, userGrid, isTimerRunning, isComplete, hintsUsed]);

  // Reveal the whole word under the cursor — one hint, triple time penalty
  const hintWord = useCallback(() => {
    if (!puzzle || !selectedCell) return;
    if (!canUseHint(hintsUsed)) return;

    // The word under the cursor — falling back to the crossing direction
    // when the cell only belongs to one word (e.g. across-only cells).
    let cells = getWordCellsAt(puzzle, selectedCell.x, selectedCell.y, isAcross);
    if (cells.length === 0) {
      cells = getWordCellsAt(puzzle, selectedCell.x, selectedCell.y, !isAcross);
    }
    if (cells.length === 0) return;

    // Skip if the word is already fully correct — don't waste the hint
    const alreadySolved = cells.every(
      ({ x, y }) => (userGrid[y]?.[x] ?? '') === puzzle.grid[y][x].toUpperCase()
    );
    if (alreadySolved) return;

    setUserGrid(prev => {
      const newGrid = prev.map(row => [...row]);
      for (const { x, y } of cells) {
        newGrid[y][x] = puzzle.grid[y][x].toUpperCase();
      }
      return newGrid;
    });
    setRevealedCells(prev => {
      const next = new Set(prev);
      for (const { x, y } of cells) next.add(cellKey(x, y));
      return next;
    });
    setHintsUsed(prev => prev + 1);
    setElapsedSeconds(prev => prev + HINT_WORD_TIME_PENALTY);

    if (!isTimerRunning && !isComplete) {
      setIsTimerRunning(true);
    }
  }, [puzzle, selectedCell, isAcross, userGrid, isTimerRunning, isComplete, hintsUsed]);

  // Advance after typing a letter. The cursor stays INSIDE the current word —
  // it never steps across a black cell into a neighbouring entry (that was
  // bug B1). It lands on the next empty cell within the word; if there is no
  // empty cell after this one, it jumps to the first empty cell of the next
  // unfilled clue in numbering order (the user's chosen behaviour). The
  // post-keystroke grid is passed in so the "is it filled" test reflects the
  // letter we just wrote, not the stale userGrid.
  function advanceCell(fromX: number, fromY: number, gridAfter: string[][]) {
    if (!puzzle) return;
    const target = nextCellAfterTyping(puzzle, gridAfter, isAcross, fromX, fromY);
    if (!target) return; // everything full — leave the cursor put, no jump
    setSelectedCell({ x: target.x, y: target.y });
    if (target.isAcross !== isAcross) setIsAcross(target.isAcross);
  }

  // Backspace on an already-empty cell steps back one cell WITHIN the current
  // word (never across a black cell, never into a neighbouring entry) and
  // clears it. At the word's first cell it stays put — no surprise jump (B1).
  function retreatCell(fromX: number, fromY: number) {
    if (!puzzle) return;
    const prev = prevCellForBackspace(puzzle, isAcross, fromX, fromY);
    if (!prev) return; // at the word start — stay put
    const { x: prevX, y: prevY } = prev;
    setSelectedCell({ x: prevX, y: prevY });
    undoStack.current.push({ x: prevX, y: prevY, prevLetter: userGrid[prevY]?.[prevX] ?? '', newLetter: '' });
    redoStack.current = [];
    setUserGrid(prevGrid => {
      const newGrid = prevGrid.map(row => [...row]);
      newGrid[prevY][prevX] = '';
      return newGrid;
    });
  }

  const moveSelection = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (!puzzle || !selectedCell) return;
    let { x, y } = selectedCell;

    switch (direction) {
      case 'up':    y = Math.max(0, y - 1); break;
      case 'down':  y = Math.min(puzzle.height - 1, y + 1); break;
      case 'left':  x = Math.max(0, x - 1); break;
      case 'right': x = Math.min(puzzle.width - 1, x + 1); break;
    }

    if (puzzle.grid[y][x] !== EMPTY_CELL) {
      setSelectedCell({ x, y });
    }
  }, [puzzle, selectedCell]);

  const selectCell = useCallback((x: number, y: number) => {
    if (!puzzle || puzzle.grid[y][x] === EMPTY_CELL) return;

    if (selectedCell && selectedCell.x === x && selectedCell.y === y) {
      setIsAcross(prev => !prev);
    } else {
      setSelectedCell({ x, y });
    }
  }, [puzzle, selectedCell]);

  // Select a cell AND force a direction in one deterministic call (B2). Used
  // by clue-list / play-bar taps: tapping an "Across" clue must land on its
  // start cell reading Across, even if that same cell was the selected Down
  // cell a moment ago. The old code called selectCell twice and read a stale
  // isAcross, so the toggle semantics could misfire (audit P8). Here the
  // direction is set outright — no toggle, no stale read, no double-dispatch.
  const selectCellWithDirection = useCallback((x: number, y: number, across: boolean) => {
    if (!puzzle || puzzle.grid[y][x] === EMPTY_CELL) return;
    setSelectedCell({ x, y });
    setIsAcross(across);
  }, [puzzle]);

  const checkPuzzle = useCallback(() => {
    if (!puzzle) return;
    const newChecked = new Map<string, 'correct' | 'incorrect'>();

    for (let y = 0; y < puzzle.height; y++) {
      for (let x = 0; x < puzzle.width; x++) {
        if (puzzle.grid[y][x] === EMPTY_CELL) continue;
        const userLetter = userGrid[y]?.[x] ?? '';
        if (userLetter === '') continue;

        const key = cellKey(x, y);
        if (userLetter.toLowerCase() === puzzle.grid[y][x].toLowerCase()) {
          newChecked.set(key, 'correct');
        } else {
          newChecked.set(key, 'incorrect');
        }
      }
    }

    setCheckedCells(newChecked);
  }, [puzzle, userGrid]);

  const revealPuzzle = useCallback(() => {
    if (!puzzle) return;
    const newGrid = userGrid.map(row => [...row]);
    const newRevealed = new Set<string>();

    for (let y = 0; y < puzzle.height; y++) {
      for (let x = 0; x < puzzle.width; x++) {
        if (puzzle.grid[y][x] === EMPTY_CELL) continue;
        newGrid[y][x] = puzzle.grid[y][x].toUpperCase();
        newRevealed.add(cellKey(x, y));
      }
    }

    setUserGrid(newGrid);
    setRevealedCells(newRevealed);
    setIsComplete(true);
    setIsTimerRunning(false);
    if (puzzle) clearAutoSave(puzzle);
  }, [puzzle, userGrid]);

  const resetPuzzle = useCallback(() => {
    if (!puzzle) return;
    setUserGrid(createEmptyUserGrid(puzzle));
    setSelectedCell(null);
    setIsAcross(true);
    setElapsedSeconds(0);
    setIsTimerRunning(false);
    setIsComplete(false);
    setCheckedCells(new Map());
    setRevealedCells(new Set());
    setHintsUsed(0);
    undoStack.current = [];
    redoStack.current = [];
    clearAutoSave(puzzle);
  }, [puzzle]);

  const highlightedCells = useCallback((): Set<string> => {
    const cells = new Set<string>();
    if (!puzzle || !selectedCell) return cells;

    const numbering = assignNumbers(puzzle.wordLocations, puzzle.width, puzzle.height);
    const allClues = [...numbering.acrossClues, ...numbering.downClues];

    for (const clue of allClues) {
      if (clue.isHorizontal !== isAcross) continue;

      const wordLen = clue.word.length;
      if (clue.isHorizontal) {
        if (selectedCell.y !== clue.y) continue;
        if (selectedCell.x < clue.x || selectedCell.x >= clue.x + wordLen) continue;
        for (let i = 0; i < wordLen; i++) {
          cells.add(cellKey(clue.x + i, clue.y));
        }
        return cells;
      } else {
        if (selectedCell.x !== clue.x) continue;
        if (selectedCell.y < clue.y || selectedCell.y >= clue.y + wordLen) continue;
        for (let i = 0; i < wordLen; i++) {
          cells.add(cellKey(clue.x, clue.y + i));
        }
        return cells;
      }
    }

    return cells;
  }, [puzzle, selectedCell, isAcross]);

  // Deselect current cell
  const deselectCell = useCallback(() => {
    setSelectedCell(null);
  }, []);

  // Clear only incorrect cells (after checking)
  const clearIncorrect = useCallback(() => {
    if (!puzzle) return;
    setUserGrid(prev => {
      const newGrid = prev.map(row => [...row]);
      for (const [key, status] of checkedCells) {
        if (status === 'incorrect') {
          const [xStr, yStr] = key.split(',');
          newGrid[parseInt(yStr)][parseInt(xStr)] = '';
        }
      }
      return newGrid;
    });
    setCheckedCells(new Map());
  }, [puzzle, checkedCells]);

  return {
    userGrid,
    selectedCell,
    isAcross,
    elapsedSeconds,
    isTimerRunning,
    isComplete,
    checkedCells,
    revealedCells,
    hintsUsed,
    filledCount,
    correctCount,
    totalCount,
    enterLetter,
    deleteLetter,
    moveSelection,
    selectCell,
    selectCellWithDirection,
    deselectCell,
    setIsAcross,
    checkPuzzle,
    clearIncorrect,
    revealPuzzle,
    resetPuzzle,
    highlightedCells,
    hintCell,
    hintWord,
    undo,
    redo,
  };
}

// --- Auto-save helpers ---

interface AutoSaveData {
  hash: string;
  userGrid: string[][];
  elapsedSeconds: number;
  hintsUsed: number;
}

function tryLoadAutoSave(puzzle: CrosswordResult): AutoSaveData | null {
  try {
    const raw = localStorage.getItem(AUTO_SAVE_KEY);
    if (!raw) return null;
    const data: AutoSaveData = JSON.parse(raw);
    if (data.hash !== puzzleHash(puzzle)) return null;
    // Validate grid dimensions match
    if (data.userGrid.length !== puzzle.height) return null;
    if (data.userGrid[0]?.length !== puzzle.width) return null;
    return data;
  } catch {
    return null;
  }
}

function saveAutoSave(puzzle: CrosswordResult, userGrid: string[][], elapsedSeconds: number, hintsUsed: number) {
  try {
    const data: AutoSaveData = {
      hash: puzzleHash(puzzle),
      userGrid,
      elapsedSeconds,
      hintsUsed,
    };
    localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(data));
  } catch {
    // localStorage full or unavailable — silently fail
  }
}

function clearAutoSave(_puzzle: CrosswordResult) {
  try {
    localStorage.removeItem(AUTO_SAVE_KEY);
  } catch {
    // silently fail
  }
}

function countFilledCells(userGrid: string[][], puzzle: CrosswordResult): number {
  let count = 0;
  for (let y = 0; y < puzzle.height; y++) {
    for (let x = 0; x < puzzle.width; x++) {
      if (puzzle.grid[y][x] === EMPTY_CELL) continue;
      if ((userGrid[y]?.[x] ?? '') !== '') count++;
    }
  }
  return count;
}

/** Cells where the user's letter matches the answer (case-insensitive). */
export function countCorrectCells(userGrid: string[][], puzzle: CrosswordResult): number {
  let count = 0;
  for (let y = 0; y < puzzle.height; y++) {
    for (let x = 0; x < puzzle.width; x++) {
      if (puzzle.grid[y][x] === EMPTY_CELL) continue;
      const userLetter = userGrid[y]?.[x] ?? '';
      if (userLetter !== '' && userLetter.toLowerCase() === puzzle.grid[y][x].toLowerCase()) {
        count++;
      }
    }
  }
  return count;
}

/**
 * Cells of the across/down word containing (x, y) — same word the grid
 * highlights. Empty when no word in that direction runs through the cell.
 */
export function getWordCellsAt(
  puzzle: CrosswordResult,
  x: number,
  y: number,
  isAcross: boolean,
): CellPosition[] {
  const numbering = assignNumbers(puzzle.wordLocations, puzzle.width, puzzle.height);
  const clues = isAcross ? numbering.acrossClues : numbering.downClues;

  for (const clue of clues) {
    const wordLen = clue.word.length;
    if (clue.isHorizontal) {
      if (y !== clue.y || x < clue.x || x >= clue.x + wordLen) continue;
      return Array.from({ length: wordLen }, (_, i) => ({ x: clue.x + i, y: clue.y }));
    } else {
      if (x !== clue.x || y < clue.y || y >= clue.y + wordLen) continue;
      return Array.from({ length: wordLen }, (_, i) => ({ x: clue.x, y: clue.y + i }));
    }
  }
  return [];
}

function countTotalCells(puzzle: CrosswordResult): number {
  let count = 0;
  for (let y = 0; y < puzzle.height; y++) {
    for (let x = 0; x < puzzle.width; x++) {
      if (puzzle.grid[y][x] !== EMPTY_CELL) count++;
    }
  }
  return count;
}

/** A clue flattened to its cell run + direction, for ordered traversal. */
interface OrderedClue {
  number: number;
  isAcross: boolean;
  cells: CellPosition[];
}

/**
 * All clues in solving order: by number, Across before Down within a number
 * (the order assignNumbers lists them). Each carries its cell run so callers
 * can scan for gaps without re-deriving geometry.
 */
function orderedClues(puzzle: CrosswordResult): OrderedClue[] {
  const { acrossClues, downClues } = assignNumbers(
    puzzle.wordLocations,
    puzzle.width,
    puzzle.height,
  );
  const toOrdered = (c: { number: number; x: number; y: number; isHorizontal: boolean; word: string }): OrderedClue => ({
    number: c.number,
    isAcross: c.isHorizontal,
    cells: c.isHorizontal
      ? Array.from({ length: c.word.length }, (_, i) => ({ x: c.x + i, y: c.y }))
      : Array.from({ length: c.word.length }, (_, i) => ({ x: c.x, y: c.y + i })),
  });
  const all = [...acrossClues.map(toOrdered), ...downClues.map(toOrdered)];
  // Sort by number, then Across (true) before Down (false).
  all.sort((a, b) => (a.number - b.number) || (a.isAcross === b.isAcross ? 0 : a.isAcross ? -1 : 1));
  return all;
}

/**
 * Starting AFTER the current clue (the one containing (fromX, fromY) in the
 * current direction) and wrapping around, find the first clue that still has
 * an empty cell, and return that clue's first empty cell plus its direction.
 * Returns null when every clue is full. This is the "jump to the next
 * unfilled clue at word end" target (B1).
 */
export function firstEmptyCellOfNextUnfilledClue(
  puzzle: CrosswordResult,
  grid: string[][],
  fromAcross: boolean,
  fromX: number,
  fromY: number,
): { x: number; y: number; isAcross: boolean } | null {
  const clues = orderedClues(puzzle);
  if (clues.length === 0) return null;

  // Index of the current clue (matched by direction + containing the cell).
  const currentIdx = clues.findIndex(
    (c) => c.isAcross === fromAcross && c.cells.some((cell) => cell.x === fromX && cell.y === fromY),
  );
  const start = currentIdx === -1 ? 0 : currentIdx + 1;

  for (let step = 0; step < clues.length; step++) {
    const clue = clues[(start + step) % clues.length];
    for (const { x, y } of clue.cells) {
      if ((grid[y]?.[x] ?? '') === '') {
        return { x, y, isAcross: clue.isAcross };
      }
    }
  }
  return null;
}

/**
 * Where the cursor goes after typing into (fromX, fromY) — the pure core of
 * advanceCell (B1). It stays inside the current word: the next empty cell
 * later in the word, else the first gap of the next unfilled clue, else null
 * (everything full → cursor stays put). NEVER returns a black cell and never
 * a cell in a neighbouring entry reached by stepping over a block.
 *
 * @param grid  the grid AFTER the keystroke (so the just-typed cell reads filled)
 */
export function nextCellAfterTyping(
  puzzle: CrosswordResult,
  grid: string[][],
  isAcross: boolean,
  fromX: number,
  fromY: number,
): { x: number; y: number; isAcross: boolean } | null {
  const wordCells = getWordCellsAt(puzzle, fromX, fromY, isAcross);
  const idx = wordCells.findIndex((c) => c.x === fromX && c.y === fromY);

  for (let i = idx + 1; i < wordCells.length; i++) {
    const { x, y } = wordCells[i];
    if ((grid[y]?.[x] ?? '') === '') {
      return { x, y, isAcross };
    }
  }
  return firstEmptyCellOfNextUnfilledClue(puzzle, grid, isAcross, fromX, fromY);
}

/**
 * Where backspace-on-empty moves — the pure core of retreatCell (B1). One
 * cell back WITHIN the current word; null at the word's first cell (stay put,
 * no jump). Never crosses a black cell into a neighbouring entry.
 */
export function prevCellForBackspace(
  puzzle: CrosswordResult,
  isAcross: boolean,
  fromX: number,
  fromY: number,
): CellPosition | null {
  const wordCells = getWordCellsAt(puzzle, fromX, fromY, isAcross);
  const idx = wordCells.findIndex((c) => c.x === fromX && c.y === fromY);
  if (idx <= 0) return null;
  return wordCells[idx - 1];
}
