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
import { suggestWordsForSlot, planAutoFill } from '../../logic/slotSuggestions';
import { buildCluePrompt } from '../../utils/aiPromptBuilder';
import { computeIntersections } from '../../logic/gridSkeleton';
import { gridFromPlacedSlots } from '../../logic/skeletonAiFill';
import { buildSkeletonFillPrompt, fillSkeletonFromResponse } from '../../utils/skeletonFillPrompt';
import { topicPreferredWords } from '../../logic/wordCategories';

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
  /** Regenerate at the suggested larger grid size (shown on placement failures). */
  onApplySuggestion?: (width: number, height: number) => void;
  /**
   * Present when this skeleton exists because Force Dimensions pinned the
   * grid. Regenerates without the pin — the escape hatch back to the
   * default words-to-puzzle flow.
   */
  onReleaseDimensions?: () => void;
  /**
   * Optional pre-filled words + clues to SEED the editable slots, keyed by
   * slot id. Manual fill passes nothing (every blank starts empty); a future
   * AI/solver fill passes the words it placed so the user lands in this view
   * with the grid filled in and editable. Only entries for empty (non
   * user-word) slots are applied; the user can change any of them. Changing
   * the seed remounts via React `key`, so this is read once on mount.
   */
  initialAssignments?: Map<number, { word: string; clue: string }>;
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
  onApplySuggestion,
  onReleaseDimensions,
  initialAssignments,
}: SkeletonFillViewProps) {
  const [slotEdits, setSlotEdits] = useState<Map<number, SlotEditState>>(() => {
    const initial = new Map<number, SlotEditState>();
    for (const slot of skeleton.slots) {
      if (!slot.isUserWord) {
        // Seed from a solver/AI pre-fill when one was passed; sanitize the
        // word the same way typed input is (lowercase a–z, clamped to length)
        // so a seeded value behaves identically to one the user typed.
        const seed = initialAssignments?.get(slot.id);
        const seedWord = seed
          ? seed.word.toLowerCase().replace(/[^a-z]/g, '').slice(0, slot.length)
          : '';
        initial.set(slot.id, { word: seedWord, clue: seed?.clue ?? '' });
      }
    }
    return initial;
  });

  // Blanks that were auto-completed with a generic word-bank word rather than
  // an AI/topic word. Bank fills arrive with an empty clue (the AI's own picks
  // and spares always carry a clue), so an empty-clue seed is the signal. We
  // flag these in the list as "review" — they fit the crossings but aren't
  // chosen for the teacher's topic — and clear the flag once the slot is edited.
  const [bankFilledIds, setBankFilledIds] = useState<Set<number>>(() => {
    const ids = new Set<number>();
    for (const slot of skeleton.slots) {
      if (slot.isUserWord) continue;
      const seed = initialAssignments?.get(slot.id);
      if (seed && seed.word && !seed.clue.trim()) ids.add(slot.id);
    }
    return ids;
  });

  // Drop a slot's "from word bank" flag — called whenever the user edits it,
  // since an edited slot is now the teacher's deliberate choice, not filler.
  const clearBankFlag = useCallback((slotId: number) => {
    setBankFilledIds(prev => {
      if (!prev.has(slotId)) return prev;
      const next = new Set(prev);
      next.delete(slotId);
      return next;
    });
  }, []);

  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(() => {
    // Prefer the first blank slot that still has no seeded word, so a partly
    // pre-filled grid lands the user on the next thing to do; otherwise the
    // first empty slot.
    const firstUnseeded = skeleton.slots.find(
      s => !s.isUserWord && !(initialAssignments?.get(s.id)?.word),
    );
    if (firstUnseeded) return firstUnseeded.id;
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
  // Every blank slot filled (vacuously true when all slots are user words)
  // and no crossing-letter conflicts.
  const canFinalize = filledCount === totalEmpty && conflictCount === 0;

  // Filled blanks that still have no clue. Clues are how a crossword is solved,
  // so we nudge (without blocking) before the puzzle is created — this catches
  // word-bank fills and any answer typed without a clue.
  const slotsNeedingClues = emptySlots.filter(s => {
    const e = slotEdits.get(s.id);
    return e && e.word.length === s.length && !e.clue.trim();
  }).length;

  // Words already used anywhere in the puzzle — suggestions must avoid these.
  const usedWords = useMemo(() => {
    const used = new Set<string>();
    for (const slot of skeleton.slots) {
      if (slot.isUserWord && slot.word) used.add(slot.word);
    }
    for (const edit of slotEdits.values()) {
      if (edit.word) used.add(edit.word);
    }
    return used;
  }, [skeleton.slots, slotEdits]);

  // Geometry + lookups for the "Fill with AI" panel. The grid never changes
  // here (the skeleton is fixed), so these memoize on the slots.
  const intersections = useMemo(() => computeIntersections(skeleton.slots), [skeleton.slots]);
  const slotById = useMemo(() => {
    const m = new Map<number, SkeletonSlot>();
    for (const s of skeleton.slots) m.set(s.id, s);
    return m;
  }, [skeleton.slots]);

  // The words already in the puzzle — the must-include words this skeleton was
  // built from (or carried over from "build your own grid"). These seed the AI
  // prompt by DEFAULT so a teacher gets on-theme fill without typing a topic.
  const placedWords = useMemo(
    () =>
      skeleton.slots
        .filter(s => s.isUserWord && (s.displayWord ?? s.word))
        .map(s => (s.displayWord ?? s.word)!.toUpperCase()),
    [skeleton.slots],
  );

  // When the teacher leaves Topic blank, ask the AI to infer the theme from the
  // words already placed instead of falling back to generic vocabulary.
  const defaultAiContext = useMemo(() => {
    if (placedWords.length === 0) return '';
    return (
      `These words are already placed in the puzzle: ${placedWords.join(', ')}. ` +
      `Infer their shared theme and choose fill words that suit the same theme and audience.`
    );
  }, [placedWords]);

  // "Fill with AI" panel: copy a slot-aware prompt, paste the reply, place it.
  const [aiOpen, setAiOpen] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiCopied, setAiCopied] = useState(false);
  // Holds the prompt text when the Clipboard API fails, so we can reveal it
  // for manual copy instead of silently losing it.
  const [aiCopyFallback, setAiCopyFallback] = useState<string | null>(null);
  const [aiOutcome, setAiOutcome] = useState<{
    filledCount: number;
    lockedCount: number;
    unfilledCount: number;
    issues: string[];
  } | null>(null);

  const [promptToast, setPromptToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(message: string) {
    setPromptToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setPromptToast(null), 3000);
  }

  /** Fill every remaining blank with a consistent suggested word. */
  function handleAutoFill() {
    const planned = planAutoFill(skeleton.slots, slotEdits);
    if (planned.size === 0) {
      showToast('No matching words found for the remaining blanks');
      return;
    }
    setSlotEdits(prev => {
      const next = new Map(prev);
      for (const [slotId, word] of planned) {
        const current = next.get(slotId) ?? { word: '', clue: '' };
        next.set(slotId, { ...current, word });
      }
      return next;
    });
    // These are generic word-bank fills — flag them for review.
    setBankFilledIds(prev => {
      const next = new Set(prev);
      for (const [slotId] of planned) next.add(slotId);
      return next;
    });
    showToast(`Filled ${planned.size} slot${planned.size !== 1 ? 's' : ''} — add clues to finish`);
  }

  /**
   * Build a slots array reflecting what's placed RIGHT NOW: must-include user
   * words, and any blank the user has already typed in FULL, carry a `.word`;
   * still-empty blanks don't. The prompt, parser, and solver all read this so
   * the AI is asked to fill only the remaining blanks and to cross the rest.
   */
  function buildPlacedSlots(): SkeletonSlot[] {
    return skeleton.slots.map(slot => {
      if (slot.isUserWord) return slot; // already carries its word + clue
      const edit = slotEdits.get(slot.id);
      if (edit && edit.word.length === slot.length) {
        return { ...slot, word: edit.word, clue: edit.clue };
      }
      return slot; // still a blank
    });
  }

  /**
   * Copy the slot-aware AI prompt for the remaining blanks — the SAME builder
   * BYOG uses (so the two flows stay in lockstep). Once every blank has a word,
   * fall back to a clue-writing prompt for any missing clues. Clipboard only.
   */
  async function handleCopyFillPrompt() {
    const placed = buildPlacedSlots();
    const blanks = placed.filter(s => !s.word);

    let prompt: string;
    if (blanks.length > 0) {
      prompt = buildSkeletonFillPrompt({
        slots: placed,
        intersections,
        width: skeleton.width,
        height: skeleton.height,
        grid: gridFromPlacedSlots(placed, skeleton.width, skeleton.height),
        context: aiTopic.trim() || defaultAiContext,
        language: 'english',
        allowTwoWords: false,
        allowProperNouns: false,
        solverAssist: true,
      });
    } else {
      const themeWords = skeleton.slots.filter(s => s.isUserWord && s.word).map(s => s.word!);
      const missingClues = skeleton.slots
        .filter(s => {
          const edit = slotEdits.get(s.id);
          return edit && edit.word && !edit.clue.trim();
        })
        .map(s => ({
          label: `${s.id}-${s.direction === 'across' ? 'Across' : 'Down'}`,
          word: slotEdits.get(s.id)!.word,
        }));
      if (missingClues.length === 0) {
        showToast('Nothing left to ask — all slots have words and clues');
        return;
      }
      prompt = buildCluePrompt({ words: missingClues, themeWords });
    }

    try {
      await navigator.clipboard.writeText(prompt);
      setAiCopied(true);
      setAiCopyFallback(null);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setAiCopied(false), 2000);
    } catch {
      // Clipboard blocked — reveal the prompt for manual copy so it isn't lost.
      setAiCopyFallback(prompt);
      showToast('Could not access the clipboard');
    }
  }

  /**
   * Place a pasted AI reply into the blanks, reusing the EXACT pipeline BYOG
   * uses (parse → lock AI picks + already-placed words → solve + word-bank
   * fallback). Only blank (non user-word) slots are written; all stay editable.
   */
  function handlePlaceResponse() {
    const placed = buildPlacedSlots();
    const { assignments, unfilledSlotIds, lockedCount, issues } = fillSkeletonFromResponse({
      response: aiResponse,
      slots: placed,
      intersections,
      width: skeleton.width,
      height: skeleton.height,
      language: 'english',
      allowTwoWords: false,
      // Steer generic bank filler toward the puzzle's theme (topic + the words
      // already placed). Soft preference — no effect on which slots get filled.
      preferredWords: topicPreferredWords(aiTopic.trim(), placedWords),
      seed: 1,
    });

    setSlotEdits(prev => {
      const next = new Map(prev);
      for (const [slotId, a] of assignments) {
        const slot = slotById.get(slotId);
        if (!slot || slot.isUserWord) continue; // user words are shown, not edited here
        next.set(slotId, {
          word: a.word.toLowerCase().replace(/[^a-z]/g, '').slice(0, slot.length),
          clue: a.clue,
        });
      }
      return next;
    });

    // Track provenance: an assignment with no clue came from the generic word
    // bank (the AI's own picks + spares always carry a clue), so flag it for
    // review; a clued word is the AI's own, so clear any stale flag.
    setBankFilledIds(prev => {
      const next = new Set(prev);
      for (const [slotId, a] of assignments) {
        const slot = slotById.get(slotId);
        if (!slot || slot.isUserWord) continue;
        if (a.word && !a.clue.trim()) next.add(slotId);
        else next.delete(slotId);
      }
      return next;
    });

    // How many blank slots actually received a word (excludes user words).
    let blanksFilled = 0;
    for (const [slotId] of assignments) {
      const slot = slotById.get(slotId);
      if (slot && !slot.isUserWord) blanksFilled++;
    }

    setAiOutcome({
      filledCount: blanksFilled,
      lockedCount,
      unfilledCount: unfilledSlotIds.length,
      issues,
    });
  }

  const handleWordChange = useCallback((slotId: number, word: string) => {
    setSlotEdits(prev => {
      const next = new Map(prev);
      const current = next.get(slotId) ?? { word: '', clue: '' };
      next.set(slotId, { ...current, word: word.toLowerCase().replace(/[^a-z]/g, '') });
      return next;
    });
    clearBankFlag(slotId);
  }, [clearBankFlag]);

  const handleClueChange = useCallback((slotId: number, clue: string) => {
    setSlotEdits(prev => {
      const next = new Map(prev);
      const current = next.get(slotId) ?? { word: '', clue: '' };
      next.set(slotId, { ...current, clue });
      return next;
    });
    clearBankFlag(slotId);
  }, [clearBankFlag]);

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
      {/* Title + status bar */}
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-lg font-semibold text-ink">
          {totalEmpty === 0 ? 'Your puzzle is ready' : 'Fill in the blanks'}
        </h2>
        <div className="flex items-center gap-3 text-sm">
          {totalEmpty > 0 && (
            <span className={filledCount === totalEmpty
              ? 'text-rubric font-semibold'
              : 'text-ink-2'}>
              {filledCount}/{totalEmpty} slots filled
            </span>
          )}
          {conflictCount > 0 && (
            <span className="text-warn font-medium">
              {conflictCount} conflict{conflictCount !== 1 ? 's' : ''}
            </span>
          )}
          {skeleton.mustPlacedCount < skeleton.mustTotalCount && (
            <span className="text-xs text-ink-3">
              {skeleton.mustPlacedCount} of {skeleton.mustTotalCount} of your words placed
            </span>
          )}
        </div>
      </div>

      {/* Auto-grow note — the grid was enlarged so every word fits */}
      {skeleton.grewFrom && (
        <div className="note">
          <p className="text-xs text-ink-2">
            Grid sized up to {skeleton.width}&times;{skeleton.height} so every word fits.
          </p>
        </div>
      )}

      {/* Pinned-size note — say WHY there are blanks, and offer the way out */}
      {onReleaseDimensions && totalEmpty > 0 && (
        <div className="note">
          <p className="text-xs text-ink-2">
            The grid is pinned at {skeleton.width}&times;{skeleton.height} (Force
            dimensions), so blank slots were added around your words.{' '}
            <button
              onClick={onReleaseDimensions}
              className="font-medium text-rubric hover:underline"
            >
              Generate without the pinned size
            </button>
            {' '}for a finished puzzle.
          </p>
        </div>
      )}

      {/* Failure warnings */}
      {skeleton.failures.length > 0 && (
        <div className="note note-danger">
          <p className="text-xs font-medium text-danger mb-1">
            These words couldn&rsquo;t be placed:
          </p>
          {skeleton.failures.map((f, i) => (
            <p key={i} className="text-xs text-ink-2">
              <span className="font-mono uppercase">{f.word}</span>
              {' '}&mdash; {f.reason === 'too_long' ? 'longer than the grid' : 'no letters left to cross it'}
            </p>
          ))}
          {skeleton.suggestion && onApplySuggestion && (
            <button
              onClick={() => onApplySuggestion(skeleton.suggestion!.width, skeleton.suggestion!.height)}
              className="btn-primary btn-sm mt-2">
              Regenerate at {skeleton.suggestion.width}&times;{skeleton.suggestion.height} — fits all your words
            </button>
          )}
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

      {/* Fill with AI — a clear toggle button opens an advanced box: set a topic
          (defaults to the words already in the puzzle), copy a slot-aware prompt,
          paste the reply, place it. Shares the BYOG pipeline
          (parse -> lock AI picks + placed words -> solve). */}
      {totalEmpty > 0 && (
        <div className="warm-card overflow-hidden">
          <button
            type="button"
            onClick={() => setAiOpen(o => !o)}
            aria-expanded={aiOpen}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left
                       hover:bg-well/50 transition-colors"
          >
            <span className="flex flex-col">
              <span className="font-display font-semibold text-ink">Fill with AI</span>
              <span className="text-xs text-ink-2">
                Let an AI assistant complete the blanks &mdash; copy a prompt, paste the reply back.
              </span>
            </span>
            <svg
              viewBox="0 0 20 20" fill="none" aria-hidden="true"
              className={`h-5 w-5 flex-shrink-0 text-ink-3 transition-transform ${aiOpen ? 'rotate-180' : ''}`}
            >
              <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {aiOpen && (
          <div className="px-4 pb-4 pt-1 space-y-3 border-t border-line/50 animate-fade-in">
            <div>
              <label htmlFor="skel-ai-topic" className="block text-xs font-medium text-ink-2 mb-1">
                Topic <span className="text-ink-3">(optional &mdash; helps the AI stay on theme)</span>
              </label>
              <input
                id="skel-ai-topic"
                type="text"
                value={aiTopic}
                onChange={e => setAiTopic(e.target.value)}
                placeholder={defaultAiContext
                  ? 'Add a topic to steer it — or leave blank to use your existing words'
                  : 'e.g. "the water cycle" — or leave blank'}
                className="field"
              />
              {!aiTopic.trim() && placedWords.length > 0 && (
                <p className="mt-1 text-xs text-ink-3">
                  Using your existing words:{' '}
                  <span className="font-mono text-ink-2">
                    {placedWords.slice(0, 6).join(', ')}{placedWords.length > 6 ? '…' : ''}
                  </span>
                </p>
              )}
            </div>

            {/* Model guidance — completing a fixed grid rewards a strong model. */}
            <div className="note py-2">
              <p className="text-xs text-ink-2">
                <span className="font-medium text-rubric">Tip</span> &mdash; each answer
                must fit an exact length and share its crossing letters, so use the most
                capable AI you have. Lighter &ldquo;mini&rdquo; or &ldquo;flash&rdquo; models
                often miscount or break crossings, leaving more for you to fix by hand.
              </p>
            </div>

            <button onClick={() => void handleCopyFillPrompt()} className="btn-secondary btn-sm">
              {aiCopied ? 'Copied' : 'Copy AI prompt'}
            </button>

            {aiCopyFallback && (
              <div className="note note-warn py-2 space-y-2 animate-fade-in">
                <p className="text-xs text-ink-2">
                  <span className="font-medium text-warn">Couldn&rsquo;t copy automatically.</span>{' '}
                  Select the prompt below and copy it (Ctrl/Cmd + C).
                </p>
                <textarea
                  readOnly
                  value={aiCopyFallback}
                  rows={4}
                  onFocus={e => e.currentTarget.select()}
                  aria-label="Prompt to copy manually"
                  className="field font-mono text-[11px] leading-relaxed resize-y"
                />
              </div>
            )}

            <textarea
              value={aiResponse}
              onChange={e => { setAiResponse(e.target.value); setAiOutcome(null); }}
              rows={5}
              placeholder="Paste the AI's reply here, then place it into the grid."
              aria-label="AI response to fill the skeleton"
              className="field font-mono placeholder:font-sans leading-relaxed resize-y"
            />

            <button
              onClick={handlePlaceResponse}
              disabled={aiResponse.trim().length === 0}
              className="btn-primary btn-sm w-full sm:w-auto"
            >
              Place the answers
            </button>

            {aiOutcome && (
              <div className="space-y-2 animate-fade-in">
                <div className="note py-2">
                  <p className="text-sm text-ink-2">
                    <span className="font-medium text-ink">
                      Placed {aiOutcome.filledCount} of {totalEmpty} blank{totalEmpty !== 1 ? 's' : ''}
                    </span>
                    {aiOutcome.lockedCount > 0 && (
                      <> &mdash; {aiOutcome.lockedCount} from the AI&rsquo;s answer
                        {aiOutcome.filledCount > aiOutcome.lockedCount && <>, the rest completed to fit</>}.</>
                    )}
                    {' '}Edit anything below.
                  </p>
                </div>
                {aiOutcome.unfilledCount > 0 && (
                  <div className="note note-warn py-2">
                    <p className="text-sm text-ink-2">
                      {aiOutcome.unfilledCount} slot{aiOutcome.unfilledCount !== 1 ? 's' : ''} couldn&rsquo;t be
                      filled automatically &mdash; type a word into each below.
                    </p>
                  </div>
                )}
                {aiOutcome.issues.length > 0 && (
                  <div className="note note-warn py-2">
                    <p className="text-overline uppercase font-medium text-warn mb-1">
                      {aiOutcome.issues.length} line{aiOutcome.issues.length !== 1 ? 's' : ''} couldn&rsquo;t be used
                    </p>
                    <ul className="space-y-1">
                      {aiOutcome.issues.map((m, i) => (
                        <li key={i} className="text-xs text-ink-2">{m}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
          )}
        </div>
      )}

      {/* Generic-fill review prompt — say how many slots are off-topic filler. */}
      {bankFilledIds.size > 0 && (
        <div className="note py-2">
          <p className="text-sm text-ink-2">
            <span className="font-medium text-ink">
              {bankFilledIds.size} slot{bankFilledIds.size !== 1 ? 's' : ''} filled from the word bank
            </span>{' '}
            &mdash; common words that fit the crossings but weren&rsquo;t chosen for your topic, tagged
            {' '}<span className="text-warn font-medium">word bank</span> below. Replace any that don&rsquo;t
            suit your puzzle, or keep them and add a clue.
          </p>
        </div>
      )}

      {/* Slot fill list */}
      <div className="warm-card p-4 space-y-2 max-h-[40vh] overflow-y-auto scrollbar-thin">
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className="sub-label">
            Fill the slots
          </p>
          {totalEmpty > 0 && (
            <div className="flex items-center gap-2">
              {promptToast && (
                <span className="text-xs text-rubric animate-fade-in">
                  {promptToast}
                </span>
              )}
              <button onClick={handleAutoFill}
                title="Fill every remaining blank with a common word that fits — you write the clues"
                className="btn-secondary btn-sm">
                Auto-fill blanks
              </button>
            </div>
          )}
        </div>
        {skeleton.slots.map(slot => {
          if (slot.isUserWord) {
            return <FilledSlotRow key={slot.id} slot={slot} />;
          }
          const edit = slotEdits.get(slot.id) ?? { word: '', clue: '' };
          const constraints = liveConstraints.get(slot.id) ?? slot.constraints;
          const hasConflict = conflicts.has(slot.id);
          const isSelected = selectedSlotId === slot.id;

          // Suggestions must not repeat words used elsewhere, but the slot's
          // own current word shouldn't filter its own alternatives.
          const excludeForSlot = new Set(usedWords);
          if (edit.word) excludeForSlot.delete(edit.word);
          const suggestions = edit.word.length === slot.length
            ? []
            : suggestWordsForSlot(slot.length, constraints, excludeForSlot, 6);

          return (
            <EmptySlotRow
              key={slot.id}
              slot={slot}
              edit={edit}
              constraints={constraints}
              hasConflict={hasConflict}
              isSelected={isSelected}
              isBankFilled={bankFilledIds.has(slot.id)}
              suggestions={suggestions}
              onSelect={() => setSelectedSlotId(slot.id)}
              onWordChange={(w) => handleWordChange(slot.id, w)}
              onClueChange={(c) => handleClueChange(slot.id, c)}
            />
          );
        })}
      </div>

      {/* Clue nudge — ready to create, but some answers have no clue yet. */}
      {canFinalize && slotsNeedingClues > 0 && (
        <div className="note note-warn py-2">
          <p className="text-sm text-ink-2">
            <span className="font-medium text-warn">
              {slotsNeedingClues} answer{slotsNeedingClues !== 1 ? 's' : ''} still
              need{slotsNeedingClues !== 1 ? '' : 's'} a clue.
            </span>{' '}
            Players solve a crossword from its clues &mdash; add them above. You can also create the
            puzzle now and fill clues in later.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between gap-3">
        <button onClick={onBack} className="btn-ghost">
          Back
        </button>
        <div className="flex gap-2">
          <button onClick={onRegenerate} className="btn-secondary">
            Different layout
          </button>
          <button onClick={handleFinalize} disabled={!canFinalize}
            className="btn-primary">
            Create puzzle
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
    <div className="rounded-md border border-line bg-well px-3 py-1.5 flex items-center gap-2">
      <span className="text-xs font-mono text-ink-3 w-16 flex-shrink-0">
        {slot.id}-{slot.direction === 'across' ? 'A' : 'D'}
      </span>
      <span className="text-sm font-medium text-ink uppercase tracking-wide">
        {slot.displayWord ?? slot.word}
      </span>
      <span className="text-xs text-ink-3 ml-auto truncate max-w-[10rem]">
        {slot.clue}
      </span>
    </div>
  );
}

function EmptySlotRow({
  slot, edit, constraints, hasConflict, isSelected, isBankFilled, suggestions, onSelect, onWordChange, onClueChange,
}: {
  slot: SkeletonSlot;
  edit: { word: string; clue: string };
  constraints: Map<number, string>;
  hasConflict: boolean;
  isSelected: boolean;
  isBankFilled: boolean;
  suggestions: string[];
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
          ? 'border-warn/50 bg-warn/5'
          : isSelected
            ? 'border-rubric/60 bg-card shadow-sm'
            : 'border-line/60 bg-card/60'}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-xs font-mono text-ink-2 w-16 flex-shrink-0">
          {slot.id}-{slot.direction === 'across' ? 'A' : 'D'}
        </span>
        <span className="text-sm font-mono tracking-widest text-ink-2">
          {pattern}
        </span>
        <div className="ml-auto flex items-center gap-2">
          {isBankFilled && (
            <span
              title="Generic filler from the word bank — replace it if it doesn't fit your topic"
              className="px-1.5 py-0.5 rounded-btn text-[10px] uppercase tracking-wide font-medium
                         bg-warn/10 text-warn border border-warn/25 whitespace-nowrap">
              word bank
            </span>
          )}
          <span className="text-xs text-ink-3">{slot.length} letters</span>
        </div>
      </div>
      <div className="flex gap-2">
        <input type="text" value={edit.word} onChange={(e) => onWordChange(e.target.value)}
          placeholder={`${slot.length}-letter word`} maxLength={slot.length}
          onClick={(e) => e.stopPropagation()}
          className={`flex-1 rounded-md border px-2 py-1 text-sm font-mono uppercase
                     bg-card text-ink placeholder:text-ink-3
                     focus:outline-none focus:border-accent transition-colors
                     ${!lengthOk ? 'border-danger/50' : 'border-line-2'}`} />
        <input type="text" value={edit.clue} onChange={(e) => onClueChange(e.target.value)}
          placeholder="Clue" onClick={(e) => e.stopPropagation()}
          className="flex-[2] rounded-md border border-line-2 px-2 py-1 text-sm
                     bg-card text-ink placeholder:text-ink-3
                     focus:outline-none focus:border-accent transition-colors" />
      </div>
      {hasConflict && <p className="text-xs text-warn mt-1">Letter conflict with a crossing word</p>}
      {suggestions.length > 0 && (
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          <span className="sub-label">
            Ideas
          </span>
          {suggestions.map(word => (
            <button
              key={word}
              onClick={(e) => { e.stopPropagation(); onWordChange(word); }}
              className="px-2 py-0.5 rounded-btn text-xs font-mono uppercase
                         bg-rubric/10 text-rubric border border-rubric/25
                         hover:bg-rubric/20 transition-all">
              {word}
            </button>
          ))}
        </div>
      )}
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
