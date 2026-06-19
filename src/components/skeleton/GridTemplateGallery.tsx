/**
 * Size-first starter-grid menu for "Build your own grid".
 *
 * Pick a size, then pick a shape. For the chosen size we show the curated,
 * hand-frozen crossword grid(s) FIRST (clean, fully-interlocked, newspaper
 * style), then top up to a full row with fresh on-the-fly variants from the
 * generator (generateCrosswordMaskRows) — every one valid by construction.
 * "More variations" re-rolls the generated tiles with new seeds.
 *
 * Picking a tile just hands a BlockMask up via onLoad; the parent loads it into
 * the editable draft, where the existing Fill / Fill-with-AI paths take over.
 */

import { useMemo, useState } from 'react';
import type { BlockMask } from '../../logic/gridSkeleton';
import {
  GRID_TEMPLATES,
  generatedTemplate,
  maskFromTemplateRows,
  type GridTemplate,
} from '../../logic/gridTemplates';
import { CELL_PAPER, CELL_BLOCKED } from '../grid/gridStyles';

interface GridTemplateGalleryProps {
  onLoad: (mask: BlockMask, width: number, height: number) => void;
}

/** Sizes offered, smallest to largest — drawn from the curated set. */
const SIZES = Array.from(new Set(GRID_TEMPLATES.map(t => t.width))).sort((a, b) => a - b);
/** Size shown the moment BYOG opens — a roomy, familiar full-page shape. */
const DEFAULT_SIZE = SIZES.includes(13) ? 13 : SIZES[Math.floor(SIZES.length / 2)];
/** Target number of tiles per size (curated first, generated fills the rest). */
const TILE_COUNT = 5;

export function GridTemplateGallery({ onLoad }: GridTemplateGalleryProps) {
  const [size, setSize] = useState(DEFAULT_SIZE);
  const [batch, setBatch] = useState(0);

  // Curated grids for this size come first; generated variants top up to
  // TILE_COUNT. Variant seeds advance with the batch so "More variations"
  // yields a fresh, repeatable set every press.
  const tiles = useMemo<{ template: GridTemplate; curated: boolean }[]>(() => {
    const curated = GRID_TEMPLATES.filter(t => t.width === size);
    const needed = Math.max(0, TILE_COUNT - curated.length);
    const generated = Array.from({ length: needed }, (_, i) =>
      generatedTemplate(size, size, batch * needed + i + 1),
    );
    return [
      ...curated.map(template => ({ template, curated: true })),
      ...generated.map(template => ({ template, curated: false })),
    ];
  }, [size, batch]);

  function load(template: GridTemplate) {
    onLoad(maskFromTemplateRows(template.rows), template.width, template.height);
  }

  function handleSizeChange(next: number) {
    setSize(next);
    setBatch(0);
  }

  return (
    <div className="warm-card p-4">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="section-label">Grid size</h3>
          <p className="text-xs text-ink-3 mt-0.5">
            Pick a size, then choose a shape to tweak and fill.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setBatch(b => b + 1)}
          className="btn-secondary btn-sm"
        >
          More variations ↻
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Grid size">
        {SIZES.map(s => {
          const active = s === size;
          return (
            <button
              key={s}
              type="button"
              aria-pressed={active}
              onClick={() => handleSizeChange(s)}
              className={
                'rounded-md border px-2.5 py-1 text-sm transition-colors ' +
                (active
                  ? 'border-rubric bg-rubric/10 text-rubric font-medium'
                  : 'border-line-2 bg-card text-ink-2 hover:border-rubric/50')
              }
            >
              {s}&times;{s}
            </button>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {tiles.map(({ template, curated }, i) => (
          <TemplateTile
            key={template.id}
            template={template}
            label={curated ? 'Curated' : `Variation ${i}`}
            onPick={() => load(template)}
          />
        ))}
      </div>
    </div>
  );
}

/** One pickable preview tile, used for both curated and generated templates. */
function TemplateTile({
  template,
  label,
  onPick,
}: {
  template: GridTemplate;
  label: string;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      aria-label={`${template.name} ${label}`}
      className="group flex flex-col items-center gap-2 rounded-lg border border-line/60 bg-card/50 p-3
                 hover:border-rubric/50 hover:bg-card transition-all
                 focus:outline-none focus-visible:border-rubric"
    >
      <GridPreview rows={template.rows} width={template.width} height={template.height} />
      <span className="block text-[11px] leading-tight text-ink-3">{label}</span>
    </button>
  );
}

/**
 * A small static print-style render of a grid pattern.
 *
 * Every preview fits the SAME fixed box regardless of grid size, so the gallery
 * reads as an even set instead of tiny-to-huge tiles. The cell size is derived
 * from the box so a 5×5 and a 15×15 occupy identical footprints. Colors come
 * from the shared grid constants so previews match the real rendered grid in
 * every theme (print-style: cream cells, dark blocks, never inverting).
 */
const PREVIEW_BOX = 72; // px — uniform outer size for every tile
const PREVIEW_GAP = 1; // px — hairline gridlines between cells

function GridPreview({ rows, width, height }: { rows: string[]; width: number; height: number }) {
  const maxDim = Math.max(width, height);
  const cell = (PREVIEW_BOX - (maxDim - 1) * PREVIEW_GAP) / maxDim;
  return (
    <div
      className="rounded-sm border border-grid-border bg-grid-border shadow-sm overflow-hidden"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${width}, ${cell}px)`,
        gridAutoRows: `${cell}px`,
        gap: `${PREVIEW_GAP}px`,
        width: 'fit-content',
      }}
      aria-hidden="true"
    >
      {rows.flatMap((row, y) =>
        row.split('').map((ch, x) => (
          <div key={`${x}-${y}`} className={ch === '#' ? CELL_BLOCKED : CELL_PAPER} />
        )),
      )}
    </div>
  );
}
