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
import {
  GRID_PAN, GRID_PAGE, GRID_FRAME,
  CELL_BASE, CELL_PAPER, CELL_BLOCKED, CELL_NUMBER,
  gridSizingStyle, NUMBER_FONT_SIZE, LETTER_FONT_SIZE,
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
    <div className={GRID_PAN}>
      <div
        ref={gridRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className={`${GRID_PAGE} outline-none`}
        aria-label="Crossword puzzle grid"
      >
      <div
        role="grid"
        className={GRID_FRAME}
        style={gridSizingStyle(puzzle.width, 34, 50)}
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
                  role="gridcell"
                  aria-label={ariaLabel}
                  aria-selected={isSelected}
                  onClick={() => {
                    if (!isEmpty) onCellClick(x, y);
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
      </div>
      {/* Screen reader announcements */}
      <div aria-live="polite" className="sr-only">{announcement}</div>
      </div>
    </div>
  );
}
