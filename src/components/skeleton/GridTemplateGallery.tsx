/**
 * Starter-grid gallery for "Build your own grid".
 *
 * Two ways to begin instead of a blank canvas:
 *   1. Curated templates (src/logic/gridTemplates.ts) shown as small previews.
 *   2. A "generate a fresh grid" control that builds a valid, fully-interlocked
 *      crossword pattern at any size on demand (generateCrosswordMaskRows).
 *
 * Either way it just hands a BlockMask up via onLoad; the parent loads it into
 * the editable draft, where the existing Fill / Fill-with-AI paths take over.
 */

import { useState } from 'react';
import type { BlockMask } from '../../logic/gridSkeleton';
import {
  GRID_TEMPLATES,
  maskFromTemplateRows,
  generateCrosswordMaskRows,
} from '../../logic/gridTemplates';
import { CELL_PAPER, CELL_BLOCKED } from '../grid/gridStyles';

interface GridTemplateGalleryProps {
  onLoad: (mask: BlockMask, width: number, height: number) => void;
}

const GENERATE_SIZES = [9, 11, 13, 15, 21];

export function GridTemplateGallery({ onLoad }: GridTemplateGalleryProps) {
  const [size, setSize] = useState(13);
  const [seed, setSeed] = useState(1);
  const [generatedOnce, setGeneratedOnce] = useState(false);

  function handleGenerate() {
    const nextSeed = seed + 1;
    setSeed(nextSeed);
    setGeneratedOnce(true);
    onLoad(maskFromTemplateRows(generateCrosswordMaskRows(size, size, nextSeed)), size, size);
  }

  return (
    <div className="warm-card p-4">
      <div className="mb-3">
        <h3 className="section-label">Start from a template</h3>
        <p className="text-xs text-ink-3 mt-0.5">
          Pick a ready-made crossword shape to tweak and fill &mdash; or generate one at any size.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {GRID_TEMPLATES.map(template => (
          <button
            key={template.id}
            type="button"
            onClick={() => onLoad(maskFromTemplateRows(template.rows), template.width, template.height)}
            className="group flex flex-col items-center gap-2 rounded-lg border border-line/60 bg-card/50 p-3
                       hover:border-rubric/50 hover:bg-card transition-all
                       focus:outline-none focus-visible:border-rubric"
          >
            <GridPreview rows={template.rows} width={template.width} />
            <span className="text-center">
              <span className="block text-sm font-medium text-ink">{template.name}</span>
              <span className="block text-[11px] leading-tight text-ink-3">{template.blurb}</span>
            </span>
          </button>
        ))}
      </div>

      {/* Generate a fresh, valid grid at any size — reshuffle for another. */}
      <div className="mt-4 pt-3 border-t border-line/50 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-ink-2">Or generate a fresh grid:</span>
        <select
          value={size}
          onChange={e => setSize(Number(e.target.value))}
          aria-label="Generated grid size"
          className="rounded-md border border-line-2 bg-card px-2 py-1 text-sm text-ink
                     focus:outline-none focus:border-accent"
        >
          {GENERATE_SIZES.map(s => (
            <option key={s} value={s}>{s}&times;{s}</option>
          ))}
        </select>
        <button type="button" onClick={handleGenerate} className="btn-secondary btn-sm">
          {generatedOnce ? 'Shuffle ↻' : 'Generate'}
        </button>
        <span className="text-[11px] text-ink-3">fully interlocked &mdash; reshuffle for a different one</span>
      </div>
    </div>
  );
}

/** A small static black/white render of a grid pattern. */
function GridPreview({ rows, width }: { rows: string[]; width: number }) {
  return (
    <div
      className="rounded-sm border border-line-2/70 bg-line-2/60 shadow-sm overflow-hidden"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${width}, 0.4rem)`,
        gridAutoRows: '0.4rem',
        gap: '1px',
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
