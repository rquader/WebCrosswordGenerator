/**
 * Grid designer — the "build your own grid" workspace.
 *
 * The user paints a crossword skeleton by hand: every cell is open (paper) or a
 * block (ink). We read the geometry back as word slots in real time and show a
 * plain-language readout — slot count, longest/shortest, stray cells, and a
 * "separate sections" warning — so the grid reads like a real skeleton while
 * it's being drawn. Numbers sit on slot-start cells exactly as the finished
 * puzzle will number them.
 *
 * It owns a BlockMask in state and mutates it through the tested, immutable
 * gridMaskOps helpers (structural sharing keeps re-renders cheap). When the
 * user clicks "Fill this grid" we hand the mask up; the parent derives slots
 * and routes into the existing skeleton-fill workspace. This component never
 * touches the generator, auto-sizing, or any structure-changing knob — the
 * grid is exactly what the user drew.
 *
 * Mirrors SkeletonGrid's print-style rendering (GRID_PAN/PAGE/FRAME, the cell
 * tokens, the start-cell number map) so it reads as the same printed page.
 */

import { useEffect, useMemo, useRef, type Dispatch, type SetStateAction } from 'react';
import type { BlockMask } from '../../logic/gridSkeleton';
import { deriveSlotsFromBlockMask } from '../../logic/gridSkeleton';
import {
  computeGridDesignerStats,
  type GridDesignerStats,
} from '../../logic/gridDesignerStats';
import {
  DEFAULT_GRID_SIDE,
  MIN_GRID_SIDE,
  MAX_GRID_SIDE,
  clampGridSide,
  createBlockMask,
  resizeBlockMask,
  setCell,
} from '../../logic/gridMaskOps';
import {
  GRID_PAN, GRID_PAGE, GRID_FRAME,
  CELL_BASE, CELL_PAPER, CELL_BLOCKED, CELL_NUMBER,
  gridSizingStyle, NUMBER_FONT_SIZE,
} from '../grid/gridStyles';

/** The drawing the designer owns, lifted so it survives leaving the editor. */
export interface GridDraft {
  mask: BlockMask;
  width: number;
  height: number;
}

/** A blank default draft — a 15×15 all-open grid. */
export function createDefaultGridDraft(): GridDraft {
  return {
    mask: createBlockMask(DEFAULT_GRID_SIDE, DEFAULT_GRID_SIDE),
    width: DEFAULT_GRID_SIDE,
    height: DEFAULT_GRID_SIDE,
  };
}

interface GridDesignerProps {
  /**
   * The current drawing. Lifted to the parent so the user's grid survives a
   * round-trip into the fill view and back ("Back" / "Edit the grid").
   */
  draft: GridDraft;
  /**
   * The parent's setState for the draft. Passed as the raw dispatcher (not a
   * value callback) so paint edits can use functional updates — a fast drag
   * fires several enter events that may batch into one render, and each must
   * build on the previous mask, not a stale closure value.
   */
  setDraft: Dispatch<SetStateAction<GridDraft>>;
  /**
   * Called with the finished mask + dimensions when the user clicks "Fill this
   * grid". The parent derives slots and opens the fill workspace.
   */
  onFill: (mask: BlockMask, width: number, height: number) => void;
}

export function GridDesigner({ draft, setDraft, onFill }: GridDesignerProps) {
  const { mask, width, height } = draft;

  // Drag-paint: on the first cell of a drag we capture the target state
  // (whatever flips that cell to), then apply that same state to every cell the
  // pointer crosses — so a drag paints a consistent run of blocks or of opens.
  const paintState = useRef<boolean | null>(null);
  const isPainting = useRef(false);

  // End any in-progress paint when the pointer/touch is released anywhere on
  // the page (not just on a cell), so a release outside the grid still stops.
  useEffect(() => {
    function endPaint() {
      isPainting.current = false;
      paintState.current = null;
    }
    window.addEventListener('mouseup', endPaint);
    window.addEventListener('touchend', endPaint);
    return () => {
      window.removeEventListener('mouseup', endPaint);
      window.removeEventListener('touchend', endPaint);
    };
  }, []);

  const stats: GridDesignerStats = useMemo(
    () => computeGridDesignerStats(mask, width, height),
    [mask, width, height],
  );

  // Start-cell → slot number, so across/down numbers render exactly where the
  // finished puzzle will place them. Same shape as SkeletonGrid's numberMap.
  const numberMap = useMemo(() => {
    const map = new Map<string, number>();
    const { slots } = deriveSlotsFromBlockMask(mask, width, height);
    for (const slot of slots) {
      const key = `${slot.startX},${slot.startY}`;
      if (!map.has(key)) map.set(key, slot.id);
    }
    return map;
  }, [mask, width, height]);

  const strayKeys = useMemo(
    () => new Set(stats.strayCells.map(c => `${c.x},${c.y}`)),
    [stats.strayCells],
  );

  // --- Mask edits ---

  // setCell returns the SAME reference when nothing changes (no-op / oob), so
  // we skip the upward report and avoid a pointless re-render during a drag.
  function toggleCell(x: number, y: number) {
    setDraft(prev => {
      const next = setCell(prev.mask, x, y, !prev.mask[y][x]);
      return next === prev.mask ? prev : { ...prev, mask: next };
    });
  }

  function paintCell(x: number, y: number, blocked: boolean) {
    setDraft(prev => {
      const next = setCell(prev.mask, x, y, blocked);
      return next === prev.mask ? prev : { ...prev, mask: next };
    });
  }

  function handleCellMouseDown(x: number, y: number) {
    const target = !mask[y][x];
    paintState.current = target;
    isPainting.current = true;
    paintCell(x, y, target);
  }

  function handleCellMouseEnter(x: number, y: number) {
    if (!isPainting.current || paintState.current === null) return;
    paintCell(x, y, paintState.current);
  }

  // Touch: derive the cell under the finger from elementFromPoint, since
  // touchmove fires on the start element, not the one currently under the touch.
  function handleTouchMove(e: React.TouchEvent) {
    if (!isPainting.current || paintState.current === null) return;
    const touch = e.touches[0];
    if (!touch) return;
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const coords = (el as HTMLElement | null)?.dataset?.cell;
    if (!coords) return;
    const [cx, cy] = coords.split(',').map(Number);
    if (Number.isInteger(cx) && Number.isInteger(cy)) {
      paintCell(cx, cy, paintState.current);
    }
  }

  // --- Size steppers ---

  function applyResize(nextW: number, nextH: number) {
    const w = clampGridSide(nextW);
    const h = clampGridSide(nextH);
    setDraft(prev => ({
      mask: resizeBlockMask(prev.mask, prev.width, prev.height, w, h),
      width: w,
      height: h,
    }));
  }

  function clearGrid() {
    setDraft(prev => ({ ...prev, mask: createBlockMask(prev.width, prev.height) }));
  }

  // --- Render ---

  return (
    <div className="space-y-4">
      {/* Title + live readout */}
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">
            Build your own grid
          </h2>
          <p className="text-xs text-ink-2 mt-0.5">
            Tap cells to place blocks; drag to paint. We&rsquo;ll read your word
            slots as you go.
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className={stats.slotCount > 0 ? 'text-ink-2' : 'text-ink-3'}>
            {stats.slotCount} {stats.slotCount === 1 ? 'slot' : 'slots'}
          </span>
          {stats.slotCount > 0 && (
            <span className="text-xs text-ink-3">
              longest {stats.longestSlot} &middot; shortest {stats.shortestSlot}
            </span>
          )}
        </div>
      </div>

      {/* Size steppers */}
      <div className="warm-card px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-3">
        <SizeStepper
          label="Width"
          value={width}
          onChange={w => applyResize(w, height)}
        />
        <SizeStepper
          label="Height"
          value={height}
          onChange={h => applyResize(width, h)}
        />
        <button
          onClick={clearGrid}
          className="btn-ghost btn-sm ml-auto"
        >
          Clear grid
        </button>
      </div>

      {/* The drawable grid */}
      <div className="flex justify-center">
        <div className={GRID_PAN}>
          <div className={GRID_PAGE} aria-label="Grid designer">
            <div
              role="grid"
              className={GRID_FRAME}
              style={gridSizingStyle(width, 28, 46)}
              onTouchMove={handleTouchMove}
            >
              {Array.from({ length: height }, (_, y) =>
                Array.from({ length: width }, (_, x) => {
                  const key = `${x},${y}`;
                  const blocked = mask[y][x];
                  const isStray = strayKeys.has(key);
                  const cellNumber = numberMap.get(key);

                  // Open cells are paper; blocks are ink. A stray (open but in
                  // no slot) gets a warn-tinted wash so the user sees the dead
                  // cell — it stays clearly paper, just flagged.
                  const bgClass = blocked
                    ? CELL_BLOCKED
                    : isStray
                      ? `${CELL_PAPER} bg-warn/15`
                      : CELL_PAPER;

                  return (
                    <button
                      key={key}
                      type="button"
                      role="gridcell"
                      data-cell={key}
                      aria-pressed={blocked}
                      aria-label={
                        `Row ${y + 1}, column ${x + 1}: ` +
                        (blocked ? 'block. Activate to open.' : 'open. Activate to block.') +
                        (isStray ? ' Warning: this open cell is not part of any word.' : '')
                      }
                      onMouseDown={() => handleCellMouseDown(x, y)}
                      onMouseEnter={() => handleCellMouseEnter(x, y)}
                      onTouchStart={() => handleCellMouseDown(x, y)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleCell(x, y);
                        }
                      }}
                      className={`
                        ${CELL_BASE}
                        ${bgClass}
                        transition-colors duration-100
                        cursor-pointer
                        hover:brightness-95
                        focus:outline-none focus-visible:ring-2 focus-visible:ring-rubric focus-visible:ring-inset
                      `}
                    >
                      {cellNumber !== undefined && (
                        <span className={CELL_NUMBER} style={{ fontSize: NUMBER_FONT_SIZE }}>
                          {cellNumber}
                        </span>
                      )}
                    </button>
                  );
                }),
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Warnings — margin notes, never blocking */}
      {stats.strayCells.length > 0 && (
        <div className="note note-warn">
          <p className="text-xs text-ink-2">
            <span className="font-medium text-warn">
              {stats.strayCells.length === 1
                ? '1 open cell isn’t part of any word'
                : `${stats.strayCells.length} open cells aren’t part of any word`}
            </span>
            {' '}&mdash; they&rsquo;re highlighted on the grid. Block them or join
            them to a neighbour so every letter belongs to a slot.
          </p>
        </div>
      )}

      {stats.componentCount > 1 && (
        <div className="note note-warn">
          <p className="text-xs text-ink-2">
            <span className="font-medium text-warn">
              Your grid has {stats.componentCount} separate sections
            </span>
            {' '}&mdash; the words won&rsquo;t all interlock. That&rsquo;s allowed,
            but a single connected grid usually reads better.
          </p>
        </div>
      )}

      {/* Primary action */}
      <div className="flex items-center justify-end gap-3">
        <button
          onClick={() => onFill(mask, width, height)}
          disabled={!stats.canFill}
          className="btn-primary"
          title={stats.canFill
            ? 'Open the fill workspace and type a word into each slot'
            : 'Open at least one run of two or more cells to make a slot'}
        >
          Fill this grid
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** A labelled −/value/+ stepper for a grid dimension, clamped to the bounds. */
function SizeStepper({
  label, value, onChange,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-ink-3 w-12">{label}</span>
      <div className="flex items-center rounded-btn border border-line-2 bg-card">
        <button
          type="button"
          onClick={() => onChange(value - 1)}
          disabled={value <= MIN_GRID_SIDE}
          aria-label={`Decrease ${label.toLowerCase()}`}
          className="px-2.5 py-1 text-ink-2 hover:text-ink disabled:opacity-40
                     disabled:cursor-not-allowed transition-colors"
        >
          &minus;
        </button>
        <span className="w-8 text-center text-sm font-mono text-ink tabular-nums">
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          disabled={value >= MAX_GRID_SIDE}
          aria-label={`Increase ${label.toLowerCase()}`}
          className="px-2.5 py-1 text-ink-2 hover:text-ink disabled:opacity-40
                     disabled:cursor-not-allowed transition-colors"
        >
          +
        </button>
      </div>
    </div>
  );
}
