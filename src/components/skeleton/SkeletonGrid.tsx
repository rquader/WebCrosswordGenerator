/**
 * Visual skeleton grid — shows the crossword structure with:
 *   - Filled cells (must-include words) with letters
 *   - Empty slot cells (to be filled) with constraint letters or blank
 *   - Blocked cells (no word)
 *   - Cell numbers at word starts
 *   - Highlight for the currently selected slot
 *
 * This is the core visual for the skeleton-first approach.
 */

import { useMemo } from 'react';
import type { SkeletonSlot } from '../../logic/types';

interface SkeletonGridProps {
  /** The raw grid (may have '-' for empty/blocked). */
  grid: string[][];
  width: number;
  height: number;
  /** All skeleton slots (filled + empty). */
  slots: SkeletonSlot[];
  /** Words the user has typed into empty slots (slotId → word string). */
  userFills: Map<number, string>;
  /** Currently selected slot ID, for highlighting. */
  selectedSlotId: number | null;
  /** Called when the user clicks a cell in the grid. */
  onCellClick?: (x: number, y: number) => void;
}

const EMPTY_CELL = '-';

export function SkeletonGrid({
  grid,
  width,
  height,
  slots,
  userFills,
  selectedSlotId,
  onCellClick,
}: SkeletonGridProps) {
  // Build a map of (x,y) → cell info for fast lookup during render
  const cellInfo = useMemo(() => {
    return buildCellInfoMap(grid, width, height, slots, userFills);
  }, [grid, width, height, slots, userFills]);

  // Build number map (slot start positions → number)
  const numberMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const slot of slots) {
      const key = `${slot.startX},${slot.startY}`;
      if (!map.has(key)) {
        map.set(key, slot.id);
      }
    }
    return map;
  }, [slots]);

  // Build selected slot cell set for highlighting
  const selectedCells = useMemo(() => {
    const set = new Set<string>();
    if (selectedSlotId === null) return set;
    const slot = slots.find(s => s.id === selectedSlotId);
    if (!slot) return set;
    for (let i = 0; i < slot.length; i++) {
      const x = slot.direction === 'across' ? slot.startX + i : slot.startX;
      const y = slot.direction === 'across' ? slot.startY : slot.startY + i;
      set.add(`${x},${y}`);
    }
    return set;
  }, [selectedSlotId, slots]);

  const totalCells = width * height;

  return (
    <div className="inline-block relative noise-texture rounded-lg" aria-label="Skeleton grid">
      <div
        role="grid"
        className="grid gap-0 border-2 border-stone-700 dark:border-stone-500/70 rounded-sm overflow-hidden"
        style={{
          gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: height }, (_, y) =>
          Array.from({ length: width }, (_, x) => {
            const key = `${x},${y}`;
            const info = cellInfo.get(key);
            const cellNumber = numberMap.get(key);
            const isSelected = selectedCells.has(key);
            const cellIndex = y * width + x;
            const delay = Math.min(cellIndex * (600 / totalCells), 600);

            // Determine cell type
            const isBlocked = !info || info.type === 'blocked';
            const isFilled = info?.type === 'filled';
            const isSlotCell = info?.type === 'slot';

            // Get the display letter
            const letter = info?.letter ?? '';
            const isConstraintLetter = info?.isConstraint ?? false;

            return (
              <div
                key={key}
                role="gridcell"
                onClick={() => onCellClick?.(x, y)}
                className={`
                  relative w-10 h-10 sm:w-12 sm:h-12
                  border border-grid-border dark:border-grid-border-dark
                  flex items-center justify-center
                  grid-stagger
                  transition-colors duration-150
                  ${isBlocked
                    ? 'bg-grid-blocked dark:bg-grid-blocked-dark'
                    : isFilled
                      ? 'bg-primary-50 dark:bg-primary-950/30'
                      : isSelected
                        ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-400 dark:border-amber-600/60'
                        : 'bg-grid-cell dark:bg-grid-cell-dark cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-800/60'
                  }
                `}
                style={{ animationDelay: `${delay}ms` }}
              >
                {/* Cell number */}
                {cellNumber !== undefined && (
                  <span className="absolute top-0.5 left-1 text-[9px] sm:text-[10px] font-medium leading-none text-stone-500 dark:text-stone-400">
                    {cellNumber}
                  </span>
                )}

                {/* Letter */}
                {letter && (
                  <span className={`text-sm sm:text-base font-semibold uppercase select-none
                    ${isFilled
                      ? 'text-primary-700 dark:text-primary-300'
                      : isConstraintLetter
                        ? 'text-primary-500 dark:text-primary-400'
                        : 'text-stone-800 dark:text-stone-100'
                    }
                  `}>
                    {letter}
                  </span>
                )}

                {/* Empty slot indicator (dot for unfilled cells) */}
                {isSlotCell && !letter && (
                  <span className="w-1.5 h-1.5 rounded-full bg-stone-300 dark:bg-stone-600" />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cell info computation
// ---------------------------------------------------------------------------

interface CellInfo {
  type: 'blocked' | 'filled' | 'slot';
  letter: string;
  isConstraint: boolean;
  slotId?: number;
}

/**
 * Build a map of (x,y) → cell rendering info.
 * Merges data from the grid, slots, and user fills.
 */
function buildCellInfoMap(
  grid: string[][],
  width: number,
  height: number,
  slots: SkeletonSlot[],
  userFills: Map<number, string>,
): Map<string, CellInfo> {
  const map = new Map<string, CellInfo>();

  // First pass: mark all cells as blocked
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const key = `${x},${y}`;
      const gridChar = grid[y]?.[x] ?? EMPTY_CELL;

      if (gridChar !== EMPTY_CELL) {
        // Cell has a letter from the original generation
        map.set(key, { type: 'filled', letter: gridChar, isConstraint: false });
      } else {
        map.set(key, { type: 'blocked', letter: '', isConstraint: false });
      }
    }
  }

  // Second pass: mark cells belonging to slots
  for (const slot of slots) {
    const userWord = slot.isUserWord ? slot.word! : (userFills.get(slot.id) ?? '');

    for (let i = 0; i < slot.length; i++) {
      const x = slot.direction === 'across' ? slot.startX + i : slot.startX;
      const y = slot.direction === 'across' ? slot.startY : slot.startY + i;
      const key = `${x},${y}`;

      if (slot.isUserWord) {
        // Pre-filled (must-include word)
        map.set(key, {
          type: 'filled',
          letter: slot.word![i] ?? '',
          isConstraint: false,
          slotId: slot.id,
        });
      } else {
        // Empty slot — show user-typed letter or constraint letter
        const userLetter = i < userWord.length ? userWord[i] : '';
        const constraintLetter = slot.constraints.get(i) ?? '';
        const existing = map.get(key);

        // Don't overwrite a filled cell from another slot
        if (existing && existing.type === 'filled') continue;

        map.set(key, {
          type: 'slot',
          letter: userLetter || constraintLetter,
          isConstraint: !userLetter && !!constraintLetter,
          slotId: slot.id,
        });
      }
    }
  }

  return map;
}
