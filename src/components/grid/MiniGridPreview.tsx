/**
 * Live miniature preview for the Generate tab's right panel.
 *
 * While the teacher is still typing words, this renders a real (debounced)
 * generation at miniature scale — the actual layout their words will get —
 * plus a one-line capacity summary ("14x14 · all 5 words placed · 9 blanks
 * to fill"). Generation takes a few milliseconds, so the preview can keep
 * up with typing without any background machinery.
 *
 * Read-only and deliberately quiet: faded paper, no numbers, no clicks.
 */

import { useEffect, useState } from 'react';
import { createSkeletonFromEntries } from '../../logic/createPuzzle';
import type { SkeletonResult, WordCluePair } from '../../logic/types';

interface MiniGridPreviewProps {
  entries: WordCluePair[];
  width: number;
  height: number;
  /** Seed text from settings — preview matches what Generate will produce. */
  seedText: string;
  /** Mirror of settings.forceDimensions — preview must match generation. */
  forceDimensions?: boolean;
}

const DEBOUNCE_MS = 400;
const FALLBACK_SEED = 1234;
const EMPTY_CELL = '-';

export function MiniGridPreview({ entries, width, height, seedText, forceDimensions }: MiniGridPreviewProps) {
  const [preview, setPreview] = useState<SkeletonResult | null>(null);

  useEffect(() => {
    if (entries.length === 0) {
      setPreview(null);
      return;
    }

    const handle = setTimeout(() => {
      const parsed = parseInt(seedText, 10);
      const seed = Number.isFinite(parsed) ? parsed : FALLBACK_SEED;
      try {
        setPreview(createSkeletonFromEntries({
          entries: entries.map(e => ({ word: e.word, clue: e.clue, priority: 'must' as const })),
          width,
          height,
          seed,
          growToFit: !forceDimensions,
          // Mirror Generate: blanks only exist behind Force Dimensions
          bankFill: !!forceDimensions,
        }));
      } catch {
        setPreview(null); // e.g. no entry fits the grid yet
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(handle);
  }, [entries, width, height, seedText, forceDimensions]);

  if (!preview) {
    return null;
  }

  // Cells covered by blank (to-be-filled) slots — shown as dotted paper
  const blankCells = new Set<string>();
  for (const slot of preview.slots) {
    if (slot.isUserWord) continue;
    for (let i = 0; i < slot.length; i++) {
      const x = slot.direction === 'across' ? slot.startX + i : slot.startX;
      const y = slot.direction === 'across' ? slot.startY : slot.startY + i;
      blankCells.add(`${x},${y}`);
    }
  }

  const blankCount = preview.slots.filter(s => !s.isUserWord).length;
  const cellPx = Math.max(8, Math.min(14, Math.floor(380 / preview.width)));
  const showLetters = cellPx >= 11;

  return (
    <div className="flex flex-col items-center gap-5 py-10 animate-fade-in">
      <p className="text-[11px] tracking-[0.18em] uppercase text-ink-3">
        Live preview — updates as you type
      </p>

      <div
        className="inline-grid gap-0 border border-grid-ink/70 dark:border-grid-blocked-dark rounded-[2px]
                   shadow-page dark:shadow-page-dark opacity-90"
        style={{
          gridTemplateColumns: `repeat(${preview.width}, ${cellPx}px)`,
          gridAutoRows: `${cellPx}px`,
        }}
        aria-label="Live puzzle preview"
      >
        {preview.grid.map((row, y) =>
          row.map((cell, x) => {
            const key = `${x},${y}`;
            const hasLetter = cell !== EMPTY_CELL;
            const isBlankSlot = !hasLetter && blankCells.has(key);

            let cellClass = 'bg-grid-blocked dark:bg-grid-blocked-dark';
            if (hasLetter || isBlankSlot) {
              cellClass = 'bg-grid-cell dark:bg-grid-cell-dark';
            }

            return (
              <div
                key={key}
                className={`relative flex items-center justify-center
                            border-[0.5px] border-grid-border/60 dark:border-grid-border-dark/60 ${cellClass}`}
              >
                {hasLetter && showLetters && (
                  <span
                    className="font-semibold uppercase text-grid-ink/80 leading-none"
                    style={{ fontSize: `${Math.floor(cellPx * 0.62)}px` }}
                  >
                    {cell}
                  </span>
                )}
                {isBlankSlot && (
                  <span className="w-[3px] h-[3px] rounded-full bg-grid-ink/25" />
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="text-center space-y-1">
        <p className="text-sm text-ink-2">
          <span className="font-semibold">{preview.width}&times;{preview.height}</span>
          {' '}&middot;{' '}
          {preview.mustPlacedCount === preview.mustTotalCount
            ? `all ${preview.mustTotalCount} ${preview.mustTotalCount === 1 ? 'word' : 'words'} placed`
            : `${preview.mustPlacedCount}/${preview.mustTotalCount} words placed`}
          {blankCount > 0 && <> &middot; {blankCount} blank{blankCount !== 1 ? 's' : ''} to fill</>}
        </p>
        {preview.grewFrom && (
          <p className="text-xs text-rubric">
            Sized up so every word fits
          </p>
        )}
        {preview.failures.length > 0 && (
          <p className="text-xs text-warn">
            {preview.failures.length} word{preview.failures.length !== 1 ? 's' : ''} won&rsquo;t fit at this size
          </p>
        )}
        <p className="text-xs text-ink-3">
          {blankCount > 0
            ? 'Generate to fill the blanks and finish your puzzle'
            : 'Generate to create your puzzle'}
        </p>
      </div>
    </div>
  );
}
