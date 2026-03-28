/**
 * Hook managing interactive puzzle state for the Play tab.
 *
 * Tracks:
 * - User-entered letters for each cell
 * - Currently selected cell and direction
 * - Timer (elapsed seconds)
 * - Completion status
 *
 * All state is local — nothing leaves the browser.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { CrosswordResult } from '../logic/types';
import { assignNumbers } from '../logic/numbering';

const EMPTY_CELL = '-';

export interface CellPosition {
  x: number;
  y: number;
}

export interface PuzzlePlayState {
  // User's entered letters — grid[y][x], empty string means not filled yet
  userGrid: string[][];
  // Currently selected cell
  selectedCell: CellPosition | null;
  // Current direction for typing: true = across, false = down
  isAcross: boolean;
  // Timer
  elapsedSeconds: number;
  isTimerRunning: boolean;
  // Completion
  isComplete: boolean;
  // Checked cells — tracks which cells the user has checked
  // 'correct' | 'incorrect' | undefined
  checkedCells: Map<string, 'correct' | 'incorrect'>;
  // Revealed cells
  revealedCells: Set<string>;
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

export function usePuzzleState(puzzle: CrosswordResult | null) {
  const [userGrid, setUserGrid] = useState<string[][]>([]);
  const [selectedCell, setSelectedCell] = useState<CellPosition | null>(null);
  const [isAcross, setIsAcross] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [checkedCells, setCheckedCells] = useState<Map<string, 'correct' | 'incorrect'>>(new Map());
  const [revealedCells, setRevealedCells] = useState<Set<string>>(new Set());
  const timerRef = useRef<number | null>(null);

  // Reset state when a new puzzle is loaded
  useEffect(() => {
    if (puzzle) {
      setUserGrid(createEmptyUserGrid(puzzle));
      setSelectedCell(null);
      setIsAcross(true);
      setElapsedSeconds(0);
      setIsTimerRunning(false);
      setIsComplete(false);
      setCheckedCells(new Map());
      setRevealedCells(new Set());
    }
  }, [puzzle]);

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
    }
  }, [userGrid, puzzle]);

  // Enter a letter in the selected cell
  const enterLetter = useCallback((letter: string) => {
    if (!puzzle || !selectedCell) return;
    const { x, y } = selectedCell;
    if (puzzle.grid[y][x] === EMPTY_CELL) return;

    // Start timer on first input
    if (!isTimerRunning && !isComplete) {
      setIsTimerRunning(true);
    }

    setUserGrid(prev => {
      const newGrid = prev.map(row => [...row]);
      newGrid[y][x] = letter.toUpperCase();
      return newGrid;
    });

    // Clear check status for this cell
    setCheckedCells(prev => {
      const next = new Map(prev);
      next.delete(cellKey(x, y));
      return next;
    });

    // Auto-advance to next cell in current direction
    advanceCell(x, y);
  }, [puzzle, selectedCell, isAcross, isTimerRunning, isComplete]);

  // Delete the letter in the selected cell
  const deleteLetter = useCallback(() => {
    if (!puzzle || !selectedCell) return;
    const { x, y } = selectedCell;
    if (puzzle.grid[y][x] === EMPTY_CELL) return;

    const currentLetter = userGrid[y]?.[x] ?? '';

    if (currentLetter !== '') {
      // Clear current cell
      setUserGrid(prev => {
        const newGrid = prev.map(row => [...row]);
        newGrid[y][x] = '';
        return newGrid;
      });
    } else {
      // Move back and clear previous cell
      retreatCell(x, y);
    }
  }, [puzzle, selectedCell, userGrid, isAcross]);

  // Move to next cell in current direction
  function advanceCell(fromX: number, fromY: number) {
    if (!puzzle) return;
    let nextX = fromX;
    let nextY = fromY;

    if (isAcross) {
      nextX++;
      // Skip empty cells
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

  // Move to previous cell in current direction
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
        setUserGrid(prev => {
          const newGrid = prev.map(row => [...row]);
          newGrid[prevY][prevX] = '';
          return newGrid;
        });
      }
    }
  }

  // Navigate with arrow keys
  const moveSelection = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (!puzzle || !selectedCell) return;
    let { x, y } = selectedCell;

    switch (direction) {
      case 'up':    y = Math.max(0, y - 1); break;
      case 'down':  y = Math.min(puzzle.height - 1, y + 1); break;
      case 'left':  x = Math.max(0, x - 1); break;
      case 'right': x = Math.min(puzzle.width - 1, x + 1); break;
    }

    // Skip empty cells
    if (puzzle.grid[y][x] !== EMPTY_CELL) {
      setSelectedCell({ x, y });
    }
  }, [puzzle, selectedCell]);

  // Click on a cell
  const selectCell = useCallback((x: number, y: number) => {
    if (!puzzle || puzzle.grid[y][x] === EMPTY_CELL) return;

    // If clicking the already-selected cell, toggle direction
    if (selectedCell && selectedCell.x === x && selectedCell.y === y) {
      setIsAcross(prev => !prev);
    } else {
      setSelectedCell({ x, y });
    }
  }, [puzzle, selectedCell]);

  // Check all filled cells
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

  // Reveal all answers
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
  }, [puzzle, userGrid]);

  // Reset the puzzle
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
  }, [puzzle]);

  // Get highlighted cells for the current word
  const highlightedCells = useCallback((): Set<string> => {
    const cells = new Set<string>();
    if (!puzzle || !selectedCell) return cells;

    const numbering = assignNumbers(puzzle.wordLocations, puzzle.width, puzzle.height);
    const allClues = [...numbering.acrossClues, ...numbering.downClues];

    // Find the word that contains the selected cell in the current direction
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

  return {
    userGrid,
    selectedCell,
    isAcross,
    elapsedSeconds,
    isTimerRunning,
    isComplete,
    checkedCells,
    revealedCells,
    enterLetter,
    deleteLetter,
    moveSelection,
    selectCell,
    setIsAcross,
    checkPuzzle,
    revealPuzzle,
    resetPuzzle,
    highlightedCells,
  };
}
