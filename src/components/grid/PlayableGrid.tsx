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
 */

import { useEffect, useRef, useMemo, useCallback, useState } from 'react';
import type { CrosswordResult } from '../../logic/types';
import { assignNumbers } from '../../logic/numbering';
import type { CellPosition } from '../../hooks/usePuzzleState';

const EMPTY_CELL = '-';

interface PlayableGridProps {
  puzzle: CrosswordResult;
  userGrid: string[][];
  selectedCell: CellPosition | null;
  isAcross: boolean;
  checkedCells: Map<string, 'correct' | 'incorrect'>;
  revealedCells: Set<string>;
  highlightedCells: Set<string>;
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
  onCellClick,
  onLetterInput,
  onDelete,
  onMove,
}: PlayableGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
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

  // Focus the grid container so it receives keyboard events
  useEffect(() => {
    if (selectedCell && gridRef.current) {
      gridRef.current.focus();
    }
  }, [selectedCell]);

  // Keyboard handler
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!selectedCell) return;

    // Letter input
    if (e.key.length === 1 && e.key.match(/[a-zA-Z]/)) {
      e.preventDefault();
      onLetterInput(e.key);
      setAnnouncement(`Entered ${e.key.toUpperCase()}`);
      // Trigger cell-pop animation
      setPoppedCell(cellKey(selectedCell.x, selectedCell.y));
      setTimeout(() => setPoppedCell(null), 200);
      return;
    }

    // Spacebar toggles direction
    if (e.key === ' ') {
      e.preventDefault();
      onCellClick(selectedCell.x, selectedCell.y);
      return;
    }

    switch (e.key) {
      case 'Backspace':
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
  }, [selectedCell, onLetterInput, onDelete, onMove, onCellClick]);

  return (
    <div
      ref={gridRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="inline-block outline-none relative noise-texture rounded-lg"
      aria-label="Crossword puzzle grid"
    >
      <div
        role="grid"
        className="grid gap-0 border-2 border-stone-700 dark:border-stone-500/70 rounded-sm overflow-hidden"
        style={{
          gridTemplateColumns: `repeat(${puzzle.width}, minmax(0, 1fr))`,
        }}
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

              // Cell background
              let bgClass = 'bg-grid-cell dark:bg-grid-cell-dark';
              if (isEmpty) {
                bgClass = 'bg-grid-blocked dark:bg-grid-blocked-dark';
              } else if (isSelected) {
                bgClass = 'bg-primary-200/80 dark:bg-primary-800/40';
              } else if (isHighlighted) {
                bgClass = 'bg-primary-50 dark:bg-primary-950/20';
              }

              // Text color — blue/orange for check (color-blind safe)
              let textClass = 'text-stone-900 dark:text-stone-100';
              if (checkStatus === 'correct') {
                textClass = 'text-blue-600 dark:text-blue-400';
              } else if (checkStatus === 'incorrect') {
                textClass = 'text-orange-600 dark:text-orange-400';
              } else if (isRevealed) {
                textClass = 'text-primary-600 dark:text-primary-400';
              }

              return (
                <div
                  key={key}
                  role="gridcell"
                  aria-label={ariaLabel}
                  aria-selected={isSelected}
                  onClick={() => {
                    if (!isEmpty) onCellClick(x, y);
                  }}
                  className={`
                    relative w-10 h-10 sm:w-12 sm:h-12
                    border border-grid-border dark:border-grid-border-dark
                    flex items-center justify-center cursor-pointer select-none
                    transition-colors duration-75
                    ${bgClass}
                    ${!isEmpty && !isSelected ? 'hover:bg-primary-50/60 dark:hover:bg-primary-950/15' : ''}
                    ${isPopping ? 'animate-cell-pop' : ''}
                  `}
                  style={isSelected ? {
                    boxShadow: '0 0 0 2px rgba(82,88,228,0.35)',
                  } : undefined}
                >
                  {cellNumber !== undefined && (
                    <span className="absolute top-0.5 left-1 text-[9px] sm:text-[10px] font-medium leading-none text-stone-500 dark:text-stone-400">
                      {cellNumber}
                    </span>
                  )}

                  {!isEmpty && userLetter && (
                    <span className={`text-sm sm:text-base font-semibold uppercase ${textClass}`}>
                      {userLetter}
                    </span>
                  )}

                  {/* Direction indicator */}
                  {isSelected && (
                    <div className={`absolute ${isAcross ? 'bottom-0 left-0 right-0 h-0.5' : 'top-0 bottom-0 right-0 w-0.5'} bg-primary-500`} />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {/* Screen reader announcements */}
      <div aria-live="polite" className="sr-only">{announcement}</div>
    </div>
  );
}
