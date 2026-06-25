/**
 * Persistent play bar — the centerpiece of mobile/tablet crossword play.
 *
 * Replaces the old `fixed bottom-3` clue strip. One compact row, pinned just
 * above the soft keyboard:
 *
 *   [‹]  [ Across⇄Down chip · ACTIVE CLUE TEXT ]  [›]   [Check]   [⋯ Tools]
 *
 * - The clue line is clamped to 2 lines with a RESERVED height, so changing
 *   clue length never shifts the bar (no layout shift).
 * - ‹ › step to the prev/next clue in numbering order, landing on its first
 *   empty cell (handled in usePuzzleState.goToAdjacentClue).
 * - The Across⇄Down chip is the visible, obvious direction toggle.
 * - Check is one tap (most-used action). ⋯ Tools opens the tools sheet.
 *
 * NO-FLICKER: the bar is `position: fixed; bottom: 0` and is lifted above the
 * keyboard with `transform: translateY(-keyboardOffset)` — a compositor
 * transform, NEVER an animated layout height/top. The transition is on
 * `transform` only and is disabled under `prefers-reduced-motion`. The
 * component is memoized by its parent so typing doesn't re-render it.
 *
 * Mobile/tablet ONLY — the parent gates rendering behind PLAY_COMPACT_QUERY so
 * desktop play is untouched.
 */

import { memo } from 'react';

interface PlayBarProps {
  /** Direction · clue text, already formatted (e.g. "3 Down: A body of water"). */
  clueText: string | null;
  isAcross: boolean;
  /** Px the soft keyboard occludes — the bar lifts by this much. */
  keyboardOffset: number;
  onToggleDirection: () => void;
  onPrevClue: () => void;
  onNextClue: () => void;
  onCheck: () => void;
  onOpenTools: () => void;
}

function PlayBarImpl({
  clueText,
  isAcross,
  keyboardOffset,
  onToggleDirection,
  onPrevClue,
  onNextClue,
  onCheck,
  onOpenTools,
}: PlayBarProps) {
  return (
    <div
      // Fixed to the visual-viewport bottom, lifted above the keyboard by a
      // compositor transform. `bottom: env(safe-area-inset-bottom)` keeps it
      // clear of the iOS home indicator when the keyboard is closed.
      //
      // width:100vw + left:0 (NOT inset-x-0) pins the bar to the visual
      // viewport width regardless of any horizontal page overflow — a fixed
      // `right:0` would otherwise stretch the bar to the document's scroll
      // width when something else on the page overflows.
      className="lg:hidden fixed left-0 bottom-0 z-50 w-screen max-w-[100vw] px-2 pt-2
                 isolate pointer-events-auto
                 transition-transform duration-200 ease-out
                 motion-reduce:transition-none"
      style={{
        transform: `translateY(-${keyboardOffset}px)`,
        paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))',
      }}
      // The bar is chrome, not part of the document flow the grid scrolls in.
      role="toolbar"
      aria-label="Crossword controls"
    >
      {/* Two stacked rows guarantee a fit at any phone width (6 controls + a
          legible clue won't share one 375px line). Row 1: the chip + the clue.
          Row 2: prev/next, Check, tools. On a tablet there is room for one row
          (Step 7 refines that). Both rows are fixed-height so layout never
          shifts when the clue length changes. */}
      <div className="mx-auto w-full max-w-3xl rounded-lg border border-line bg-card shadow-raise
                      px-2 py-1.5 flex flex-col gap-1.5">
        {/* Row 1 — direction chip + active clue. */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleDirection}
            aria-label={`Direction: ${isAcross ? 'Across' : 'Down'}. Tap to switch.`}
            className="shrink-0 inline-flex items-center gap-1 rounded-md border border-line-2
                       bg-well px-2 py-1 text-meta font-semibold uppercase tracking-wide
                       text-rubric active:bg-line/40 transition-colors motion-reduce:transition-none"
          >
            {isAcross ? 'Across' : 'Down'}
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </button>

          {/* Reserved 2-line height — clue length changes never resize the bar. */}
          <p
            className="flex-1 min-w-0 text-sm leading-snug text-ink line-clamp-2"
            style={{ minHeight: 'calc(2 * 1.375 * 0.875rem)' }}
          >
            {clueText ?? 'Tap a square to start'}
          </p>
        </div>

        {/* Row 2 — navigation + actions. */}
        <div className="flex items-stretch gap-1.5">
          <button
            type="button"
            onClick={onPrevClue}
            aria-label="Previous clue"
            className="btn-secondary shrink-0 w-12 min-h-[44px] !px-0 justify-center"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onNextClue}
            aria-label="Next clue"
            className="btn-secondary shrink-0 w-12 min-h-[44px] !px-0 justify-center"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Check — persistent, one tap, takes the remaining width. */}
          <button
            type="button"
            onClick={onCheck}
            className="btn-secondary flex-1 min-w-0 min-h-[44px]"
          >
            Check
          </button>

          {/* Tools sheet trigger. */}
          <button
            type="button"
            onClick={onOpenTools}
            aria-label="Open tools"
            aria-haspopup="dialog"
            className="btn-secondary shrink-0 w-12 min-h-[44px] !px-0 justify-center"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <circle cx="5" cy="12" r="1.6" />
              <circle cx="12" cy="12" r="1.6" />
              <circle cx="19" cy="12" r="1.6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export const PlayBar = memo(PlayBarImpl);
