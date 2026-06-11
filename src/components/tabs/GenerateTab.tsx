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

import { useEffect, useMemo, useState } from 'react';
import { SettingsPanel } from '../settings/SettingsPanel';
import { CrosswordGrid } from '../grid/CrosswordGrid';
import { CluePanel } from '../clues/CluePanel';
import {
  createWordSearchFromEntries,
  createSkeletonFromEntries,
} from '../../logic/createPuzzle';
import type { CrosswordResult, PuzzleMode, SkeletonResult, PrioritizedEntry } from '../../logic/types';
import { recommendGridSize, recommendWordSearchGridSize, detectOutlierWords } from '../../logic/gridRecommendation';
import { WORD_PACKS, getWordPackById } from '../../presets/wordPacks';
import { parseFile, normalizeWordInput } from '../../utils/fileParser';
import { loadWizardState, saveWizardState } from '../sources/wizardState';
import { resolveFileUploadSource } from '../sources/fileUploadSource';
import { resolveTextEntrySource } from '../sources/textEntrySource';
import type { ImportedEntryRows } from '../sources/types';
import {
  createEmptyEntryRow,
  createEntryRowsFromEntries,
  getGenerationEntriesFromRows,
  hasMeaningfulRows,
  type EntryTableRow,
} from '../entries/entryTable';
import { EntryTableEditor } from '../entries/EntryTableEditor';
import { TextImportView } from '../entries/TextImportView';
import { SkeletonFillView, type FilledSlotData } from '../skeleton/SkeletonFillView';
import { MiniGridPreview } from '../grid/MiniGridPreview';

interface GenerateTabProps {
  puzzle: CrosswordResult | null;
  onPuzzleGenerated: (result: CrosswordResult, mode: PuzzleMode) => void;
}

type ImportDecision = 'replace' | 'append';

function randomSeed(): number {
  return Math.floor(Math.random() * 10000);
}

/** Status line shown above a generated skeleton. */
function skeletonInfo(skeleton: SkeletonResult, seed: number): string {
  return `${skeleton.width}x${skeleton.height} | ${skeleton.slots.length} slots | `
    + `${skeleton.mustPlacedCount}/${skeleton.mustTotalCount} must-include | seed: ${seed}`;
}

export function GenerateTab({ puzzle, onPuzzleGenerated }: GenerateTabProps) {
  // --- State ---
  const [showAnswers, setShowAnswers] = useState(true);
  const [generationInfo, setGenerationInfo] = useState<string | null>(null);
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

  const wordEntries = useMemo(
    () => getGenerationEntriesFromRows(wizard.table.rows),
    [wizard.table.rows],
  );

  const isCrossword = wizard.settings.puzzleMode === 'crossword';

  const gridRecommendation = useMemo(() => {
    if (wordEntries.length === 0) return null;
    const lengths = wordEntries.map(e => e.word.length);
    if (isCrossword) {
      const rec = recommendGridSize(lengths);
      return { ...rec, outliers: detectOutlierWords(wordEntries.map(e => e.word)) };
    }
    return { ...recommendWordSearchGridSize(lengths), outliers: [] };
  }, [wordEntries, isCrossword]);

  // Grid size actually used for generation: the recommendation while
  // auto-sizing is on, the manual sliders otherwise.
  const autoActive = wizard.settings.autoGridSize && gridRecommendation !== null;
  const effectiveWidth = autoActive ? gridRecommendation!.width : wizard.settings.width;
  const effectiveHeight = autoActive ? gridRecommendation!.height : wizard.settings.height;

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
      row.id !== rowId ? row : { ...row, [field]: field === 'word' ? normalizeWordInput(value) : value }
    ));
  }

  function handleAddRow() { updateTableRows(rows => [...rows, createEmptyEntryRow()]); }

  function handleDeleteRow(rowId: string) {
    updateTableRows(rows => {
      const next = rows.filter(r => r.id !== rowId);
      return next.length > 0 ? next : [createEmptyEntryRow()];
    });
  }

  function handleDismissWarnings() {
    setWizard(prev => ({ ...prev, table: { ...prev.table, warnings: [] } }));
  }

  function handleClearAll() {
    if (!hasMeaningfulRows(wizard.table.rows)) return;
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
    const imported = createEntryRowsFromEntries(payload.entries);
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
    if (hasMeaningfulRows(wizard.table.rows)) { setPendingImport(payload); return; }
    applyImport(payload, 'replace');
  }

  async function handleTextImport() {
    const payload = await resolveTextEntrySource(wizard.textImport);
    requestImport(payload);
  }

  async function handleFileImport(files: FileList | null) {
    if (!files || files.length === 0) return;
    setIsImportingFile(true);
    try {
      const parsed = await parseFile(files[0]);
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
      sourceSummary: `${pack.name} word pack (${pack.entries.length} words)`,
    });
  }

  // --- Generation ---

  function handleGenerateSkeleton() {
    setIsGenerating(true);
    setTimeout(() => {
      const parsedSeed = parseInt(wizard.settings.seedText, 10);
      const seed = Number.isFinite(parsedSeed) ? parsedSeed : randomSeed();
      patchWizard({ settings: { ...wizard.settings, seedText: String(seed) } });

      // Every word the teacher added is must-include — that's why they added it
      const prioritized: PrioritizedEntry[] = wordEntries.map(e => ({
        word: e.word, clue: e.clue, priority: 'must' as const,
      }));

      const skeleton = createSkeletonFromEntries({
        entries: prioritized,
        width: effectiveWidth,
        height: effectiveHeight,
        seed,
        growToFit: !wizard.settings.forceDimensions,
      });

      setActiveSkeleton(skeleton);
      setGenerationInfo(skeletonInfo(skeleton, seed));
      setGridKey(prev => prev + 1);
      setIsGenerating(false);
    }, 10);
  }

  function handleGenerateWordSearch() {
    if (wordEntries.length === 0) return;
    setIsGenerating(true);
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
      const skippedNote = result.skippedWords && result.skippedWords.length > 0
        ? ` | couldn't fit: ${result.skippedWords.join(', ')}`
        : '';
      const grewNote = result.grewFrom
        ? ` (sized up from ${result.grewFrom.width}x${result.grewFrom.height} so every word fits)`
        : '';
      setGenerationInfo(`${result.wordLocations.length} words placed${skippedNote} | ${result.width}x${result.height}${grewNote} | seed: ${seed}`);
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
    setActiveSkeleton(null);

    setTimeout(() => {
      patchWizard({ settings: { ...wizard.settings, seedText: String(newSeed) } });

      const prioritized: PrioritizedEntry[] = wordEntries.map(e => ({
        word: e.word, clue: e.clue, priority: 'must' as const,
      }));

      const skeleton = createSkeletonFromEntries({
        entries: prioritized,
        width: effectiveWidth,
        height: effectiveHeight,
        seed: newSeed,
        growToFit: !wizard.settings.forceDimensions,
      });

      setActiveSkeleton(skeleton);
      setGenerationInfo(skeletonInfo(skeleton, newSeed));
      setGridKey(prev => prev + 1);
      setIsGenerating(false);
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
    setActiveSkeleton(null);

    setTimeout(() => {
      // Accepting an explicit size turns auto-sizing off — otherwise the
      // recommendation would immediately override the suggested dimensions.
      patchWizard({ settings: { ...wizard.settings, width, height, autoGridSize: false, seedText: String(seed) } });

      const prioritized: PrioritizedEntry[] = wordEntries.map(e => ({
        word: e.word, clue: e.clue, priority: 'must' as const,
      }));

      const skeleton = createSkeletonFromEntries({
        entries: prioritized,
        width,
        height,
        seed,
        growToFit: !wizard.settings.forceDimensions,
      });

      setActiveSkeleton(skeleton);
      setGenerationInfo(skeletonInfo(skeleton, seed));
      setGridKey(prev => prev + 1);
      setIsGenerating(false);
    }, 150);
  }

  function handleSkeletonComplete(filledSlots: FilledSlotData[]) {
    if (!activeSkeleton) return;

    // Build a lookup of user-filled words by slot ID
    const fillMap = new Map<number, FilledSlotData>();
    for (const f of filledSlots) {
      fillMap.set(f.slotId, f);
    }

    // Merge: pre-filled slots (must-include) + user-filled slots
    const allWordLocations = activeSkeleton.slots
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
        };
      })
      .filter((loc): loc is NonNullable<typeof loc> => loc !== null);

    // Rebuild the grid with user-filled words written into it
    const grid = activeSkeleton.grid.map(row => [...row]);
    for (const slot of activeSkeleton.slots) {
      const fill = fillMap.get(slot.id);
      if (!fill) continue;
      for (let i = 0; i < fill.word.length; i++) {
        const x = slot.direction === 'across' ? slot.startX + i : slot.startX;
        const y = slot.direction === 'across' ? slot.startY : slot.startY + i;
        grid[y][x] = fill.word[i];
      }
    }

    const crosswordResult: CrosswordResult = {
      grid,
      wordLocations: allWordLocations,
      width: activeSkeleton.width,
      height: activeSkeleton.height,
    };
    onPuzzleGenerated(crosswordResult, 'crossword');
    setActiveSkeleton(null);
    setGridKey(prev => prev + 1);
  }

  // --- Render ---

  // If skeleton is active, show the skeleton fill view full-width
  if (activeSkeleton) {
    return (
      <div className="animate-fade-in space-y-4" key={`skeleton-${gridKey}`}>
        {generationInfo && (
          <span className="text-xs text-stone-400 dark:text-stone-500 font-mono">{generationInfo}</span>
        )}
        <SkeletonFillView
          skeleton={activeSkeleton}
          onComplete={handleSkeletonComplete}
          onRegenerate={handleSkeletonRegenerate}
          onBack={() => setActiveSkeleton(null)}
          onApplySuggestion={handleApplySuggestion}
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col lg:flex-row gap-6">

        {/* ============ LEFT PANEL — Controls ============ */}
        <div className="lg:w-[28rem] flex-shrink-0 space-y-4">

          {/* --- Mode toggle + header --- */}
          <div className="warm-card p-5">
            <h2 className="font-display text-lg font-semibold text-stone-900 dark:text-stone-100 mb-1">
              {isCrossword ? 'Build a Crossword' : 'Build a Word Search'}
            </h2>
            <p className="text-sm text-stone-500 dark:text-stone-400 mb-4">
              {isCrossword
                ? 'Pick a grid size, then generate a skeleton to fill with your words.'
                : 'Enter your words, pick a grid size, and generate.'}
            </p>

            {/* Mode toggle */}
            <div className="flex rounded-lg bg-stone-100 dark:bg-stone-800/60 p-1" role="group">
              <button
                onClick={() => patchWizard({ settings: { ...wizard.settings, puzzleMode: 'crossword' } })}
                className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-all
                  ${isCrossword
                    ? 'bg-white dark:bg-surface-dark-hover text-stone-900 dark:text-stone-100 shadow-sm'
                    : 'text-stone-500 dark:text-stone-400'}`}>
                Crossword
              </button>
              <button
                onClick={() => patchWizard({ settings: { ...wizard.settings, puzzleMode: 'wordsearch' } })}
                className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-all
                  ${!isCrossword
                    ? 'bg-white dark:bg-surface-dark-hover text-stone-900 dark:text-stone-100 shadow-sm'
                    : 'text-stone-500 dark:text-stone-400'}`}>
                Word Search
              </button>
            </div>
          </div>

          {/* --- Your Words (the primary input — always visible) --- */}
          <div className="warm-card p-5">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 uppercase tracking-wider">
                Your Words
              </h3>
              <div className="flex items-center gap-2">
                {!showTextImport && hasMeaningfulRows(wizard.table.rows) && (
                  <button
                    onClick={handleClearAll}
                    className="px-2 py-1.5 rounded-lg text-xs text-stone-500 dark:text-stone-400
                               hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30
                               transition-colors"
                  >
                    Clear all
                  </button>
                )}
                <select
                  value=""
                  onChange={e => { if (e.target.value) handleLoadPack(e.target.value); }}
                  aria-label="Load a built-in word pack"
                  className="rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-surface-dark-hover
                             px-2 py-1.5 text-xs text-stone-600 dark:text-stone-300
                             focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Load a word pack…</option>
                  {WORD_PACKS.map(pack => (
                    <option key={pack.id} value={pack.id}>
                      {pack.name} ({pack.entries.length})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {clearUndo && (
              <div className="mb-3 flex items-center justify-between gap-2 rounded-lg border border-stone-200 dark:border-stone-700
                              bg-stone-50 dark:bg-stone-800/60 px-3 py-2 animate-fade-in"
                   role="status">
                <span className="text-xs text-stone-600 dark:text-stone-300">
                  Cleared {clearUndo.count === 1 ? '1 word' : `${clearUndo.count} words`}.
                </span>
                <button
                  onClick={handleUndoClear}
                  className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline"
                >
                  Undo
                </button>
              </div>
            )}
            <p className="text-xs text-stone-500 dark:text-stone-400 mb-3">
              {isCrossword
                ? 'Every word you add is guaranteed a spot in the puzzle. You can also leave this empty and fill a blank skeleton yourself.'
                : 'All words will be hidden in your word search.'}
            </p>
            {showTextImport ? (
              <TextImportView
                rawText={wizard.textImport.rawText}
                existingRowCount={wizard.table.rows.length}
                onChange={rawText => patchWizard({ textImport: { rawText } })}
                onBack={() => setShowTextImport(false)}
                onImport={() => void handleTextImport()}
              />
            ) : (
              <EntryTableEditor
                table={wizard.table}
                onChangeRow={handleChangeRow}
                onAddRow={handleAddRow}
                onDeleteRow={handleDeleteRow}
                onDismissWarnings={handleDismissWarnings}
                onOpenTextImport={() => setShowTextImport(true)}
                onImportFile={handleFileImport}
                isImportingFile={isImportingFile}
              />
            )}
          </div>

          {/* --- Grid Setup (auto-sized from words; customizable) --- */}
          <SettingsPanel
            value={wizard.settings}
            onChange={settings => patchWizard({ settings })}
            recommendation={gridRecommendation}
            effectiveSize={{ width: effectiveWidth, height: effectiveHeight }}
          />

          {/* --- Generate button --- */}
          <button
            onClick={isCrossword ? handleGenerateSkeleton : handleGenerateWordSearch}
            disabled={isGenerating || (!isCrossword && wordEntries.length === 0)}
            className="w-full px-4 py-3 rounded-xl text-sm font-semibold
                       bg-gradient-to-r from-primary-600 to-primary-700
                       hover:from-primary-700 hover:to-primary-800
                       text-white shadow-md btn-lift
                       disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isGenerating
              ? 'Generating...'
              : isCrossword
                ? (wordEntries.length > 0 ? 'Generate Puzzle' : 'Generate Blank Skeleton')
                : 'Generate Word Search'}
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
          {puzzle ? (
            <div className="space-y-6 animate-fade-in" key={gridKey}>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={showAnswers} onChange={e => setShowAnswers(e.target.checked)}
                    className="w-4 h-4 rounded border-stone-300 dark:border-stone-600 text-primary-600 focus:ring-primary-500" />
                  <span className="text-sm text-stone-600 dark:text-stone-400">Show answers</span>
                </label>
                {generationInfo && (
                  <span className="text-xs text-stone-400 dark:text-stone-500 font-mono">{generationInfo}</span>
                )}
              </div>
              <div className="flex justify-center">
                <CrosswordGrid puzzle={puzzle} showAnswers={showAnswers} />
              </div>
              <CluePanel puzzle={puzzle} />
            </div>
          ) : isCrossword && wordEntries.length > 0 ? (
            <MiniGridPreview
              entries={wordEntries}
              width={effectiveWidth}
              height={effectiveHeight}
              seedText={wizard.settings.seedText}
              forceDimensions={wizard.settings.forceDimensions}
            />
          ) : (
            <EmptyState isCrossword={isCrossword} />
          )}
        </div>
      </div>
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
    <div className="warm-card p-5 border-primary-200 dark:border-primary-800/40">
      <h3 className="text-base font-semibold text-stone-900 dark:text-stone-100">Import existing data?</h3>
      <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
        {payload.sourceSummary}. Your table already has content.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={onReplace} className="px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-md btn-lift">Replace</button>
        <button onClick={onAppend} className="px-4 py-2 rounded-xl border border-stone-300 dark:border-stone-600 text-sm text-stone-600 dark:text-stone-300 btn-lift">Append</button>
        <button onClick={onCancel} className="px-4 py-2 rounded-xl border border-stone-300 dark:border-stone-600 text-sm text-stone-600 dark:text-stone-300 btn-lift">Cancel</button>
      </div>
    </div>
  );
}

function EmptyState({ isCrossword }: { isCrossword: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
      <div className="relative w-28 h-28 mb-8">
        <div className="absolute inset-0 rounded-2xl bg-primary-500/10 dark:bg-primary-400/5 blur-xl" />
        <svg viewBox="0 0 100 100" className="w-full h-full relative z-10" fill="none">
          <rect x="6" y="6" width="26" height="26" rx="3" className="fill-primary-50 dark:fill-primary-950/30 stroke-primary-300 dark:stroke-primary-700/60" strokeWidth="1" />
          <rect x="37" y="6" width="26" height="26" rx="3" className="fill-grid-cell dark:fill-grid-cell-dark stroke-primary-400 dark:stroke-primary-600/50" strokeWidth="1.2" />
          <rect x="68" y="6" width="26" height="26" rx="3" className="fill-primary-50 dark:fill-primary-950/30 stroke-primary-300 dark:stroke-primary-700/60" strokeWidth="1" />
          <rect x="6" y="37" width="26" height="26" rx="3" className="fill-grid-cell dark:fill-grid-cell-dark stroke-primary-400 dark:stroke-primary-600/50" strokeWidth="1.2" />
          <rect x="37" y="37" width="26" height="26" rx="3" className="fill-primary-100 dark:fill-primary-900/30 stroke-primary-500 dark:stroke-primary-500/60" strokeWidth="1.5" />
          <rect x="68" y="37" width="26" height="26" rx="3" className="fill-grid-cell dark:fill-grid-cell-dark stroke-primary-400 dark:stroke-primary-600/50" strokeWidth="1.2" />
          <rect x="6" y="68" width="26" height="26" rx="3" className="fill-primary-50 dark:fill-primary-950/30 stroke-primary-300 dark:stroke-primary-700/60" strokeWidth="1" />
          <rect x="37" y="68" width="26" height="26" rx="3" className="fill-grid-cell dark:fill-grid-cell-dark stroke-primary-400 dark:stroke-primary-600/50" strokeWidth="1.2" />
          <rect x="68" y="68" width="26" height="26" rx="3" className="fill-primary-50 dark:fill-primary-950/30 stroke-primary-300 dark:stroke-primary-700/60" strokeWidth="1" />
          <text x="50" y="24" textAnchor="middle" className="fill-primary-600 dark:fill-primary-400" fontSize="13" fontWeight="600" fontFamily="Inter, sans-serif">A</text>
          <text x="19" y="55" textAnchor="middle" className="fill-primary-600 dark:fill-primary-400" fontSize="13" fontWeight="600" fontFamily="Inter, sans-serif">C</text>
          <text x="50" y="55" textAnchor="middle" className="fill-primary-700 dark:fill-primary-300" fontSize="14" fontWeight="700" fontFamily="Inter, sans-serif">R</text>
          <text x="81" y="55" textAnchor="middle" className="fill-primary-600 dark:fill-primary-400" fontSize="13" fontWeight="600" fontFamily="Inter, sans-serif">O</text>
          <text x="50" y="86" textAnchor="middle" className="fill-primary-600 dark:fill-primary-400" fontSize="13" fontWeight="600" fontFamily="Inter, sans-serif">S</text>
        </svg>
      </div>

      <h2 className="font-display text-2xl font-semibold text-stone-800 dark:text-stone-200 mb-2">
        {isCrossword ? 'Start with your words' : 'Enter words and generate'}
      </h2>
      <p className="text-sm text-stone-500 dark:text-stone-400 max-w-xs leading-relaxed">
        {isCrossword
          ? 'Add your vocabulary on the left — type it, paste it, or load a word pack. The grid sizes itself to fit, and any remaining blanks are yours to fill with suggestions to help.'
          : 'Add your words on the left, choose a grid size, and generate your word search.'}
      </p>
    </div>
  );
}
