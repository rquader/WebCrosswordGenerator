/**
 * Starter-grid gallery for "Build your own grid".
 *
 * Two ways to begin instead of a blank canvas:
 *   1. Curated, hand-crafted templates (src/logic/gridTemplates.ts) shown FIRST
 *      as small print-style previews — clean, deliberate shapes for the common
 *      sizes.
 *   2. A "generate a fresh grid" control that builds valid, fully-interlocked
 *      crossword patterns at any size on demand (generateCrosswordMaskRows),
 *      shown as a row of pickable variants — primarily for sizes the curated set
 *      doesn't cover, or for extra variety. Shuffle re-rolls the batch.
 *
 * Either way it just hands a BlockMask up via onLoad; the parent loads it into
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

/** Sizes offered by the generator — a spread that complements the curated set. */
const GENERATE_SIZES = [9, 11, 13, 15, 17, 19, 21];
/** How many generated variants to show per batch. */
const GEN_VARIANTS = 4;

export function GridTemplateGallery({ onLoad }: GridTemplateGalleryProps) {
  const [size, setSize] = useState(15);
  const [batch, setBatch] = useState(0);
  const [showGenerated, setShowGenerated] = useState(false);

  // Deterministic variants for the current size + batch (seeds advance with the
  // batch so "Shuffle" always yields a fresh, repeatable set).
  const variants = useMemo(
    () =>
      Array.from({ length: GEN_VARIANTS }, (_, i) =>
        generatedTemplate(size, size, batch * GEN_VARIANTS + i + 1),
      ),
    [size, batch],
  );

  function load(template: GridTemplate) {
    onLoad(maskFromTemplateRows(template.rows), template.width, template.height);
  }

  function handleGenerate() {
    if (!showGenerated) setShowGenerated(true);
    else setBatch(b => b + 1); // already showing — Shuffle to the next batch
  }

  function handleSizeChange(next: number) {
    setSize(next);
    setBatch(0);
    setShowGenerated(true);
  }

  return (
    <div className="warm-card p-4">
      <div className="mb-3">
        <h3 className="section-label">Start from a template</h3>
        <p className="text-xs text-ink-3 mt-0.5">
          Pick a clean, ready-made crossword shape to tweak and fill &mdash; or generate one at any size.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {GRID_TEMPLATES.map(template => (
          <TemplateTile key={template.id} template={template} onPick={() => load(template)} />
        ))}
      </div>

      {/* Generate fresh, valid grids at any size — pick one, or shuffle for more. */}
      <div className="mt-5 pt-4 border-t border-line/50">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-ink-2">Or generate a fresh grid:</span>
          <select
            value={size}
            onChange={e => handleSizeChange(Number(e.target.value))}
            aria-label="Generated grid size"
            className="rounded-md border border-line-2 bg-card px-2 py-1 text-sm text-ink
                       focus:outline-none focus:border-accent"
          >
            {GENERATE_SIZES.map(s => (
              <option key={s} value={s}>{s}&times;{s}</option>
            ))}
          </select>
          <button type="button" onClick={handleGenerate} className="btn-secondary btn-sm">
            {showGenerated ? 'Shuffle ↻' : 'Generate'}
          </button>
          <span className="text-[11px] text-ink-3">fully interlocked &mdash; shuffle for more</span>
        </div>

        {showGenerated && (
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {variants.map((template, i) => (
              <TemplateTile
                key={template.id}
                template={template}
                label={`Option ${i + 1}`}
                onPick={() => load(template)}
              />
            ))}
          </div>
        )}
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
  label?: string;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      aria-label={`${template.name} ${label ?? template.blurb}`}
      className="group flex flex-col items-center gap-2 rounded-lg border border-line/60 bg-card/50 p-3
                 hover:border-rubric/50 hover:bg-card transition-all
                 focus:outline-none focus-visible:border-rubric"
    >
      <GridPreview rows={template.rows} width={template.width} height={template.height} />
      <span className="text-center">
        <span className="block text-sm font-medium text-ink">{template.name}</span>
        <span className="block text-[11px] leading-tight text-ink-3">{label ?? template.blurb}</span>
      </span>
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
