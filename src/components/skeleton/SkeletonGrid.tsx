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

import { useMemo, useRef } from 'react';
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
  /** Cells currently in the green "matched" flash (keys = "x,y"). */
  matchFlashCells: Set<string>;
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
  matchFlashCells,
  onCellClick,
}: SkeletonGridProps) {
  // Track which slot "owns" each crossing cell across renders.
  // Incumbent's letter stays until their word is cleared.
  const cellOwners = useRef<Map<string, number>>(new Map());

  const cellInfo = useMemo(() => {
    const { map, owners } = buildCellInfoMap(grid, width, height, slots, userFills, cellOwners.current);
    cellOwners.current = owners;
    return map;
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

  // Cells where all crossing slots are must-include — immune to green flash.
  // Now that phantom bank word slots are filtered at the source, each cell
  // has at most 2 slot entries (one across, one down).
  const preplacedCrossingCells = useMemo(() => {
    const cellFlags = new Map<string, boolean[]>();
    for (const slot of slots) {
      for (let i = 0; i < slot.length; i++) {
        const x = slot.direction === 'across' ? slot.startX + i : slot.startX;
        const y = slot.direction === 'across' ? slot.startY : slot.startY + i;
        const key = `${x},${y}`;
        const arr = cellFlags.get(key);
        if (arr) arr.push(slot.isUserWord); else cellFlags.set(key, [slot.isUserWord]);
      }
    }
    const immune = new Set<string>();
    for (const [key, flags] of cellFlags) {
      if (flags.length >= 2 && flags.every(f => f)) immune.add(key);
    }
    return immune;
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

            // Get the display letter and crossing state
            const letter = info?.letter ?? '';
            const isConstraintLetter = info?.isConstraint ?? false;
            const crossing = info?.crossing ?? 'none';

            // Should this cell flash green? Only if it's NOT a crossing
            // between two must-include words. Check slots directly.
            let canFlashGreen = false;
            if (matchFlashCells.has(key)) {
              // Count how many must-include slots touch this cell
              let mustCountHere = 0;
              for (const s of slots) {
                if (!s.isUserWord) continue;
                for (let si = 0; si < s.length; si++) {
                  const sx = s.direction === 'across' ? s.startX + si : s.startX;
                  const sy = s.direction === 'across' ? s.startY : s.startY + si;
                  if (sx === x && sy === y) { mustCountHere++; break; }
                }
              }
              canFlashGreen = mustCountHere < 2;
            }

            // Cell background
            let bgClass: string;
            if (isBlocked) {
              bgClass = 'bg-grid-blocked dark:bg-grid-blocked-dark';
            } else if (crossing === 'conflict') {
              bgClass = 'bg-red-100 dark:bg-red-900/30';
            } else if (canFlashGreen) {
              bgClass = 'bg-emerald-100 dark:bg-emerald-900/30 transition-colors duration-500';
            } else if (crossing === 'partial') {
              bgClass = 'bg-amber-100 dark:bg-amber-900/20';
            } else if (isFilled) {
              bgClass = 'bg-primary-50 dark:bg-primary-950/30';
            } else {
              bgClass = 'bg-grid-cell dark:bg-grid-cell-dark cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-800/60';
            }

            // Selection: shown as a distinct border ring, not background
            const selectionClass = isSelected
              ? 'ring-2 ring-primary-500 dark:ring-primary-400 ring-inset'
              : '';

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
                  ${bgClass} ${selectionClass}
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

/**
 * Crossing state for cells shared by two slots:
 *   - 'none'    — not a crossing (only one slot touches this cell)
 *   - 'partial' — crossing, but only one word has filled this position
 *   - 'matched' — both words filled and the letters agree
 *   - 'conflict'— both words filled but the letters disagree
 */
type CrossingState = 'none' | 'partial' | 'matched' | 'conflict';

interface CellInfo {
  type: 'blocked' | 'filled' | 'slot';
  letter: string;
  isConstraint: boolean;
  crossing: CrossingState;
  slotId?: number;
}

/**
 * Build a map of (x,y) → cell rendering info.
 * Merges data from the grid, slots, and user fills.
 */
/**
 * Build cell info map with INCUMBENT OWNERSHIP at crossing cells:
 *   - First letter written to a crossing cell becomes the "incumbent"
 *   - The incumbent's letter stays until their word is cleared
 *   - When cleared, the other crossing slot's letter takes over as new incumbent
 *   - A newly typed word cannot displace an existing incumbent
 *
 * @param prevOwners - ownership map from the previous render
 * @returns { map, owners } — the cell info map and updated ownership map
 */
function buildCellInfoMap(
  grid: string[][],
  width: number,
  height: number,
  slots: SkeletonSlot[],
  userFills: Map<number, string>,
  prevOwners: Map<string, number>,
): { map: Map<string, CellInfo>; owners: Map<string, number> } {
  const map = new Map<string, CellInfo>();
  const owners = new Map<string, number>();

  // Collect each slot's current letter at each cell
  const cellSlotLetters = new Map<string, { slotId: number; letter: string; isUserWord: boolean }[]>();

  for (const slot of slots) {
    const word = slot.isUserWord ? slot.word! : (userFills.get(slot.id) ?? '');
    for (let i = 0; i < slot.length; i++) {
      const x = slot.direction === 'across' ? slot.startX + i : slot.startX;
      const y = slot.direction === 'across' ? slot.startY : slot.startY + i;
      const key = `${x},${y}`;
      const letter = i < word.length ? word[i] : '';
      const entries = cellSlotLetters.get(key);
      const entry = { slotId: slot.id, letter, isUserWord: slot.isUserWord };
      if (entries) entries.push(entry); else cellSlotLetters.set(key, [entry]);
    }
  }

  // Initialize all cells as blocked
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const key = `${x},${y}`;
      const gridChar = grid[y]?.[x] ?? EMPTY_CELL;
      if (gridChar !== EMPTY_CELL) {
        map.set(key, { type: 'filled', letter: gridChar, isConstraint: false, crossing: 'none' });
      } else {
        map.set(key, { type: 'blocked', letter: '', isConstraint: false, crossing: 'none' });
      }
    }
  }

  // Process each slot's cells
  for (const slot of slots) {
    for (let i = 0; i < slot.length; i++) {
      const x = slot.direction === 'across' ? slot.startX + i : slot.startX;
      const y = slot.direction === 'across' ? slot.startY : slot.startY + i;
      const key = `${x},${y}`;

      const entries = cellSlotLetters.get(key) ?? [];
      const crossing = computeCrossingState(entries);

      if (slot.isUserWord) {
        map.set(key, {
          type: 'filled', letter: slot.word![i] ?? '',
          isConstraint: false, crossing, slotId: slot.id,
        });
        continue;
      }

      const existing = map.get(key);
      if (existing && existing.type === 'filled') {
        existing.crossing = crossing;
        continue;
      }

      // Already processed this cell from another slot — skip
      if (existing && existing.type === 'slot') {
        existing.crossing = crossing;
        continue;
      }

      // Pick the display letter using INCUMBENT OWNERSHIP
      const { letter: displayLetter, ownerId } = pickIncumbentLetter(entries, prevOwners.get(key));
      const constraintLetter = slot.constraints.get(i) ?? '';

      if (ownerId !== undefined) {
        owners.set(key, ownerId);
      }

      map.set(key, {
        type: 'slot',
        letter: displayLetter || constraintLetter,
        isConstraint: !displayLetter && !!constraintLetter,
        crossing,
        slotId: slot.id,
      });
    }
  }

  return { map, owners };
}

/**
 * Pick which letter to display at a crossing cell using incumbent ownership.
 *
 * Rules:
 *   1. If the previous owner still has a letter → they keep it
 *   2. If the previous owner's letter was cleared → the other slot takes over
 *   3. If no previous owner → first slot with a letter wins
 */
function pickIncumbentLetter(
  entries: { slotId: number; letter: string }[],
  prevOwnerId: number | undefined,
): { letter: string; ownerId: number | undefined } {
  if (entries.length === 0) return { letter: '', ownerId: undefined };
  if (entries.length === 1) return { letter: entries[0].letter, ownerId: entries[0].letter ? entries[0].slotId : undefined };

  // Check if previous incumbent still has a letter
  if (prevOwnerId !== undefined) {
    const incumbent = entries.find(e => e.slotId === prevOwnerId);
    if (incumbent && incumbent.letter) {
      return { letter: incumbent.letter, ownerId: prevOwnerId };
    }
  }

  // Incumbent cleared or no previous owner — first slot with a letter takes over
  for (const entry of entries) {
    if (entry.letter) {
      return { letter: entry.letter, ownerId: entry.slotId };
    }
  }

  return { letter: '', ownerId: undefined };
}

/**
 * Determine crossing state from letters contributed by each slot at a cell.
 *
 * Crossings where ALL contributing slots are must-include (pre-placed)
 * return 'none' — they're always correct and need no visual indicator.
 */
function computeCrossingState(entries: { slotId: number; letter: string; isUserWord: boolean }[]): CrossingState {
  if (entries.length < 2) return 'none';

  // Pre-placed must-include crossings are always correct — no indicator needed
  if (entries.every(e => e.isUserWord)) return 'none';

  const filled = entries.filter(e => e.letter.length > 0);
  if (filled.length < 2) {
    return filled.length > 0 ? 'partial' : 'none';
  }

  const allSame = filled.every(e => e.letter === filled[0].letter);
  return allSame ? 'matched' : 'conflict';
}
