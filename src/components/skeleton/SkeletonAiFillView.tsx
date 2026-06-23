/**
 * "Fill with AI" workspace for the skeleton-first ("build your own grid") flow.
 *
 * The user has already DRAWN the grid; here they hand its blank slots to any AI
 * assistant, copy-paste style — the exact same privacy-first transport as the AI
 * Words tab (AiBuilderTab). Three steps:
 *   1. Describe the topic → Copy AI prompt (a slot-aware prompt: every blank slot
 *      addressed by its number + direction, with its pattern and crossings).
 *   2. Paste the prompt into ChatGPT / Gemini / Claude — whatever they use.
 *   3. Paste the reply back → "Fill the grid": the AI's per-slot picks are locked
 *      in, its spare pool + the word bank complete the rest with valid crossings,
 *      and the user lands in the normal fill view with every slot filled in and
 *      editable.
 *
 * No API, no account, no network calls — the clipboard is the transport, exactly
 * like AiBuilderTab. The grid geometry is fixed (the user drew it), so we never
 * resize or re-derive it: slots come straight from deriveSlotsFromBlockMask.
 */

import { useMemo, useState } from 'react';
import type { BlockMask } from '../../logic/gridSkeleton';
import type { SkeletonResult } from '../../logic/types';
import {
  deriveSlotsFromBlockMask,
  computeIntersections,
} from '../../logic/gridSkeleton';
import {
  buildSkeletonFillPrompt,
  fillSkeletonFromResponse,
} from '../../utils/skeletonFillPrompt';
import { emptyFillGrid } from '../../logic/skeletonAiFill';
import { topicPreferredWords } from '../../logic/wordCategories';
import { DEFAULT_LANGUAGE, type PuzzleLanguage } from '../../logic/language';

interface SkeletonAiFillViewProps {
  /** The grid the user drew — fixed geometry we fill, never resize. */
  mask: BlockMask;
  width: number;
  height: number;
  /** Puzzle language (drives the prompt + parser charset). */
  language?: PuzzleLanguage;
  /** Whether two-word phrases are allowed (AI builder setting). */
  allowTwoWords?: boolean;
  /**
   * Called once the grid is filled: `skeleton` is the geometry (same slots the
   * prompt described) and `assignments` are the words to seed the fill view
   * with. The host opens SkeletonFillView pre-filled + editable from these.
   */
  onFilled: (
    skeleton: SkeletonResult,
    assignments: Map<number, { word: string; clue: string }>,
  ) => void;
  /** Return to the grid designer (the drawing is preserved by the host). */
  onBack: () => void;
}

/** Outcome of a fill attempt — drives the margin-note feedback. */
interface FillOutcome {
  /** Slots the AI labeled and we accepted verbatim. */
  lockedCount: number;
  /** Total slots that ended up with a word (locked + pool/bank fill). */
  filledCount: number;
  /** Slots left blank because nothing satisfied their crossings. */
  unfilledCount: number;
  /** Lines in the response the parser couldn't use. */
  issues: string[];
  /** Lengths the AI flagged (NOTES SHORT_LENGTHS) as having few/no real words. */
  shortLengths: number[];
  /** The AI's NOTES COMMENT, if any (currently informational only). */
  comment: string;
}

export function SkeletonAiFillView({
  mask,
  width,
  height,
  language = DEFAULT_LANGUAGE,
  allowTwoWords = false,
  onFilled,
  onBack,
}: SkeletonAiFillViewProps) {
  const [topic, setTopic] = useState('');
  const [response, setResponse] = useState('');
  const [copied, setCopied] = useState(false);
  // Set when the Clipboard API is unavailable/denied — reveals a manual-copy
  // fallback so the prompt is never lost (e.g. insecure context, permissions).
  const [copyFailed, setCopyFailed] = useState(false);
  const [outcome, setOutcome] = useState<FillOutcome | null>(null);

  // The drawn grid's geometry. Recomputed only when the drawing changes — the
  // same slots/intersections feed the prompt, the parser, and the solver, so
  // every stage describes the identical grid. The grid is all-empty: a freshly
  // drawn skeleton has no fixed letters yet (every slot cell is blank).
  const { skeleton, slots, intersections, grid } = useMemo(() => {
    const sk = deriveSlotsFromBlockMask(mask, width, height);
    return {
      skeleton: sk,
      slots: sk.slots,
      intersections: computeIntersections(sk.slots),
      grid: emptyFillGrid(width, height),
    };
  }, [mask, width, height]);

  const slotCount = slots.length;

  // The flat-pool prompt (Variant J): it asks for a pool of real words bucketed
  // by the grid's distinct slot lengths; our solver places them + fills the rest
  // from the word bank, so the AI is never asked to interlock.
  const prompt = useMemo(
    () =>
      buildSkeletonFillPrompt({
        slots,
        intersections,
        width,
        height,
        grid,
        context: topic,
        language,
        allowTwoWords,
        allowProperNouns: false,
      }),
    [slots, intersections, width, height, grid, topic, language, allowTwoWords],
  );

  function handleCopyPrompt() {
    navigator.clipboard.writeText(prompt).then(
      () => {
        setCopied(true);
        setCopyFailed(false);
        setTimeout(() => setCopied(false), 2000);
      },
      // Clipboard blocked (insecure context / denied permission). Don't lose
      // the prompt — reveal it in a selectable box for manual copy.
      () => setCopyFailed(true),
    );
  }

  /**
   * Parse the pasted reply, solve the grid, and hand the filled assignments up.
   * Data flow: parse → (locked = AI picks, pool = AI spares) → solveSkeletonFill
   * (+ word bank) → seed the fill view. The AI's labeled words are respected
   * verbatim; the pool and bank complete the rest with valid crossings; any
   * slot that still can't be satisfied stays blank for the user to type.
   */
  function handleFill() {
    // Shared pipeline (parse -> lock AI picks -> solve). A freshly drawn BYOG
    // grid has no pre-placed words, so this locks only the AI's picks and fills
    // the rest from its spare pool + the word bank.
    const { assignments, unfilledSlotIds, lockedCount, issues, shortLengths, comment } = fillSkeletonFromResponse({
      response,
      slots,
      intersections,
      width,
      height,
      language,
      allowTwoWords,
      // Steer generic bank filler toward the topic the teacher described (the
      // drawn grid has no placed words yet). Soft preference — fill rate is unchanged.
      preferredWords: topicPreferredWords(topic),
      // A stable seed keeps the same paste reproducible; ties break the same way.
      seed: 1,
    });

    setOutcome({
      lockedCount,
      filledCount: assignments.size,
      unfilledCount: unfilledSlotIds.length,
      issues,
      shortLengths,
      comment,
    });

    onFilled(skeleton, assignments);
  }

  return (
    <div className="space-y-4">
      {/* Title */}
      <div>
        <h2 className="font-display text-lg font-semibold text-ink">
          Fill your grid with AI
        </h2>
        <p className="text-xs text-ink-2 mt-0.5">
          Copy a ready-made request for your {slotCount}-slot grid, paste it into
          any AI you use, then paste the answer back. Nothing leaves your browser
          except what you copy yourself.
        </p>
      </div>

      {/* ── Step 1: Set up the request ── */}
      <section className="warm-card p-5 space-y-4">
        <StepHeader number={1} title="Set up your request" />

        <div>
          <label htmlFor="skeleton-ai-topic" className="block text-sm font-medium text-ink-2 mb-1.5">
            What should the words be about?
          </label>
          <textarea
            id="skeleton-ai-topic"
            value={topic}
            onChange={e => setTopic(e.target.value)}
            rows={4}
            placeholder={'A topic ("the water cycle"), a unit, a list of subtopics — or leave it blank for general vocabulary.'}
            className="field leading-relaxed focus:outline-none resize-y"
          />
        </div>

        {/* Collapsible prompt preview — mirrors AiBuilderTab. */}
        <details className="group rounded-lg border border-line/60">
          <summary className="px-3 py-2 text-xs font-medium text-ink-2 cursor-pointer select-none hover:text-ink transition-colors">
            Preview the exact prompt
          </summary>
          <pre className="px-3 pb-3 pt-1 text-[11px] leading-relaxed text-ink-2 whitespace-pre-wrap break-words max-h-72 overflow-y-auto scrollbar-thin font-mono">
            {prompt}
          </pre>
        </details>

        {/* Model guidance — a top-tier "thinking" model fabricates far less on a
            specific topic (Phase 17 Session 14 data). No model names — they date. */}
        <div className="note py-2">
          <p className="text-sm text-ink-2">
            <span className="font-medium text-rubric">Tip</span> &mdash; paste this into
            the most capable AI you have, a top-tier &ldquo;thinking&rdquo; model. Lighter
            or faster models sometimes invent or misspell words on a specific topic, which
            you&rsquo;d then have to fix.
          </p>
        </div>

        <div>
          <button onClick={handleCopyPrompt} className="btn-primary btn-lg w-full sm:w-auto">
            {copied ? 'Copied' : 'Copy AI prompt'}
          </button>
          {copied && (
            <p className="mt-2 text-sm text-rubric animate-fade-in">
              Now paste it into ChatGPT, Gemini, Claude, or any AI &rarr;
            </p>
          )}
          {copyFailed && (
            <div className="note note-warn py-2.5 mt-2 space-y-2 animate-fade-in">
              <p className="text-sm text-ink-2">
                <span className="font-medium text-warn">Couldn&rsquo;t copy automatically.</span>{' '}
                Select the prompt below and copy it (Ctrl/Cmd + C), then paste it into your AI.
              </p>
              <textarea
                readOnly
                value={prompt}
                rows={4}
                onFocus={e => e.currentTarget.select()}
                aria-label="Prompt to copy manually"
                className="field font-mono text-[11px] leading-relaxed resize-y"
              />
            </div>
          )}
        </div>
      </section>

      {/* ── Step 2: The bridge — dashed, it happens outside the app ── */}
      <section className="rounded-card border border-dashed border-line-2/60 px-5 py-4">
        <StepHeader number={2} title="Ask the AI" muted />
        <p className="mt-1.5 text-sm text-ink-2 leading-relaxed">
          Open the AI assistant you normally use, paste the prompt, and send it.
          When it answers, copy the whole reply and come back here.
        </p>
      </section>

      {/* ── Step 3: Fill ── */}
      <section className="warm-card p-5 space-y-4">
        <StepHeader number={3} title="Fill the grid" />

        <textarea
          value={response}
          onChange={e => { setResponse(e.target.value); setOutcome(null); }}
          rows={6}
          placeholder="Paste the AI's response here — the whole reply is fine."
          aria-label="AI response to fill the grid"
          className="field leading-relaxed font-mono placeholder:font-sans focus:outline-none resize-y"
        />

        <button
          onClick={handleFill}
          disabled={response.trim().length === 0}
          className="btn-primary btn-lg w-full sm:w-auto"
        >
          Fill the grid
        </button>

        <p className="text-xs text-ink-3">
          We&rsquo;ll place the AI&rsquo;s words, complete any gaps with words that fit,
          and open the editor so you can change anything before finishing.
        </p>

        {/* Outcome — margin notes, never blocking. The fill always proceeds; this
            just reports what happened (and is followed by the editor opening). */}
        {outcome && (
          <div className="space-y-2 animate-fade-in">
            {outcome.filledCount > 0 && (
              <div className="note py-2.5">
                <p className="text-sm text-ink-2">
                  <span className="font-medium text-ink">
                    Filled {outcome.filledCount} of {slotCount} slot{slotCount !== 1 ? 's' : ''}
                  </span>
                  {outcome.lockedCount > 0 && (
                    <> &mdash; {outcome.lockedCount} from the AI&rsquo;s answer
                      {outcome.filledCount > outcome.lockedCount && <>, the rest completed to fit</>}.
                    </>
                  )}
                  {' '}Opening the editor&hellip;
                </p>
              </div>
            )}

            {outcome.unfilledCount > 0 && (
              <div className="note note-warn py-2.5">
                <p className="text-sm text-ink-2">
                  {outcome.unfilledCount} slot{outcome.unfilledCount !== 1 ? 's' : ''} couldn&rsquo;t
                  be filled automatically &mdash; you can type a word into each in the editor.
                </p>
              </div>
            )}

            {outcome.issues.length > 0 && (
              <div className="note note-warn py-2.5">
                <p className="text-overline uppercase font-medium text-warn mb-1.5">
                  {outcome.issues.length} line{outcome.issues.length !== 1 ? 's' : ''} couldn&rsquo;t be used
                </p>
                <ul className="space-y-1">
                  {outcome.issues.map((message, i) => (
                    <li key={i} className="text-xs text-ink-2">
                      {message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Earned, calm nudge: the AI itself reported it had few real words for
                some lengths (NOTES SHORT_LENGTHS), so those slots leaned on the word
                bank — the editor tags those answers "word bank" for review. */}
            {outcome.shortLengths.length > 0 && (
              <div className="note py-2.5">
                <p className="text-sm text-ink-2">
                  <span className="font-medium text-ink">
                    The AI had few real words for some lengths
                  </span>{' '}
                  ({outcome.shortLengths.join(', ')} letters), so some answers came from the
                  word bank &mdash; the editor tags them <span className="text-warn font-medium">word bank</span> for
                  a quick review. A more capable AI may do better.
                </p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Action — back to the designer (the drawing is preserved). */}
      <div className="flex items-center justify-start">
        <button onClick={onBack} className="btn-ghost">
          Back to the grid
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components (mirrors AiBuilderTab's StepHeader)
// ---------------------------------------------------------------------------

function StepHeader({ number, title, muted }: { number: number; title: string; muted?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold
          ${muted ? 'bg-well text-ink-3' : 'bg-accent text-accent-ink'}`}
      >
        {number}
      </span>
      <h3 className={`section-label ${muted ? 'text-ink-3' : ''}`}>
        {title}
      </h3>
    </div>
  );
}
