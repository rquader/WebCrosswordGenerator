/**
 * Skeleton fill view — the main workspace for filling blank skeleton slots.
 *
 * Layout:
 *   - Top: visual skeleton grid (SkeletonGrid) showing the crossword structure
 *   - Bottom: scrollable slot list with word + clue inputs per empty slot
 *   - Status bar with fill count, conflict count
 *   - Actions: "Different layout", "Create Puzzle"
 *
 * The user clicks a slot in the grid or the list to select it,
 * types a word, and sees constraint letters update in real time.
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import type { SkeletonResult, SkeletonSlot } from '../../logic/types';
import { SkeletonGrid } from './SkeletonGrid';

/** Filled slot data passed back on completion. */
export interface FilledSlotData {
  slotId: number;
  word: string;
  clue: string;
}

interface SkeletonFillViewProps {
  skeleton: SkeletonResult;
  /** Called with all user-filled slot data when "Create Puzzle" is clicked. */
  onComplete: (filledSlots: FilledSlotData[]) => void;
  onRegenerate: () => void;
  onBack: () => void;
}

/** Internal state for each slot being edited. */
interface SlotEditState {
  word: string;
  clue: string;
}

export function SkeletonFillView({
  skeleton,
  onComplete,
  onRegenerate,
  onBack,
}: SkeletonFillViewProps) {
  const [slotEdits, setSlotEdits] = useState<Map<number, SlotEditState>>(() => {
    const initial = new Map<number, SlotEditState>();
    for (const slot of skeleton.slots) {
      if (!slot.isUserWord) {
        initial.set(slot.id, { word: '', clue: '' });
      }
    }
    return initial;
  });

  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(() => {
    const firstEmpty = skeleton.slots.find(s => !s.isUserWord);
    return firstEmpty?.id ?? null;
  });

  // Track cells that just matched (for green flash effect).
  // Key = "x,y", value = timeout ID for cleanup.
  const [matchFlashCells, setMatchFlashCells] = useState<Set<string>>(new Set());
  const flashTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Build user fills map for the grid (slotId → word string)
  const userFills = useMemo(() => {
    const map = new Map<number, string>();
    for (const [id, edit] of slotEdits) {
      if (edit.word.length > 0) {
        map.set(id, edit.word);
      }
    }
    return map;
  }, [slotEdits]);

  // Compute live constraints
  const liveConstraints = useMemo(() => {
    return computeLiveConstraints(skeleton.slots, slotEdits);
  }, [skeleton.slots, slotEdits]);

  // Compute conflicts
  const conflicts = useMemo(() => {
    return computeConflicts(skeleton.slots, slotEdits, liveConstraints);
  }, [skeleton.slots, slotEdits, liveConstraints]);

  const emptySlots = skeleton.slots.filter(s => !s.isUserWord);
  const filledCount = countFilledSlots(emptySlots, slotEdits);
  const totalEmpty = emptySlots.length;
  const conflictCount = conflicts.size;
  const canFinalize = filledCount > 0 && conflictCount === 0;

  const handleWordChange = useCallback((slotId: number, word: string) => {
    setSlotEdits(prev => {
      const next = new Map(prev);
      const current = next.get(slotId) ?? { word: '', clue: '' };
      next.set(slotId, { ...current, word: word.toLowerCase().replace(/[^a-z]/g, '') });
      return next;
    });
  }, []);

  const handleClueChange = useCallback((slotId: number, clue: string) => {
    setSlotEdits(prev => {
      const next = new Map(prev);
      const current = next.get(slotId) ?? { word: '', clue: '' };
      next.set(slotId, { ...current, clue });
      return next;
    });
  }, []);

  // Detect crossing cells that just became matched → trigger green flash
  const prevCrossingRef = useRef<Map<string, string>>(new Map());
  useEffect(() => {
    // Build current crossing states from the grid data
    const currentCrossing = computeCrossingCellStates(skeleton.slots, slotEdits);
    const prev = prevCrossingRef.current;

    const cellsToFlash: string[] = [];
    const cellsToClear: string[] = [];

    for (const [cellKey, state] of currentCrossing) {
      const prevState = prev.get(cellKey);
      if (state === 'matched' && prevState !== 'matched') {
        // This cell just became matched — queue green flash
        cellsToFlash.push(cellKey);
      } else if (state !== 'matched' && prevState === 'matched') {
        // This cell was matched but no longer is (letter deleted) — clear immediately
        cellsToClear.push(cellKey);
      }
    }

    // Also clear flash for cells that disappeared from currentCrossing entirely
    for (const cellKey of prev.keys()) {
      if (!currentCrossing.has(cellKey)) {
        cellsToClear.push(cellKey);
      }
    }

    if (cellsToClear.length > 0) {
      setMatchFlashCells(s => {
        const next = new Set(s);
        for (const key of cellsToClear) {
          next.delete(key);
          const timer = flashTimers.current.get(key);
          if (timer) { clearTimeout(timer); flashTimers.current.delete(key); }
        }
        return next;
      });
    }

    if (cellsToFlash.length > 0) {
      setMatchFlashCells(s => {
        const next = new Set(s);
        for (const key of cellsToFlash) {
          next.add(key);
          const existing = flashTimers.current.get(key);
          if (existing) clearTimeout(existing);
          const timer = setTimeout(() => {
            setMatchFlashCells(ss => { const nn = new Set(ss); nn.delete(key); return nn; });
            flashTimers.current.delete(key);
          }, 3000);
          flashTimers.current.set(key, timer);
        }
        return next;
      });
    }

    prevCrossingRef.current = currentCrossing;
  }, [skeleton.slots, slotEdits]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      for (const timer of flashTimers.current.values()) clearTimeout(timer);
    };
  }, []);

  // Collect filled data and pass to parent
  function handleFinalize() {
    const filled: FilledSlotData[] = [];
    for (const slot of emptySlots) {
      const edit = slotEdits.get(slot.id);
      if (edit && edit.word.length === slot.length) {
        filled.push({ slotId: slot.id, word: edit.word, clue: edit.clue });
      }
    }
    onComplete(filled);
  }

  // When user clicks a cell in the grid, select the slot at that cell
  function handleCellClick(x: number, y: number) {
    for (const slot of skeleton.slots) {
      if (slot.isUserWord) continue;
      for (let i = 0; i < slot.length; i++) {
        const sx = slot.direction === 'across' ? slot.startX + i : slot.startX;
        const sy = slot.direction === 'across' ? slot.startY : slot.startY + i;
        if (sx === x && sy === y) {
          setSelectedSlotId(slot.id);
          return;
        }
      }
    }
  }

  // Filter out flash cells where all crossing slots are must-include.
  const filteredFlashCells = useMemo(() => {
    if (matchFlashCells.size === 0) return matchFlashCells;
    const cellFlags = new Map<string, boolean[]>();
    for (const slot of skeleton.slots) {
      for (let i = 0; i < slot.length; i++) {
        const x = slot.direction === 'across' ? slot.startX + i : slot.startX;
        const y = slot.direction === 'across' ? slot.startY : slot.startY + i;
        const key = `${x},${y}`;
        const arr = cellFlags.get(key);
        if (arr) arr.push(slot.isUserWord); else cellFlags.set(key, [slot.isUserWord]);
      }
    }
    const filtered = new Set<string>();
    for (const key of matchFlashCells) {
      const flags = cellFlags.get(key);
      const allMustInclude = flags && flags.length >= 2 && flags.every(f => f);
      if (!allMustInclude) filtered.add(key);
    }
    return filtered;
  }, [matchFlashCells, skeleton.slots]);

  return (
    <div className="space-y-4">
      {/* Status bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-sm">
          <span className={filledCount === totalEmpty
            ? 'text-primary-600 dark:text-primary-400 font-semibold'
            : 'text-stone-500 dark:text-stone-400'}>
            {filledCount}/{totalEmpty} slots filled
          </span>
          {conflictCount > 0 && (
            <span className="text-amber-600 dark:text-amber-400 font-medium">
              {conflictCount} conflict{conflictCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <span className="text-xs text-stone-400 dark:text-stone-500">
          {skeleton.mustPlacedCount}/{skeleton.mustTotalCount} must-include placed
        </span>
      </div>

      {/* Failure warnings */}
      {skeleton.failures.length > 0 && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-800/40 bg-amber-50/60 dark:bg-amber-950/20 px-3 py-2">
          <p className="text-xs font-medium text-amber-700 dark:text-amber-300 mb-1">
            Some must-include words couldn't be placed:
          </p>
          {skeleton.failures.map((f, i) => (
            <p key={i} className="text-xs text-amber-600 dark:text-amber-400">
              <span className="font-mono uppercase">{f.word}</span>
              {' '}&mdash; {f.reason === 'too_long' ? 'too long for grid' : 'no valid intersection'}
            </p>
          ))}
        </div>
      )}

      {/* Visual skeleton grid */}
      <div className="flex justify-center">
        <SkeletonGrid
          grid={skeleton.grid}
          width={skeleton.width}
          height={skeleton.height}
          slots={skeleton.slots}
          userFills={userFills}
          selectedSlotId={selectedSlotId}
          matchFlashCells={filteredFlashCells}
          onCellClick={handleCellClick}
        />
      </div>

      {/* Slot fill list */}
      <div className="warm-card p-4 space-y-2 max-h-[40vh] overflow-y-auto scrollbar-thin">
        <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-2">
          Fill the slots
        </p>
        {skeleton.slots.map(slot => {
          if (slot.isUserWord) {
            return <FilledSlotRow key={slot.id} slot={slot} />;
          }
          const edit = slotEdits.get(slot.id) ?? { word: '', clue: '' };
          const constraints = liveConstraints.get(slot.id) ?? slot.constraints;
          const hasConflict = conflicts.has(slot.id);
          const isSelected = selectedSlotId === slot.id;

          return (
            <EmptySlotRow
              key={slot.id}
              slot={slot}
              edit={edit}
              constraints={constraints}
              hasConflict={hasConflict}
              isSelected={isSelected}
              onSelect={() => setSelectedSlotId(slot.id)}
              onWordChange={(w) => handleWordChange(slot.id, w)}
              onClueChange={(c) => handleClueChange(slot.id, c)}
            />
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-3">
        <button onClick={onBack}
          className="px-4 py-2 rounded-xl border border-stone-300 dark:border-stone-600
                     text-sm text-stone-600 dark:text-stone-400
                     hover:bg-stone-50 dark:hover:bg-surface-dark-hover transition-all btn-lift">
          Back
        </button>
        <div className="flex gap-2">
          <button onClick={onRegenerate}
            className="px-4 py-2 rounded-xl border border-stone-300 dark:border-stone-600
                       text-sm text-stone-600 dark:text-stone-400
                       hover:bg-stone-50 dark:hover:bg-surface-dark-hover transition-all btn-lift">
            Different layout
          </button>
          <button onClick={handleFinalize} disabled={!canFinalize}
            className="px-4 py-2 rounded-xl text-sm font-semibold
                       bg-gradient-to-r from-primary-600 to-primary-700
                       hover:from-primary-700 hover:to-primary-800
                       text-white shadow-md btn-lift
                       disabled:opacity-50 disabled:cursor-not-allowed">
            Create Puzzle
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function FilledSlotRow({ slot }: { slot: SkeletonSlot }) {
  return (
    <div className="rounded-lg border border-primary-200/60 dark:border-primary-800/30 bg-primary-50/40 dark:bg-primary-950/10 px-3 py-1.5 flex items-center gap-2">
      <span className="text-xs font-mono text-primary-600 dark:text-primary-400 w-16 flex-shrink-0">
        {slot.id}-{slot.direction === 'across' ? 'A' : 'D'}
      </span>
      <span className="text-sm font-medium text-primary-700 dark:text-primary-300 uppercase tracking-wide">
        {slot.word}
      </span>
      <span className="text-xs text-stone-400 dark:text-stone-500 ml-auto truncate max-w-[10rem]">
        {slot.clue}
      </span>
    </div>
  );
}

function EmptySlotRow({
  slot, edit, constraints, hasConflict, isSelected, onSelect, onWordChange, onClueChange,
}: {
  slot: SkeletonSlot;
  edit: { word: string; clue: string };
  constraints: Map<number, string>;
  hasConflict: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onWordChange: (word: string) => void;
  onClueChange: (clue: string) => void;
}) {
  const pattern = buildConstraintPattern(slot.length, constraints);
  const lengthOk = edit.word.length === 0 || edit.word.length === slot.length;

  return (
    <div onClick={onSelect}
      className={`rounded-lg border px-3 py-2 transition-all cursor-pointer
        ${hasConflict
          ? 'border-amber-300 dark:border-amber-700/60 bg-amber-50/40 dark:bg-amber-950/10'
          : isSelected
            ? 'border-primary-400 dark:border-primary-600/60 bg-white dark:bg-surface-dark-alt shadow-sm'
            : 'border-stone-200 dark:border-stone-700/60 bg-white/60 dark:bg-surface-dark-alt/40'}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-xs font-mono text-stone-500 dark:text-stone-400 w-16 flex-shrink-0">
          {slot.id}-{slot.direction === 'across' ? 'A' : 'D'}
        </span>
        <span className="text-sm font-mono tracking-widest text-stone-500 dark:text-stone-400">
          {pattern}
        </span>
        <span className="text-xs text-stone-400 dark:text-stone-500 ml-auto">
          {slot.length} letters
        </span>
      </div>
      <div className="flex gap-2">
        <input type="text" value={edit.word} onChange={(e) => onWordChange(e.target.value)}
          placeholder={`${slot.length}-letter word`} maxLength={slot.length}
          onClick={(e) => e.stopPropagation()}
          className={`flex-1 rounded-md border px-2 py-1 text-sm font-mono uppercase
                     bg-white dark:bg-surface-dark-hover text-stone-900 dark:text-stone-100
                     placeholder:text-stone-400 dark:placeholder:text-stone-500
                     focus:outline-none focus:ring-2 focus:ring-primary-500 transition-shadow
                     ${!lengthOk ? 'border-red-300 dark:border-red-700' : 'border-stone-300 dark:border-stone-600'}`} />
        <input type="text" value={edit.clue} onChange={(e) => onClueChange(e.target.value)}
          placeholder="Clue" onClick={(e) => e.stopPropagation()}
          className="flex-[2] rounded-md border border-stone-300 dark:border-stone-600 px-2 py-1 text-sm
                     bg-white dark:bg-surface-dark-hover text-stone-900 dark:text-stone-100
                     placeholder:text-stone-400 dark:placeholder:text-stone-500
                     focus:outline-none focus:ring-2 focus:ring-primary-500 transition-shadow" />
      </div>
      {hasConflict && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Letter conflict with a crossing word</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Logic helpers
// ---------------------------------------------------------------------------

function buildConstraintPattern(length: number, constraints: Map<number, string>): string {
  const chars: string[] = [];
  for (let i = 0; i < length; i++) {
    chars.push(constraints.has(i) ? constraints.get(i)!.toUpperCase() : '_');
  }
  return chars.join(' ');
}

function computeLiveConstraints(slots: SkeletonSlot[], edits: Map<number, SlotEditState>): Map<number, Map<number, string>> {
  const result = new Map<number, Map<number, string>>();
  for (const slot of slots) {
    if (slot.isUserWord) continue;
    const constraints = new Map(slot.constraints);
    for (const other of slots) {
      const otherWord = other.isUserWord ? other.word! : edits.get(other.id)?.word ?? '';
      if (!otherWord || other.id === slot.id) continue;
      for (let pos = 0; pos < slot.length; pos++) {
        const x = slot.direction === 'across' ? slot.startX + pos : slot.startX;
        const y = slot.direction === 'across' ? slot.startY : slot.startY + pos;
        for (let op = 0; op < other.length; op++) {
          const ox = other.direction === 'across' ? other.startX + op : other.startX;
          const oy = other.direction === 'across' ? other.startY : other.startY + op;
          if (ox === x && oy === y && op < otherWord.length) {
            constraints.set(pos, otherWord[op]);
          }
        }
      }
    }
    result.set(slot.id, constraints);
  }
  return result;
}

function computeConflicts(slots: SkeletonSlot[], edits: Map<number, SlotEditState>, liveConstraints: Map<number, Map<number, string>>): Set<number> {
  const conflicting = new Set<number>();
  for (const slot of slots) {
    if (slot.isUserWord) continue;
    const edit = edits.get(slot.id);
    if (!edit || !edit.word) continue;
    const constraints = liveConstraints.get(slot.id);
    if (!constraints) continue;
    for (const [pos, letter] of constraints) {
      if (pos < edit.word.length && edit.word[pos] !== letter) {
        conflicting.add(slot.id);
        break;
      }
    }
  }
  return conflicting;
}

function countFilledSlots(emptySlots: SkeletonSlot[], edits: Map<number, SlotEditState>): number {
  let n = 0;
  for (const slot of emptySlots) {
    const edit = edits.get(slot.id);
    if (edit && edit.word.length === slot.length) n++;
  }
  return n;
}

/**
 * Compute crossing state per cell (used for green flash detection).
 * Returns a map of "x,y" → 'partial' | 'matched' | 'conflict'.
 *
 * Crossings where BOTH slots are must-include (pre-placed by the generator)
 * are excluded — they're always correct and should never flash green.
 * The flash is only meaningful when a user-typed word matches a crossing.
 */
function computeCrossingCellStates(
  slots: SkeletonSlot[],
  edits: Map<number, SlotEditState>,
): Map<string, string> {
  // Collect letters + whether the slot is user-placed at each cell
  const cellEntries = new Map<string, { letter: string; isUserWord: boolean }[]>();
  for (const slot of slots) {
    const word = slot.isUserWord ? slot.word! : (edits.get(slot.id)?.word ?? '');
    for (let i = 0; i < slot.length; i++) {
      const x = slot.direction === 'across' ? slot.startX + i : slot.startX;
      const y = slot.direction === 'across' ? slot.startY : slot.startY + i;
      const key = `${x},${y}`;
      const letter = i < word.length ? word[i] : '';
      const existing = cellEntries.get(key);
      const entry = { letter, isUserWord: slot.isUserWord };
      if (existing) existing.push(entry); else cellEntries.set(key, [entry]);
    }
  }

  const result = new Map<string, string>();
  for (const [key, entries] of cellEntries) {
    if (entries.length < 2) continue;

    // Skip crossings where all slots are must-include (pre-placed).
    if (entries.every(e => e.isUserWord)) continue;

    const filled = entries.filter(e => e.letter.length > 0);
    if (filled.length < 2) {
      result.set(key, filled.length > 0 ? 'partial' : 'none');
    } else {
      result.set(key, filled.every(e => e.letter === filled[0].letter) ? 'matched' : 'conflict');
    }
  }
  return result;
}
