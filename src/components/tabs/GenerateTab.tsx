/**
 * Generate tab — skeleton-first crossword creation.
 *
 * The user's primary flow:
 *   1. Pick grid size (width, height)
 *   2. Optionally toggle "Strictly Include Words" → enter must-include words
 *   3. Click "Generate Skeleton" → see a visual grid with blank slots
 *   4. Fill blank slots with words + clues (live constraint updates)
 *   5. Click "Create Puzzle" → done
 *
 * Word search mode uses the old entry-first flow (enter words → generate).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { InfoTip } from '../ui/InfoTip';
import { SettingsPanel } from '../settings/SettingsPanel';
import { CrosswordGrid } from '../grid/CrosswordGrid';
import { CluePanel } from '../clues/CluePanel';
import { WordSearchPreviewGrid, WordBankPanel } from '../grid/WordSearchPreview';
import {
  createWordSearchFromEntries,
  createSkeletonFromEntries,
  createOptimizedPuzzleFromEntries,
} from '../../logic/createPuzzle';
import type { CrosswordResult, PuzzleMode, SkeletonResult, PrioritizedEntry } from '../../logic/types';
import {
  recommendGridSize,
  recommendWordSearchGridSize,
  detectOutlierWords,
  gridLengthSignature,
  resolveEffectiveGridSize,
  recommendedWordCountTarget,
} from '../../logic/gridRecommendation';
import { OPTIMIZED_BIAS } from '../settings/generationSettings';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { WORD_PACKS, getWordPackById, type PackSource } from '../../presets/wordPacks';
import { parseFile } from '../../utils/fileParser';
import { normalizeWordWhileTyping, toGridWord } from '../../logic/language';
import { loadWizardState, saveWizardState } from '../sources/wizardState';
import { resolveFileUploadSource } from '../sources/fileUploadSource';
import { resolveTextEntrySource } from '../sources/textEntrySource';
import type { ImportedEntryRows } from '../sources/types';
import {
  createEmptyEntryRow,
  createEntryRowsFromEntries,
  getGenerationEntriesFromRows,
  splitEntriesBySource,
  setEntryRowSource,
  hasMeaningfulRows,
  type EntryTableRow,
  type EntryValidationOptions,
} from '../entries/entryTable';
import { EntryTableEditor } from '../entries/EntryTableEditor';
import { TextImportView } from '../entries/TextImportView';
import { SkeletonFillView, type FilledSlotData } from '../skeleton/SkeletonFillView';
import { MiniGridPreview } from '../grid/MiniGridPreview';

interface GenerateTabProps {
  puzzle: CrosswordResult | null;
  /** Mode the current `puzzle` was generated as (crossword vs word search). */
  generatedMode: PuzzleMode;
  onPuzzleGenerated: (result: CrosswordResult, mode: PuzzleMode) => void;
  /** Jump to the AI Words tab (bridge from the words card). */
  onGoToAiWords: () => void;
  /** Bridges out of the ready strip — the natural next steps. */
  onGoToPlay: () => void;
  onGoToExport: () => void;
}

type ImportDecision = 'replace' | 'append';

/** How each pack's provenance reads in the picker and import summary. */
const PACK_SOURCE_LABEL: Record<PackSource, string> = {
  ai: 'AI-generated',
  curated: 'Hand-picked',
};

function randomSeed(): number {
  return Math.floor(Math.random() * 10000);
}

/** One-time flag: has the user ever interacted with the answers toggle? */
const ANSWERS_CALLOUT_KEY = 'crossword-answers-callout-seen';

function hasSeenAnswersCallout(): boolean {
  try {
    return localStorage.getItem(ANSWERS_CALLOUT_KEY) === '1';
  } catch {
    return true; // no storage — don't nag on every render
  }
}

function markAnswersCalloutSeen(): void {
  try {
    localStorage.setItem(ANSWERS_CALLOUT_KEY, '1');
  } catch {
    // best effort
  }
}

/**
 * Turn a skeleton into a playable crossword: user-word slots keep their
 * words, manually filled slots are written into the grid. Used both by
 * the fill view's Create button and the direct words-to-puzzle path
 * (where `filledSlots` is empty because there are no blanks).
 */
function skeletonToPuzzle(skeleton: SkeletonResult, filledSlots: FilledSlotData[]): CrosswordResult {
  const fillMap = new Map<number, FilledSlotData>();
  for (const f of filledSlots) {
    fillMap.set(f.slotId, f);
  }

  // Merge: pre-filled slots (user words) + manually filled slots
  const allWordLocations = skeleton.slots
    .map(slot => {
      const fill = fillMap.get(slot.id);
      const word = slot.isUserWord ? slot.word! : fill?.word;
      const clue = slot.isUserWord ? slot.clue! : fill?.clue ?? '';
      if (!word) return null;
      return {
        word,
        isHorizontal: slot.direction === 'across',
        isReversed: false,
        clue,
        x: slot.startX,
        y: slot.startY,
        // Two-word phrases keep their spaced form for clue lists.
        ...(slot.isUserWord && slot.displayWord ? { displayWord: slot.displayWord } : {}),
      };
    })
    .filter((loc): loc is NonNullable<typeof loc> => loc !== null);

  // Rebuild the grid with user-filled words written into it
  const grid = skeleton.grid.map(row => [...row]);
  for (const slot of skeleton.slots) {
    const fill = fillMap.get(slot.id);
    if (!fill) continue;
    for (let i = 0; i < fill.word.length; i++) {
      const x = slot.direction === 'across' ? slot.startX + i : slot.startX;
      const y = slot.direction === 'across' ? slot.startY : slot.startY + i;
      grid[y][x] = fill.word[i];
    }
  }

  return {
    grid,
    wordLocations: allWordLocations,
    width: skeleton.width,
    height: skeleton.height,
    // Carried through so the ready strip can mention the size-up honestly.
    ...(skeleton.grewFrom ? { grewFrom: skeleton.grewFrom } : {}),
  };
}

export function GenerateTab({
  puzzle, generatedMode, onPuzzleGenerated, onGoToAiWords, onGoToPlay, onGoToExport,
}: GenerateTabProps) {
  // --- State ---
  // Answers start hidden so the result is playable at first sight; a
  // one-time callout points at the toggle until the user flips it once.
  const [showAnswers, setShowAnswers] = useState(false);
  const [answersCallout, setAnswersCallout] = useState(() => !hasSeenAnswersCallout());
  const [gridKey, setGridKey] = useState(0);
  const [wizard, setWizard] = useState(() => loadWizardState());
  const [pendingImport, setPendingImport] = useState<ImportedEntryRows | null>(null);
  const [isImportingFile, setIsImportingFile] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Skeleton-first state
  const [activeSkeleton, setActiveSkeleton] = useState<SkeletonResult | null>(null);
  const [showTextImport, setShowTextImport] = useState(false);

  // Cleared word list held for a short undo window
  const [clearUndo, setClearUndo] = useState<{ rows: EntryTableRow[]; count: number } | null>(null);

  // Scroll-to-generation affordance. You scroll DOWN to reach "Generate", so
  // the action — the spinner first, then the finished puzzle — happens UP at
  // the top of the result panel, out of view. The moment generation starts,
  // a floating arrow offers a graceful ride up to it, and stays while the
  // generation (in progress OR done) is out of view. We watch a 0-height
  // sentinel pinned at the TOP of the result panel (present for the spinner
  // and the result alike); the tall clue list below it could otherwise stay
  // in view and mask that the top scrolled away.
  const resultTopRef = useRef<HTMLDivElement | null>(null);
  const [resultOffscreen, setResultOffscreen] = useState<'above' | 'below' | null>(null);
  // One-shot intent: armed when a generation STARTS, disarmed once the user
  // actually reaches the result. This is what makes the arrow event-driven
  // (only after Generate) rather than scroll-driven — scrolling back down to
  // an existing puzzle later never re-arms it.
  const [pendingScrollToPuzzle, setPendingScrollToPuzzle] = useState(false);

  useEffect(() => {
    const node = resultTopRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setResultOffscreen(null);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      setResultOffscreen(
        entry.isIntersecting ? null : (entry.boundingClientRect.top < 0 ? 'above' : 'below'),
      );
      // Reaching the top of the result (however they got there — the arrow or
      // their own scroll) fulfills the intent, so the arrow retires.
      if (entry.isIntersecting) setPendingScrollToPuzzle(false);
    }, { threshold: 0 });
    observer.observe(node);
    return () => observer.disconnect();
    // Re-attach when entering/leaving the skeleton view (it unmounts the panel).
  }, [activeSkeleton]);

  function scrollToResult() {
    resultTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // The user took the ride up; retire the arrow immediately rather than
    // waiting for the smooth scroll to land and the observer to fire.
    setPendingScrollToPuzzle(false);
  }

  // Auto-dismiss the undo offer; cleanup keeps stale timers from killing a newer offer
  useEffect(() => {
    if (!clearUndo) return;
    const timer = window.setTimeout(() => setClearUndo(null), 5000);
    return () => window.clearTimeout(timer);
  }, [clearUndo]);

  // Persist wizard state (words, settings, draft text) across reloads.
  useEffect(() => {
    saveWizardState(wizard);
  }, [wizard]);

  // --- Derived ---

  // Language + two-word option + clue policy, shared by every word
  // entry/validation path. Word searches don't require clues — the word
  // bank is the puzzle.
  const wordRules = useMemo<EntryValidationOptions>(
    () => ({
      language: wizard.settings.language,
      allowTwoWords: wizard.settings.allowTwoWords,
      requireClue: wizard.settings.puzzleMode === 'crossword',
    }),
    [wizard.settings.language, wizard.settings.allowTwoWords, wizard.settings.puzzleMode],
  );

  const wordEntries = useMemo(
    () => getGenerationEntriesFromRows(wizard.table.rows, wordRules),
    [wizard.table.rows, wordRules],
  );

  const isCrossword = wizard.settings.puzzleMode === 'crossword';

  // The grid recommendation is advisory — generation auto-grows from it — so
  // it doesn't need to track every keystroke. Recompute it only when the set
  // of word *lengths* settles: we debounce a stable length signature (350ms),
  // and the memo below recomputes off that. Typing "ELEPHANT" no longer
  // ratchets the suggested size up letter-by-letter; it snaps once on pause.
  // Clue edits and row reordering don't change the signature, so they never
  // recompute the size at all. The mode toggle is NOT debounced (it's an
  // immediate, deliberate click that changes the formula) — see the memo deps.
  //
  // We read the live `wordEntries` through a ref inside the memo so the memo
  // sees the current words for outlier *naming* without listing wordEntries as
  // a dependency (which would re-fire on every keystroke and defeat the debounce).
  const lengthSignature = useMemo(
    () => gridLengthSignature(wordEntries.map(e => toGridWord(e.word).length)),
    [wordEntries],
  );
  const debouncedSignature = useDebouncedValue(lengthSignature, 350);

  // Empty <-> non-empty is a meaningful boundary, not keystroke thrash, so it
  // bypasses the debounce: clearing the list drops the recommendation (and the
  // auto banner) at once, and the first word's recommendation isn't gated on a
  // stale prior value. Word-count changes *between* non-empty states still
  // ride the debounced signature.
  const hasEntries = wordEntries.length > 0;

  const wordEntriesRef = useRef(wordEntries);
  wordEntriesRef.current = wordEntries;

  const gridRecommendation = useMemo(() => {
    const entries = wordEntriesRef.current;
    if (entries.length === 0) return null;
    // Sizing cares about placed letters — two-word phrases count without their space.
    const lengths = entries.map(e => toGridWord(e.word).length);
    if (isCrossword) {
      const rec = recommendGridSize(lengths);
      // Outliers are detected on grid forms (placement length), but the
      // warning should name the word the way the user typed it.
      const gridToDisplay = new Map(entries.map(e => [toGridWord(e.word), e.word]));
      const outliers = detectOutlierWords(entries.map(e => toGridWord(e.word)))
        .map(o => ({ ...o, word: gridToDisplay.get(o.word) ?? o.word }));
      return { ...rec, outliers };
    }
    return { ...recommendWordSearchGridSize(lengths), outliers: [] };
    // Recompute when the lengths settle (debouncedSignature), the mode flips
    // (isCrossword, immediate), or the list crosses empty<->non-empty
    // (hasEntries, immediate). wordEntries itself is read via ref by design.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSignature, isCrossword, hasEntries]);

  // Grid size actually used for generation: the recommendation while
  // auto-sizing is on, the manual sliders otherwise. resolveEffectiveGridSize
  // is the single don't-stomp rule — a manual size is never overwritten by a
  // changing recommendation (see the helper). autoActive mirrors it for the
  // crop-to-fit flag and the SettingsPanel banner.
  const autoActive = wizard.settings.autoGridSize
    && gridRecommendation !== null
    && gridRecommendation.minDimension > 0;
  const { width: effectiveWidth, height: effectiveHeight } = resolveEffectiveGridSize(
    wizard.settings.autoGridSize,
    { width: wizard.settings.width, height: wizard.settings.height },
    gridRecommendation,
  );

  // --- Updaters ---

  function patchWizard(next: Partial<typeof wizard>) {
    setWizard(prev => ({ ...prev, ...next }));
  }

  function updateTableRows(updater: (rows: typeof wizard.table.rows) => typeof wizard.table.rows) {
    setWizard(prev => ({ ...prev, table: { ...prev.table, rows: updater(prev.table.rows) } }));
  }

  // --- Entry table handlers (for strictly-include words) ---

  function handleChangeRow(rowId: string, field: 'word' | 'clue', value: string) {
    updateTableRows(rows => rows.map(row =>
      row.id !== rowId ? row : { ...row, [field]: field === 'word' ? normalizeWordWhileTyping(value, wordRules) : value }
    ));
  }

  function handleAddRow() { updateTableRows(rows => [...rows, createEmptyEntryRow()]); }

  function handleDeleteRow(rowId: string) {
    updateTableRows(rows => {
      const next = rows.filter(r => r.id !== rowId);
      return next.length > 0 ? next : [createEmptyEntryRow()];
    });
  }

  /** Promote an AI suggestion to a guaranteed (manual) word — ADR-10 "Keep". */
  function handleKeepRow(rowId: string) {
    updateTableRows(rows => setEntryRowSource(rows, rowId, 'manual'));
  }

  function handleDismissWarnings() {
    setWizard(prev => ({ ...prev, table: { ...prev.table, warnings: [] } }));
  }

  function handleClearAll() {
    if (!hasMeaningfulRows(wizard.table.rows, wordRules)) return;
    setClearUndo({ rows: wizard.table.rows, count: wordEntries.length });
    setWizard(prev => ({ ...prev, table: { rows: [createEmptyEntryRow()], warnings: [] } }));
  }

  function handleUndoClear() {
    if (!clearUndo) return;
    setWizard(prev => ({ ...prev, table: { ...prev.table, rows: clearUndo.rows } }));
    setClearUndo(null);
  }

  // --- Import handlers ---

  function applyImport(payload: ImportedEntryRows, decision: ImportDecision) {
    const imported = createEntryRowsFromEntries(payload.entries, wordRules);
    setWizard(prev => ({
      ...prev,
      table: {
        rows: decision === 'append' ? [...prev.table.rows, ...imported] : (imported.length > 0 ? imported : [createEmptyEntryRow()]),
        warnings: payload.warnings,
      },
      textImport: { rawText: '' },
    }));
    setPendingImport(null);
    setShowTextImport(false);
  }

  function requestImport(payload: ImportedEntryRows) {
    if (hasMeaningfulRows(wizard.table.rows, wordRules)) { setPendingImport(payload); return; }
    applyImport(payload, 'replace');
  }

  async function handleTextImport() {
    const payload = await resolveTextEntrySource(wizard.textImport, wordRules);
    requestImport(payload);
  }

  async function handleFileImport(files: FileList | null) {
    if (!files || files.length === 0) return;
    setIsImportingFile(true);
    try {
      const parsed = await parseFile(files[0], wordRules);
      const payload = await resolveFileUploadSource({ fileName: files[0].name, entries: parsed.entries, warnings: parsed.errors });
      requestImport(payload);
    } finally { setIsImportingFile(false); }
  }

  function handleLoadPack(packId: string) {
    const pack = getWordPackById(packId);
    if (!pack) return;
    requestImport({
      entries: pack.entries,
      warnings: [],
      sourceLabel: pack.name,
      sourceSummary: `${pack.name} — ${PACK_SOURCE_LABEL[pack.source]} starter pack (${pack.entries.length} words)`,
    });
  }

  // --- Generation ---

  /** Every word the teacher added is must-include — that's why they added it. */
  function prioritizedEntries(): PrioritizedEntry[] {
    return wordEntries.map(e => ({
      word: e.word, clue: e.clue, priority: 'must' as const,
    }));
  }

  /**
   * Route a fresh generation result: a complete puzzle (no blanks, no
   * failures) goes straight to the finished view — including under Force
   * Dimensions — and only results that genuinely need the user (blank
   * slots to fill, or failures to resolve) open the skeleton workspace.
   * Every generation path funnels through here so the outcome is always
   * a pure function of the current words + settings, never of how the
   * previous attempt went.
   */
  function applyGenerationOutcome(skeleton: SkeletonResult) {
    const hasBlanks = skeleton.slots.some(s => !s.isUserWord);
    if (!hasBlanks && skeleton.failures.length === 0 && skeleton.slots.length > 0) {
      onPuzzleGenerated(skeletonToPuzzle(skeleton, []), 'crossword');
      setActiveSkeleton(null);
    } else {
      setActiveSkeleton(skeleton);
    }
    setGridKey(prev => prev + 1);
    setIsGenerating(false);
  }

  function handleGenerateSkeleton() {
    setIsGenerating(true);
    setPendingScrollToPuzzle(true);
    setTimeout(() => {
      const parsedSeed = parseInt(wizard.settings.seedText, 10);
      const seed = Number.isFinite(parsedSeed) ? parsedSeed : randomSeed();
      patchWizard({ settings: { ...wizard.settings, seedText: String(seed) } });

      // Flagship "Optimized" mode (ADR-10). Words split by provenance: manual
      // words (typed / pack) are GUARANTEED a spot (must-include); AI words are
      // the best-first candidate pool the engine curates down to a dense subset
      // on a pinned canvas. Only fires with AI words present — otherwise there
      // is nothing to curate, so we fall through to the Standard path (which
      // guarantees every word). It returns a finished SkeletonResult (zero
      // blanks, zero failures), so the SAME applyGenerationOutcome renders it.
      const { manual, ai } = splitEntriesBySource(wizard.table.rows, wordRules);
      if (wizard.settings.optimizedMode && ai.length > 0) {
        const targetCount = wizard.settings.optimizedTargetCount
          || recommendedWordCountTarget(effectiveWidth, effectiveHeight);
        const skeleton = createOptimizedPuzzleFromEntries({
          pool: ai, // best-first AI pool (response order = quality rank)
          mustInclude: manual, // teacher's words — never dropped
          targetCount,
          qualityBias: OPTIMIZED_BIAS[wizard.settings.qualityBias],
          seed,
          // Force Dimensions pins the user's grid (P2): build on exactly that
          // canvas instead of canvasForCount(targetCount). Auto leaves both
          // undefined so the engine sizes the canvas for the target count.
          ...(wizard.settings.forceDimensions
            ? { pinnedWidth: effectiveWidth, pinnedHeight: effectiveHeight }
            : {}),
        });
        applyGenerationOutcome(skeleton);
        return;
      }

      // Blank-slot skeletons only exist behind Force Dimensions or the
      // explicit blank-skeleton flow; the default path is words → puzzle.
      const useBankFill = wizard.settings.forceDimensions || wordEntries.length === 0;

      const skeleton = createSkeletonFromEntries({
        entries: prioritizedEntries(),
        width: effectiveWidth,
        height: effectiveHeight,
        seed,
        growToFit: !wizard.settings.forceDimensions,
        bankFill: useBankFill,
        cropToFit: autoActive,
      });

      applyGenerationOutcome(skeleton);
    }, 10);
  }

  function handleGenerateWordSearch() {
    if (wordEntries.length === 0) return;
    setIsGenerating(true);
    setPendingScrollToPuzzle(true);
    setTimeout(() => {
      const parsedSeed = parseInt(wizard.settings.seedText, 10);
      const seed = Number.isFinite(parsedSeed) ? parsedSeed : randomSeed();
      patchWizard({ settings: { ...wizard.settings, seedText: String(seed) } });

      const result = createWordSearchFromEntries({
        entries: wordEntries,
        width: effectiveWidth,
        height: effectiveHeight,
        seed,
        wordSearchDirections: wizard.settings.wordSearchDirections,
        growToFit: !wizard.settings.forceDimensions,
      });

      onPuzzleGenerated(result, 'wordsearch');
      setActiveSkeleton(null);
      setGridKey(prev => prev + 1);
      setIsGenerating(false);
    }, 10);
  }

  function handleSkeletonRegenerate() {
    // Generate the new seed NOW and use it directly.
    // We can't call handleGenerateSkeleton via setTimeout because of stale closures —
    // it would capture the old wizard state and regenerate with the same seed.
    const newSeed = randomSeed();
    setIsGenerating(true);
    setPendingScrollToPuzzle(true);
    setActiveSkeleton(null);

    setTimeout(() => {
      patchWizard({ settings: { ...wizard.settings, seedText: String(newSeed) } });

      const skeleton = createSkeletonFromEntries({
        entries: prioritizedEntries(),
        width: effectiveWidth,
        height: effectiveHeight,
        seed: newSeed,
        growToFit: !wizard.settings.forceDimensions,
        bankFill: wizard.settings.forceDimensions || wordEntries.length === 0,
        cropToFit: autoActive,
      });

      applyGenerationOutcome(skeleton);
    }, 150);
  }

  /**
   * Escape hatch from a pinned-size skeleton: drop Force Dimensions and
   * regenerate on the default words-to-puzzle path. Offered inside the
   * fill view so a stale checkbox can't silently keep producing blanks.
   */
  function handleReleaseDimensions() {
    setIsGenerating(true);
    setPendingScrollToPuzzle(true);
    setActiveSkeleton(null);

    setTimeout(() => {
      const parsedSeed = parseInt(wizard.settings.seedText, 10);
      const seed = Number.isFinite(parsedSeed) ? parsedSeed : randomSeed();
      patchWizard({
        settings: { ...wizard.settings, forceDimensions: false, seedText: String(seed) },
      });

      const skeleton = createSkeletonFromEntries({
        entries: prioritizedEntries(),
        width: effectiveWidth,
        height: effectiveHeight,
        seed,
        growToFit: true,
        bankFill: wordEntries.length === 0,
        cropToFit: false,
      });

      applyGenerationOutcome(skeleton);
    }, 150);
  }

  /**
   * Regenerate at a suggested larger grid size (offered when must-include
   * words fail). Width/height are passed explicitly — relying on patched
   * wizard state inside the setTimeout would read stale values.
   */
  function handleApplySuggestion(width: number, height: number) {
    const parsedSeed = parseInt(wizard.settings.seedText, 10);
    const seed = Number.isFinite(parsedSeed) ? parsedSeed : randomSeed();
    setIsGenerating(true);
    setPendingScrollToPuzzle(true);
    setActiveSkeleton(null);

    setTimeout(() => {
      // Accepting an explicit size turns auto-sizing off — otherwise the
      // recommendation would immediately override the suggested dimensions.
      patchWizard({ settings: { ...wizard.settings, width, height, autoGridSize: false, seedText: String(seed) } });

      const skeleton = createSkeletonFromEntries({
        entries: prioritizedEntries(),
        width,
        height,
        seed,
        growToFit: !wizard.settings.forceDimensions,
        bankFill: wizard.settings.forceDimensions || wordEntries.length === 0,
        cropToFit: false,
      });

      applyGenerationOutcome(skeleton);
    }, 150);
  }

  function handleSkeletonComplete(filledSlots: FilledSlotData[]) {
    if (!activeSkeleton) return;
    onPuzzleGenerated(skeletonToPuzzle(activeSkeleton, filledSlots), 'crossword');
    setActiveSkeleton(null);
    setGridKey(prev => prev + 1);
  }

  // --- Render ---

  // If skeleton is active, show the skeleton fill view full-width
  if (activeSkeleton) {
    return (
      <div className="animate-fade-in space-y-4" key={`skeleton-${gridKey}`}>
        <SkeletonFillView
          skeleton={activeSkeleton}
          onComplete={handleSkeletonComplete}
          onRegenerate={handleSkeletonRegenerate}
          onBack={() => setActiveSkeleton(null)}
          onApplySuggestion={handleApplySuggestion}
          onReleaseDimensions={
            wizard.settings.forceDimensions && wordEntries.length > 0
              ? handleReleaseDimensions
              : undefined
          }
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col lg:flex-row gap-6">

        {/* ============ LEFT PANEL — Controls ============ */}
        <div className="lg:w-[32rem] flex-shrink-0 space-y-4">

          {/* --- Mode toggle + header --- */}
          <div className="warm-card p-5">
            <h2 className="font-display text-lg font-semibold text-ink mb-1">
              {isCrossword ? 'Build a crossword' : 'Build a word search'}
            </h2>
            <p className="text-sm text-ink-2 mb-4">
              {isCrossword
                ? 'Add your words and generate — the grid sizes itself so everything fits.'
                : 'Enter your words, pick a grid size, and generate.'}
            </p>

            {/* Mode toggle */}
            <span className="flex items-center gap-1.5 text-xs font-medium text-ink-3 mb-1.5">
              Puzzle type
              <InfoTip label="Puzzle type">
                A crossword interlocks answers from clues. A word search hides whole words in a letter
                grid to find. Switching changes the whole builder.
              </InfoTip>
            </span>
            <div className="flex rounded-btn bg-well p-1" role="group" aria-label="Puzzle type">
              <button
                onClick={() => patchWizard({ settings: { ...wizard.settings, puzzleMode: 'crossword' } })}
                className={`flex-1 py-1.5 rounded-[5px] text-sm font-medium transition-all
                  ${isCrossword
                    ? 'bg-card text-ink shadow-sm'
                    : 'text-ink-2 hover:text-ink'}`}>
                Crossword
              </button>
              <button
                onClick={() => patchWizard({ settings: { ...wizard.settings, puzzleMode: 'wordsearch' } })}
                className={`flex-1 py-1.5 rounded-[5px] text-sm font-medium transition-all
                  ${!isCrossword
                    ? 'bg-card text-ink shadow-sm'
                    : 'text-ink-2 hover:text-ink'}`}>
                Word Search
              </button>
            </div>
          </div>

          {/* --- Your Words (the primary input — always visible) --- */}
          <div className="warm-card p-5">
            {/* Heading + controls share one line on sm+; on narrow phones the
                controls group wraps to its own line so the long-labelled
                starter-pack select never overflows the card (see min-w-0 below). */}
            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 mb-1">
              <h3 className="flex items-baseline gap-2 section-label">
                <span className="font-display text-base leading-none text-rubric" aria-hidden="true">1</span>
                Your Words
              </h3>
              <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
                {!showTextImport && hasMeaningfulRows(wizard.table.rows, wordRules) && (
                  <button
                    onClick={handleClearAll}
                    className="px-2 py-1.5 rounded-btn text-xs text-ink-2
                               hover:text-danger hover:bg-danger/10 transition-colors"
                  >
                    Clear all
                  </button>
                )}
                {/* Each option carries its own provenance tag (pack.source),
                    so AI-built and future hand-built packs read as distinct. */}
                <select
                  value=""
                  onChange={e => { if (e.target.value) handleLoadPack(e.target.value); }}
                  aria-label="Load a starter word pack"
                  className="min-w-0 max-w-full rounded-field border border-line-2 bg-card
                             px-2 py-1.5 text-xs text-ink-2
                             focus:outline-none focus:border-accent transition-colors"
                >
                  <option value="">Try a starter pack</option>
                  {WORD_PACKS.map(pack => (
                    <option key={pack.id} value={pack.id} title={pack.description}>
                      {pack.name} ({pack.entries.length} words) · {PACK_SOURCE_LABEL[pack.source]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {clearUndo && (
              <div className="mb-3 note flex items-center justify-between gap-2 animate-fade-in"
                   role="status">
                <span className="text-xs text-ink-2">
                  Cleared {clearUndo.count === 1 ? '1 word' : `${clearUndo.count} words`}.
                </span>
                <button
                  onClick={handleUndoClear}
                  className="text-xs font-semibold text-rubric hover:underline"
                >
                  Undo
                </button>
              </div>
            )}
            <p className="text-xs text-ink-2 mb-3">
              {isCrossword
                ? 'Every word you add is guaranteed a spot in the puzzle. You can also leave this empty and fill a blank skeleton yourself.'
                : 'All words will be hidden in your word search.'}
            </p>
            {showTextImport ? (
              <TextImportView
                rawText={wizard.textImport.rawText}
                existingRowCount={wizard.table.rows.length}
                wordRules={wordRules}
                onChange={rawText => patchWizard({ textImport: { rawText } })}
                onBack={() => setShowTextImport(false)}
                onImport={() => void handleTextImport()}
              />
            ) : (
              <EntryTableEditor
                table={wizard.table}
                wordRules={wordRules}
                onChangeRow={handleChangeRow}
                onAddRow={handleAddRow}
                onDeleteRow={handleDeleteRow}
                onKeepRow={handleKeepRow}
                showAiDistinction={isCrossword && wizard.settings.optimizedMode}
                onDismissWarnings={handleDismissWarnings}
                onOpenTextImport={() => setShowTextImport(true)}
                onImportFile={handleFileImport}
                isImportingFile={isImportingFile}
              />
            )}
            {!showTextImport && (
              <p className="mt-3 text-xs text-ink-3">
                No word list yet?{' '}
                <button
                  onClick={onGoToAiWords}
                  className="font-medium text-rubric hover:underline"
                >
                  Build one with AI &rarr;
                </button>
              </p>
            )}
          </div>

          {/* --- Grid Setup (auto-sized from words; customizable) --- */}
          <SettingsPanel
            value={wizard.settings}
            onChange={settings => patchWizard({ settings })}
            recommendation={gridRecommendation}
            effectiveSize={{ width: effectiveWidth, height: effectiveHeight }}
            wordCount={wordEntries.length}
          />

          {/* --- Generate button --- */}
          <button
            onClick={isCrossword ? handleGenerateSkeleton : handleGenerateWordSearch}
            disabled={isGenerating || (!isCrossword && wordEntries.length === 0)}
            className="btn-primary btn-lg w-full"
          >
            {isGenerating
              ? 'Setting the grid…'
              : isCrossword
                ? (wordEntries.length > 0 ? 'Generate puzzle' : 'Generate blank skeleton')
                : 'Generate word search'}
          </button>

          {/* Import decision dialog */}
          {pendingImport && (
            <ImportDecisionDialog
              payload={pendingImport}
              onReplace={() => applyImport(pendingImport, 'replace')}
              onAppend={() => applyImport(pendingImport, 'append')}
              onCancel={() => setPendingImport(null)}
            />
          )}
        </div>

        {/* ============ RIGHT PANEL — Result or live preview ============ */}
        <div className="flex-1 min-w-0">
          {/* Sentinel at the very top of the panel — present for the spinner
              AND the result, so the scroll-to-generation arrow can tell when
              either has scrolled out of view. scroll-mt clears the sticky
              masthead when we smooth-scroll here. */}
          <div ref={resultTopRef} aria-hidden="true" className="h-0 scroll-mt-24" />
          {puzzle ? (
            <div className="space-y-4 animate-fade-in" key={gridKey}>
              {/* Ready strip — names the result and offers the natural next steps */}
              <div className="warm-card px-5 py-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
                <div>
                  <h2 className="card-title">
                    Your {generatedMode === 'wordsearch' ? 'word search' : 'crossword'} is ready.
                  </h2>
                  <p className="text-meta text-ink-3 mt-0.5">
                    {puzzle.width}&times;{puzzle.height}
                    {' '}&middot; {puzzle.wordLocations.length} {puzzle.wordLocations.length === 1 ? 'word' : 'words'}
                    {puzzle.grewFrom && <> &middot; sized up from {puzzle.grewFrom.width}&times;{puzzle.grewFrom.height} so everything fits</>}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={onGoToPlay} className="btn-primary btn-sm">
                    Solve it
                  </button>
                  <button onClick={onGoToExport} className="btn-secondary btn-sm">
                    Print &amp; share
                  </button>
                </div>
              </div>

              {/* Words the engine had to leave out (forced sizes only) */}
              {puzzle.skippedWords && puzzle.skippedWords.length > 0 && (
                <div className="note note-warn">
                  <p className="text-xs text-ink-2">
                    <span className="font-medium text-warn">Couldn&rsquo;t fit:</span>{' '}
                    <span className="uppercase">{puzzle.skippedWords.join(', ')}</span>
                    {' '}&mdash; try a larger grid, or uncheck Force dimensions.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-3">
                {answersCallout && (
                  <span className="text-xs text-rubric animate-pulse" role="status">
                    Answers hidden — flip to peek
                  </span>
                )}
                <label
                  className={`flex items-center gap-2 cursor-pointer rounded-btn px-2 py-1 -my-1 transition-shadow
                    ${answersCallout ? 'ring-1 ring-rubric/40' : ''}`}
                  title={generatedMode === 'wordsearch'
                    ? 'Circle the hidden words, like the printed answer key'
                    : 'Fill the grid with the answer letters'}
                >
                  <input
                    type="checkbox"
                    checked={showAnswers}
                    onChange={e => {
                      setShowAnswers(e.target.checked);
                      if (answersCallout) {
                        setAnswersCallout(false);
                        markAnswersCalloutSeen();
                      }
                    }}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-ink-2">Show answers</span>
                </label>
              </div>
              {generatedMode === 'wordsearch' ? (
                // A word search always shows its letters — "answers" means
                // circling the hidden words, exactly like the printed key.
                <>
                  <div className="flex justify-center">
                    <WordSearchPreviewGrid puzzle={puzzle} showCircles={showAnswers} />
                  </div>
                  <WordBankPanel puzzle={puzzle} />
                </>
              ) : (
                <>
                  <div className="flex justify-center">
                    <CrosswordGrid puzzle={puzzle} showAnswers={showAnswers} />
                  </div>
                  <CluePanel puzzle={puzzle} />
                </>
              )}
            </div>
          ) : isGenerating ? (
            <GeneratingState isCrossword={isCrossword} />
          ) : isCrossword && wordEntries.length > 0 ? (
            <MiniGridPreview
              entries={wordEntries}
              width={effectiveWidth}
              height={effectiveHeight}
              seedText={wizard.settings.seedText}
              forceDimensions={wizard.settings.forceDimensions}
              cropToFit={autoActive}
            />
          ) : (
            <EmptyState isCrossword={isCrossword} />
          )}
        </div>
      </div>

      {pendingScrollToPuzzle && resultOffscreen !== null && (
        <ScrollToPuzzleArrow
          direction={resultOffscreen}
          mode={puzzle ? generatedMode : (isCrossword ? 'crossword' : 'wordsearch')}
          generating={isGenerating && !puzzle}
          onClick={scrollToResult}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ImportDecisionDialog({ payload, onReplace, onAppend, onCancel }: {
  payload: ImportedEntryRows; onReplace: () => void; onAppend: () => void; onCancel: () => void;
}) {
  return (
    <div className="warm-card p-5 border-accent/40 animate-slide-down" role="alertdialog" aria-label="Choose how to import">
      <h3 className="text-base font-semibold text-ink">You already have words in your list</h3>
      <p className="mt-1 text-sm text-ink-2">
        {payload.sourceSummary} — keep your current words alongside the new ones, or start over?
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={onAppend} className="btn-primary">Add to my list</button>
        <button onClick={onReplace} className="btn-secondary">Replace my list</button>
        <button onClick={onCancel} className="btn-ghost">Cancel</button>
      </div>
    </div>
  );
}

/**
 * A clean, themed arrow that floats in the open space and graceful-scrolls
 * the user to their result — so they never have to hunt for it. It appears
 * the moment a generation starts (when the result top is off-screen) and
 * retires once the user reaches it; it is armed by the Generate action, not
 * by scrolling, so scrolling back down to an existing puzzle won't re-summon
 * it. It points the way the result actually sits (up on desktop, where it
 * renders above the controls; down when the layout stacks on mobile).
 *
 * The arrow is a single accent disc that emits a few drifting "embers" in
 * its pointing direction — all on semantic tokens, so it re-themes for free
 * (oxblood in light, luminous ember in dark, stamped ink in sepia). The
 * particles are a desktop flourish (hidden on small screens for a lighter
 * touch) and every animation is disabled under prefers-reduced-motion.
 */
function ScrollToPuzzleArrow({
  direction, mode, generating, onClick,
}: { direction: 'above' | 'below'; mode: PuzzleMode; generating?: boolean; onClick: () => void }) {
  const up = direction === 'above';
  const particleAnim = up ? 'particleUp' : 'particleDown';
  const noun = mode === 'wordsearch' ? 'word search' : 'crossword';
  const label = generating
    ? `Scroll ${up ? 'up' : 'down'} to your puzzle being made`
    : `Scroll ${up ? 'up' : 'down'} to your puzzle`;
  const tip = generating ? `Jump to your ${noun} being made` : `Jump to your ${noun}`;
  // Three motes at slight x-offsets and staggered delays — an ember trail.
  const motes = [
    { x: '-7px', delay: '0s' },
    { x: '0px', delay: '0.7s' },
    { x: '7px', delay: '1.4s' },
  ];
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={tip}
      className="group fixed z-40 bottom-10 right-5 sm:right-8 print:hidden
                 grid place-items-center w-12 h-12 animate-slide-up"
    >
      {/* Ember trail — desktop flourish, off on small screens + reduced motion */}
      <span aria-hidden="true" className="hidden sm:block pointer-events-none absolute inset-0 motion-reduce:hidden">
        {motes.map((m, i) => (
          <span
            key={i}
            className="absolute left-1/2 top-1/2 w-1 h-1 rounded-full bg-accent"
            style={{ marginLeft: m.x, animation: `${particleAnim} 2.1s ease-out ${m.delay} infinite` }}
          />
        ))}
      </span>
      {/* The disc — accent fill, accent glow (ember in dark), gentle float */}
      <span
        className="relative grid place-items-center w-12 h-12 rounded-full bg-accent text-accent-ink
                   ring-1 ring-accent/40 animate-jump-float motion-reduce:animate-none
                   transition-transform duration-200 group-hover:scale-105 group-active:scale-95"
        style={{ boxShadow: '0 8px 22px -6px rgb(var(--accent) / 0.55)' }}
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor"
             strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          {up ? <path d="M17 14l-5-5-5 5" /> : <path d="M7 10l5 5 5-5" />}
        </svg>
      </span>
    </button>
  );
}

/**
 * Shown while a puzzle is being generated. Generation runs synchronously on
 * the main thread (after a short setTimeout so this paints first), so the
 * spinner uses a CSS transform animation — those run on the compositor
 * thread and keep turning even while the main thread is blocked composing
 * a dense grid. Most generations finish in well under a beat; the larger,
 * higher-quality searches (long 30+ word lists) can take ~half a second,
 * and this keeps the wait legible instead of a frozen panel.
 */
function GeneratingState({ isCrossword }: { isCrossword: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in" role="status" aria-live="polite">
      <div
        className="w-10 h-10 rounded-full border-2 border-line border-t-rubric animate-spin"
        aria-hidden="true"
      />
      <p className="font-display text-lg text-ink mt-5">
        {isCrossword ? 'Composing your crossword…' : 'Hiding your words…'}
      </p>
      <p className="text-xs text-ink-3 mt-1.5 max-w-xs leading-relaxed">
        Trying many layouts and keeping the tightest one.
      </p>
    </div>
  );
}

function EmptyState({ isCrossword }: { isCrossword: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
      {/* A scrap of printed puzzle, not an app icon: paper cells, ink
          letters, one blocked square, the center letter set in red ink. */}
      <div className="relative w-28 h-28 mb-8 -rotate-2">
        <svg viewBox="0 0 100 100" className="w-full h-full relative z-10 drop-shadow-md" fill="none">
          <rect x="5" y="5" width="90" height="90" rx="2" className="fill-grid-cell dark:fill-grid-cell-dark stroke-grid-ink" strokeWidth="2.5" />
          <line x1="35" y1="5" x2="35" y2="95" className="stroke-grid-ink/35" strokeWidth="1" />
          <line x1="65" y1="5" x2="65" y2="95" className="stroke-grid-ink/35" strokeWidth="1" />
          <line x1="5" y1="35" x2="95" y2="35" className="stroke-grid-ink/35" strokeWidth="1" />
          <line x1="5" y1="65" x2="95" y2="65" className="stroke-grid-ink/35" strokeWidth="1" />
          <rect x="66" y="66" width="28" height="28" className="fill-grid-ink" />
          <text x="8.5" y="14.5" className="fill-grid-ink/60" fontSize="7" fontWeight="600" fontFamily="Inter, sans-serif">1</text>
          <text x="38.5" y="14.5" className="fill-grid-ink/60" fontSize="7" fontWeight="600" fontFamily="Inter, sans-serif">2</text>
          <text x="50" y="26" textAnchor="middle" className="fill-grid-ink" fontSize="15" fontWeight="600" fontFamily="Inter, sans-serif">A</text>
          <text x="20" y="56" textAnchor="middle" className="fill-grid-ink" fontSize="15" fontWeight="600" fontFamily="Inter, sans-serif">C</text>
          <text x="50" y="56" textAnchor="middle" className="fill-rubric" fontSize="16" fontWeight="700" fontFamily="Inter, sans-serif">R</text>
          <text x="80" y="56" textAnchor="middle" className="fill-grid-ink" fontSize="15" fontWeight="600" fontFamily="Inter, sans-serif">O</text>
          <text x="50" y="86" textAnchor="middle" className="fill-grid-ink" fontSize="15" fontWeight="600" fontFamily="Inter, sans-serif">S</text>
        </svg>
      </div>

      <h2 className="view-title mb-2">
        {isCrossword ? 'Start with your words' : 'Enter words and generate'}
      </h2>
      <p className="text-sm text-ink-2 max-w-xs leading-relaxed">
        {isCrossword
          ? 'Add your vocabulary on the left — type it, paste it, or load a word pack. The grid sizes itself so every word fits; generate and your puzzle is ready.'
          : 'Add your words on the left, choose a grid size, and generate your word search.'}
      </p>
    </div>
  );
}
