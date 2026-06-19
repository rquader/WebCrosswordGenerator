/**
 * Starter-template gallery for "Build your own grid".
 *
 * Shows a small preview of each hand-authored crossword template
 * (src/logic/gridTemplates.ts). Picking one loads its black-square pattern into
 * the grid editor below, where it stays fully editable — the user can tweak it
 * and then fill it by hand or with AI. Purely presentational: it calls onPick
 * and the parent owns the draft.
 */

import { GRID_TEMPLATES, type GridTemplate } from '../../logic/gridTemplates';

interface GridTemplateGalleryProps {
  onPick: (template: GridTemplate) => void;
}

export function GridTemplateGallery({ onPick }: GridTemplateGalleryProps) {
  return (
    <div className="warm-card p-4">
      <div className="mb-3">
        <h3 className="section-label">Start from a template</h3>
        <p className="text-xs text-ink-3 mt-0.5">
          Pick a ready-made crossword shape to tweak and fill &mdash; or just draw your own below.
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {GRID_TEMPLATES.map(template => (
          <button
            key={template.id}
            type="button"
            onClick={() => onPick(template)}
            className="group flex flex-col items-center gap-2 rounded-lg border border-line/60 bg-card/50 p-3
                       hover:border-rubric/50 hover:bg-card transition-all
                       focus:outline-none focus-visible:border-rubric"
          >
            <TemplatePreview template={template} />
            <span className="text-center">
              <span className="block text-sm font-medium text-ink">{template.name}</span>
              <span className="block text-[11px] leading-tight text-ink-3">{template.blurb}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** A small static black/white render of a template's grid. */
function TemplatePreview({ template }: { template: GridTemplate }) {
  const { rows, width } = template;
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
          <div key={`${x}-${y}`} className={ch === '#' ? 'bg-ink' : 'bg-page'} />
        )),
      )}
    </div>
  );
}
