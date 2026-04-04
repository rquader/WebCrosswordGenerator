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
import { recommendGridSize, detectOutlierWords } from '../../logic/gridRecommendation';
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
} from '../entries/entryTable';
import { EntryTableEditor } from '../entries/EntryTableEditor';
import { TextImportView } from '../entries/TextImportView';
import { SkeletonFillView, type FilledSlotData } from '../skeleton/SkeletonFillView';

interface GenerateTabProps {
  puzzle: CrosswordResult | null;
  onPuzzleGenerated: (result: CrosswordResult, mode: PuzzleMode) => void;
}

type ImportDecision = 'replace' | 'append';

function randomSeed(): number {
  return Math.floor(Math.random() * 10000);
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
  const [showStrictlyInclude, setShowStrictlyInclude] = useState(false);
  const [showTextImport, setShowTextImport] = useState(false);

  // Persist wizard state — but clear strictly-include rows when the checkbox
  // is off so they don't survive a page reload. They stay in React state
  // (so re-checking the box restores them within the same session).
  useEffect(() => {
    if (showStrictlyInclude || wizard.settings.puzzleMode === 'wordsearch') {
      // Save normally — rows are active
      saveWizardState(wizard);
    } else {
      // Strictly-include is unchecked in crossword mode — save with empty rows
      // so a reload starts clean, but keep rows in React state for this session
      saveWizardState({
        ...wizard,
        table: { rows: [createEmptyEntryRow()], warnings: [] },
      });
    }
  }, [wizard, showStrictlyInclude]);

  // --- Derived ---

  const strictlyIncludeEntries = useMemo(
    () => getGenerationEntriesFromRows(wizard.table.rows),
    [wizard.table.rows],
  );

  const gridRecommendation = useMemo(() => {
    if (wizard.settings.puzzleMode !== 'crossword' || strictlyIncludeEntries.length === 0) return null;
    const lengths = strictlyIncludeEntries.map(e => e.word.length);
    const rec = recommendGridSize(lengths);
    const outliers = detectOutlierWords(strictlyIncludeEntries.map(e => e.word));
    return { ...rec, outliers };
  }, [strictlyIncludeEntries, wizard.settings.puzzleMode]);

  const isCrossword = wizard.settings.puzzleMode === 'crossword';

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
    setShowStrictlyInclude(true); // Show the panel since they just imported words
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

  // --- Generation ---

  function handleGenerateSkeleton() {
    setIsGenerating(true);
    setTimeout(() => {
      const parsedSeed = parseInt(wizard.settings.seedText, 10);
      const seed = Number.isFinite(parsedSeed) ? parsedSeed : randomSeed();
      patchWizard({ settings: { ...wizard.settings, seedText: String(seed) } });

      // Build prioritized entries from strictly-include words (if any)
      const prioritized: PrioritizedEntry[] = strictlyIncludeEntries.map(e => ({
        word: e.word, clue: e.clue, priority: 'must' as const,
      }));

      const skeleton = createSkeletonFromEntries({
        entries: prioritized,
        width: wizard.settings.width,
        height: wizard.settings.height,
        seed,
        allowReverseWords: wizard.settings.allowReverseWords,
      });

      setActiveSkeleton(skeleton);
      setGenerationInfo(
        `${skeleton.slots.length} slots | ${skeleton.mustPlacedCount}/${skeleton.mustTotalCount} must-include | seed: ${seed}`
      );
      setGridKey(prev => prev + 1);
      setIsGenerating(false);
    }, 10);
  }

  function handleGenerateWordSearch() {
    if (strictlyIncludeEntries.length === 0) return;
    setIsGenerating(true);
    setTimeout(() => {
      const parsedSeed = parseInt(wizard.settings.seedText, 10);
      const seed = Number.isFinite(parsedSeed) ? parsedSeed : randomSeed();
      patchWizard({ settings: { ...wizard.settings, seedText: String(seed) } });

      const result = createWordSearchFromEntries({
        entries: strictlyIncludeEntries,
        width: wizard.settings.width,
        height: wizard.settings.height,
        seed,
        wordSearchDirections: wizard.settings.wordSearchDirections,
      });

      onPuzzleGenerated(result, 'wordsearch');
      setGenerationInfo(`${result.wordLocations.length} words placed | ${wizard.settings.width}x${wizard.settings.height} | seed: ${seed}`);
      setActiveSkeleton(null);
      setGridKey(prev => prev + 1);
      setIsGenerating(false);
    }, 10);
  }

  function handleSkeletonRegenerate() {
    patchWizard({ settings: { ...wizard.settings, seedText: String(randomSeed()) } });
    setActiveSkeleton(null);
    setTimeout(() => handleGenerateSkeleton(), 20);
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
            <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100 mb-1">
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

          {/* --- Grid Setup (with recommendation) --- */}
          <SettingsPanel
            value={wizard.settings}
            onChange={settings => patchWizard({ settings })}
            recommendation={gridRecommendation}
          />

          {/* --- Strictly Include Words (crossword only) --- */}
          {isCrossword && (
            <div className="warm-card p-5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showStrictlyInclude}
                  onChange={e => setShowStrictlyInclude(e.target.checked)}
                  className="w-4 h-4 rounded border-stone-300 dark:border-stone-600 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-stone-700 dark:text-stone-200">
                  Strictly include specific words
                </span>
              </label>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 ml-6">
                These words will be placed first in the skeleton. Remaining slots are for you to fill.
              </p>

              {showStrictlyInclude && (
                <div className="mt-4 border-t border-stone-200 dark:border-stone-700/50 pt-4">
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
              )}
            </div>
          )}

          {/* --- Word entry for word search (required, not optional) --- */}
          {!isCrossword && (
            <div className="warm-card p-5">
              <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 mb-1">
                Your Words
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mb-3">
                All words will be included in your word search.
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
          )}

          {/* --- Generate button --- */}
          <button
            onClick={isCrossword ? handleGenerateSkeleton : handleGenerateWordSearch}
            disabled={isGenerating || (!isCrossword && strictlyIncludeEntries.length === 0)}
            className="w-full px-4 py-3 rounded-xl text-sm font-semibold
                       bg-gradient-to-r from-primary-600 to-primary-700
                       hover:from-primary-700 hover:to-primary-800
                       text-white shadow-md btn-lift
                       disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isGenerating
              ? 'Generating...'
              : isCrossword
                ? 'Generate Skeleton'
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

        {/* ============ RIGHT PANEL — Result ============ */}
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

      <h2 className="text-xl font-bold text-stone-800 dark:text-stone-200 mb-2">
        {isCrossword ? 'Pick a grid size and generate' : 'Enter words and generate'}
      </h2>
      <p className="text-sm text-stone-500 dark:text-stone-400 max-w-xs leading-relaxed">
        {isCrossword
          ? 'Choose your grid dimensions on the left, then click Generate Skeleton. You\'ll see a visual grid with blank slots to fill with your own words.'
          : 'Add your words on the left, choose a grid size, and generate your word search.'}
      </p>
    </div>
  );
}
