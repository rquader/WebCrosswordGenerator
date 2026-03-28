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
const HINT_TIME_PENALTY = 15; // seconds added per hint

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

  // Progress tracking
  const filledCount = puzzle ? countFilledCells(userGrid, puzzle) : 0;
  const totalCount = puzzle ? countTotalCells(puzzle) : 0;

  // Reset state when a new puzzle is loaded, try to restore auto-save
  useEffect(() => {
    if (puzzle) {
      const saved = tryLoadAutoSave(puzzle);
      if (saved) {
        setUserGrid(saved.userGrid);
        setElapsedSeconds(saved.elapsedSeconds);
        setSelectedCell(null);
        setIsAcross(true);
        setIsTimerRunning(false);
        setIsComplete(false);
        setCheckedCells(new Map());
        setRevealedCells(new Set());
        setHintsUsed(saved.hintsUsed ?? 0);
      } else {
        setUserGrid(createEmptyUserGrid(puzzle));
        setSelectedCell(null);
        setIsAcross(true);
        setElapsedSeconds(0);
        setIsTimerRunning(false);
        setIsComplete(false);
        setCheckedCells(new Map());
        setRevealedCells(new Set());
        setHintsUsed(0);
      }
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

    // Push to undo stack
    undoStack.current.push({ x, y, prevLetter, newLetter: letter.toUpperCase() });
    redoStack.current = []; // clear redo on new action

    setUserGrid(prev => {
      const newGrid = prev.map(row => [...row]);
      newGrid[y][x] = letter.toUpperCase();
      return newGrid;
    });

    setCheckedCells(prev => {
      const next = new Map(prev);
      next.delete(cellKey(x, y));
      return next;
    });

    advanceCell(x, y);
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

  // Undo last action
  const undo = useCallback(() => {
    const entry = undoStack.current.pop();
    if (!entry) return;
    redoStack.current.push(entry);
    setUserGrid(prev => {
      const newGrid = prev.map(row => [...row]);
      newGrid[entry.y][entry.x] = entry.prevLetter;
      return newGrid;
    });
  }, []);

  // Redo last undone action
  const redo = useCallback(() => {
    const entry = redoStack.current.pop();
    if (!entry) return;
    undoStack.current.push(entry);
    setUserGrid(prev => {
      const newGrid = prev.map(row => [...row]);
      newGrid[entry.y][entry.x] = entry.newLetter;
      return newGrid;
    });
  }, []);

  // Reveal a single cell (hint)
  const hintCell = useCallback(() => {
    if (!puzzle || !selectedCell) return;
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
  }, [puzzle, selectedCell, userGrid, isTimerRunning, isComplete]);

  function advanceCell(fromX: number, fromY: number) {
    if (!puzzle) return;
    let nextX = fromX;
    let nextY = fromY;

    if (isAcross) {
      nextX++;
      while (nextX < puzzle.width && puzzle.grid[nextY][nextX] === EMPTY_CELL) {
        nextX++;
      }
      if (nextX < puzzle.width) {
        setSelectedCell({ x: nextX, y: nextY });
      }
    } else {
      nextY++;
      while (nextY < puzzle.height && puzzle.grid[nextY][nextX] === EMPTY_CELL) {
        nextY++;
      }
      if (nextY < puzzle.height) {
        setSelectedCell({ x: nextX, y: nextY });
      }
    }
  }

  function retreatCell(fromX: number, fromY: number) {
    if (!puzzle) return;
    let prevX = fromX;
    let prevY = fromY;

    if (isAcross) {
      prevX--;
      while (prevX >= 0 && puzzle.grid[prevY][prevX] === EMPTY_CELL) {
        prevX--;
      }
      if (prevX >= 0) {
        setSelectedCell({ x: prevX, y: prevY });
        undoStack.current.push({ x: prevX, y: prevY, prevLetter: userGrid[prevY]?.[prevX] ?? '', newLetter: '' });
        redoStack.current = [];
        setUserGrid(prev => {
          const newGrid = prev.map(row => [...row]);
          newGrid[prevY][prevX] = '';
          return newGrid;
        });
      }
    } else {
      prevY--;
      while (prevY >= 0 && puzzle.grid[prevY][prevX] === EMPTY_CELL) {
        prevY--;
      }
      if (prevY >= 0) {
        setSelectedCell({ x: prevX, y: prevY });
        undoStack.current.push({ x: prevX, y: prevY, prevLetter: userGrid[prevY]?.[prevX] ?? '', newLetter: '' });
        redoStack.current = [];
        setUserGrid(prev => {
          const newGrid = prev.map(row => [...row]);
          newGrid[prevY][prevX] = '';
          return newGrid;
        });
      }
    }
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
    totalCount,
    enterLetter,
    deleteLetter,
    moveSelection,
    selectCell,
    deselectCell,
    setIsAcross,
    checkPuzzle,
    clearIncorrect,
    revealPuzzle,
    resetPuzzle,
    highlightedCells,
    hintCell,
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

function countTotalCells(puzzle: CrosswordResult): number {
  let count = 0;
  for (let y = 0; y < puzzle.height; y++) {
    for (let x = 0; x < puzzle.width; x++) {
      if (puzzle.grid[y][x] !== EMPTY_CELL) count++;
    }
  }
  return count;
}
