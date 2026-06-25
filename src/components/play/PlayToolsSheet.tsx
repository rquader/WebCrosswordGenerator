/**
 * Tools bottom sheet — the SEPARATE, native-feeling home for the solver's
 * secondary actions on mobile/tablet (opened by the play bar's ⋯ Tools).
 *
 * Rows ≥44px, clearly labelled, grouped:
 *   - Reveal:  Hint letter / Hint word / Reveal all   (ADR-6 names + budget; do
 *              NOT rename or change the n/3 + time penalty — that lives in the hook)
 *   - Clear:   Clear wrong / Reset                      (existing confirm semantics)
 *   - History: Undo / Redo                              (today's tiny top-strip icons, full size)
 *
 * Native sheet behaviour:
 *   - Slides up via `transform: translateY` (compositor), dims behind.
 *   - Dismiss on backdrop tap, swipe-down, or Escape.
 *   - Opening DELIBERATELY dismisses the keyboard (blur) so the sheet isn't
 *     fighting it; closing returns focus to the grid's hidden input (so the
 *     keyboard comes back) WITHOUT a scroll jump (preventScroll) — the parent
 *     handles the focus-return via onClose.
 *   - All motion is gated by `prefers-reduced-motion` (Tailwind motion-reduce).
 *
 * Mobile/tablet only — the parent gates rendering.
 */

import { useEffect, useRef, useState, useCallback } from 'react';

interface PlayToolsSheetProps {
  open: boolean;
  onClose: () => void;
  hintsLeft: number;
  hintBudget: number;
  hintsAvailable: boolean;
  hasSelection: boolean;
  hasChecked: boolean;
  onHintCell: () => void;
  onHintWord: () => void;
  onRevealAll: () => void;
  onClearIncorrect: () => void;
  onReset: () => void;
  onUndo: () => void;
  onRedo: () => void;
}

export function PlayToolsSheet({
  open,
  onClose,
  hintsLeft,
  hintBudget,
  hintsAvailable,
  hasSelection,
  hasChecked,
  onHintCell,
  onHintWord,
  onRevealAll,
  onClearIncorrect,
  onReset,
  onUndo,
  onRedo,
}: PlayToolsSheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number | null>(null);

  // Mount-on-open with a slide-in, and stay mounted through the close
  // transition so the panel slides back down before it leaves the DOM. `shown`
  // (flipped on a frame after mount) drives the transform from off-screen.
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      // Next frame: flip `shown` so the transform animates from translate-y-full.
      const id = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(id);
    }
    // Closing: start the slide-down; unmount after the transition.
    setShown(false);
    const reduce = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const id = window.setTimeout(() => setMounted(false), reduce ? 0 : 300);
    return () => clearTimeout(id);
  }, [open]);

  // Escape closes the sheet.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, onClose]);

  // On open, move focus into the sheet (and off the grid input, which dismisses
  // the keyboard) — the first focusable row.
  useEffect(() => {
    if (shown && panelRef.current) {
      const first = panelRef.current.querySelector<HTMLButtonElement>('button:not([disabled])');
      first?.focus({ preventScroll: true });
    }
  }, [shown]);

  // Swipe-down to dismiss (simple threshold on the panel).
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0]?.clientY ?? null;
  }, []);
  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    const start = touchStartY.current;
    touchStartY.current = null;
    if (start === null) return;
    const end = e.changedTouches[0]?.clientY ?? start;
    if (end - start > 56) onClose(); // dragged down far enough
  }, [onClose]);

  // A tool action runs, then the sheet closes (returning to the grid).
  const run = useCallback((fn: () => void) => () => { fn(); onClose(); }, [onClose]);

  // Mounted only while open or closing (slide-out). All hooks run above this.
  if (!mounted) return null;

  return (
    <div className="lg:hidden fixed inset-0 z-[60]">
      {/* Backdrop — dims behind, tap to dismiss. */}
      <button
        type="button"
        aria-label="Close tools"
        onClick={onClose}
        className={`absolute inset-0 bg-ink/30 transition-opacity duration-200 motion-reduce:transition-none
                    ${shown ? 'opacity-100' : 'opacity-0'}`}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Solver tools"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className={`absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-line bg-card shadow-raise
                    transition-transform duration-300 ease-out motion-reduce:transition-none
                    ${shown ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        {/* Grab handle */}
        <div className="flex justify-center pt-2.5 pb-1" aria-hidden="true">
          <div className="h-1 w-10 rounded-full bg-line-2" />
        </div>

        <div className="px-4 pt-1 pb-2 flex items-center justify-between">
          <h2 className="section-label">Tools</h2>
          <span
            className="text-meta text-ink-3 font-mono tabular-nums"
            aria-label={`${hintsLeft} of ${hintBudget} hints left`}
          >
            {hintsLeft}/{hintBudget} hints
          </span>
        </div>

        {/* Reveal group */}
        <SheetGroup label="Reveal">
          <SheetRow onClick={run(onHintCell)} disabled={!hasSelection || !hintsAvailable}>
            Hint letter <span className="text-ink-3 text-meta">+15s</span>
          </SheetRow>
          <SheetRow onClick={run(onHintWord)} disabled={!hasSelection || !hintsAvailable}>
            Hint word <span className="text-ink-3 text-meta">+45s</span>
          </SheetRow>
          <SheetRow onClick={run(onRevealAll)} accent>
            Reveal all <span className="text-ink-3 text-meta">ends the solve</span>
          </SheetRow>
        </SheetGroup>

        {/* Clear group */}
        <SheetGroup label="Clear">
          <SheetRow onClick={run(onClearIncorrect)} disabled={!hasChecked} warn>
            Clear wrong
          </SheetRow>
          <SheetRow onClick={run(onReset)}>
            Reset puzzle
          </SheetRow>
        </SheetGroup>

        {/* History group */}
        <SheetGroup label="History">
          <div className="flex gap-2 px-4">
            <button
              type="button"
              onClick={() => onUndo()}
              className="btn-secondary flex-1 min-h-[44px] gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
              </svg>
              Undo
            </button>
            <button
              type="button"
              onClick={() => onRedo()}
              className="btn-secondary flex-1 min-h-[44px] gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" />
              </svg>
              Redo
            </button>
          </div>
        </SheetGroup>
      </div>
    </div>
  );
}

function SheetGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-1.5">
      <p className="sub-label px-4 pb-1">{label}</p>
      {children}
    </div>
  );
}

interface SheetRowProps {
  onClick: () => void;
  disabled?: boolean;
  accent?: boolean;
  warn?: boolean;
  children: React.ReactNode;
}

function SheetRow({ onClick, disabled, accent, warn, children }: SheetRowProps) {
  const tone = accent ? 'text-accent' : warn ? 'text-warn' : 'text-ink';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full min-h-[44px] px-4 flex items-center gap-2 text-left text-body
                  ${tone} disabled:opacity-45 disabled:cursor-not-allowed
                  hover:bg-well active:bg-well transition-colors motion-reduce:transition-none`}
    >
      {children}
    </button>
  );
}
