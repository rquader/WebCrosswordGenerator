/**
 * Generate tab - the main puzzle creation interface.
 *
 * Flow:
 * 1. Edit entries in the primary table
 * 2. Optionally import text or files into that table
 * 3. Configure puzzle settings
 * 4. Review the current table state and generate
 */

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { SettingsPanel } from '../settings/SettingsPanel';
import { CrosswordGrid } from '../grid/CrosswordGrid';
import { CluePanel } from '../clues/CluePanel';
import { createPuzzleFromEntries, createWordSearchFromEntries } from '../../logic/createPuzzle';
import type { CrosswordResult, PuzzleMode } from '../../logic/types';
import { filterByLength } from '../../logic/databaseProcessor';
import { parseFile, normalizeWordInput } from '../../utils/fileParser';
import { loadWizardState, saveWizardState, type WizardStep } from '../sources/wizardState';
import { resolveFileUploadSource } from '../sources/fileUploadSource';
import { resolveTextEntrySource } from '../sources/textEntrySource';
import type { ImportedEntryRows } from '../sources/types';
import {
  countInvalidOrEmptyRows,
  createEmptyEntryRow,
  createEntryRowsFromEntries,
  getGenerationEntriesFromRows,
  hasMeaningfulRows,
} from '../entries/entryTable';
import { EntryTableEditor } from '../entries/EntryTableEditor';
import { TextImportView } from '../entries/TextImportView';

interface GenerateTabProps {
  puzzle: CrosswordResult | null;
  onPuzzleGenerated: (result: CrosswordResult, mode: PuzzleMode) => void;
}

type ImportDecision = 'replace' | 'append';

function randomSeed(): number {
  return Math.floor(Math.random() * 10000);
}

const NAV_STEPS: { id: Exclude<WizardStep, 'text-import'>; label: string }[] = [
  { id: 'table', label: 'Table' },
  { id: 'settings', label: 'Settings' },
  { id: 'review', label: 'Review' },
];

export function GenerateTab({ puzzle, onPuzzleGenerated }: GenerateTabProps) {
  const [showAnswers, setShowAnswers] = useState(true);
  const [generationInfo, setGenerationInfo] = useState<string | null>(null);
  const [gridKey, setGridKey] = useState(0);
  const [wizard, setWizard] = useState(() => loadWizardState());
  const [pendingImport, setPendingImport] = useState<ImportedEntryRows | null>(null);
  const [isImportingFile, setIsImportingFile] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    saveWizardState(wizard);
  }, [wizard]);

  const generationEntries = useMemo(() => {
    return getGenerationEntriesFromRows(wizard.table.rows);
  }, [wizard.table.rows]);

  const eligibleEntries = useMemo(() => {
    const maxDim = Math.max(wizard.settings.width, wizard.settings.height);
    return filterByLength(generationEntries, maxDim);
  }, [generationEntries, wizard.settings.width, wizard.settings.height]);

  const invalidRowCount = useMemo(() => {
    return countInvalidOrEmptyRows(wizard.table.rows);
  }, [wizard.table.rows]);

  const filteredOutCount = generationEntries.length - eligibleEntries.length;
  const canGenerate = !isGenerating && eligibleEntries.length > 0;

  function patchWizard(next: Partial<typeof wizard>) {
    setWizard((prev) => ({ ...prev, ...next }));
  }

  function goToStep(step: Exclude<WizardStep, 'text-import'>) {
    patchWizard({ currentStep: step });
  }

  function updateTableRows(updater: (rows: typeof wizard.table.rows) => typeof wizard.table.rows) {
    setWizard((prev) => ({
      ...prev,
      table: {
        ...prev.table,
        rows: updater(prev.table.rows),
      },
    }));
  }

  function handleChangeRow(rowId: string, field: 'word' | 'clue', value: string) {
    updateTableRows((rows) => rows.map((row) => {
      if (row.id !== rowId) return row;
      return {
        ...row,
        [field]: field === 'word' ? normalizeWordInput(value) : value,
      };
    }));
  }

  function handleAddRow() {
    updateTableRows((rows) => [...rows, createEmptyEntryRow()]);
  }

  function handleDeleteRow(rowId: string) {
    updateTableRows((rows) => {
      const nextRows = rows.filter((row) => row.id !== rowId);
      return nextRows.length > 0 ? nextRows : [createEmptyEntryRow()];
    });
  }

  function handleDismissWarnings() {
    setWizard((prev) => ({
      ...prev,
      table: {
        ...prev.table,
        warnings: [],
      },
    }));
  }

  /**
   * Imports do not bypass the table. They either replace or append rows,
   * then the user returns to the table for final edits.
   */
  function applyImport(payload: ImportedEntryRows, decision: ImportDecision) {
    const importedRows = createEntryRowsFromEntries(payload.entries);

    setWizard((prev) => {
      const nextRows = decision === 'append'
        ? [...prev.table.rows, ...importedRows]
        : (importedRows.length > 0 ? importedRows : [createEmptyEntryRow()]);

      return {
        ...prev,
        table: {
          rows: nextRows,
          warnings: payload.warnings,
        },
        textImport: {
          rawText: '',
        },
        currentStep: 'table',
      };
    });

    setPendingImport(null);
  }

  function requestImport(payload: ImportedEntryRows) {
    if (hasMeaningfulRows(wizard.table.rows)) {
      setPendingImport(payload);
      return;
    }
    applyImport(payload, 'replace');
  }

  async function handleTextImport() {
    const payload = await resolveTextEntrySource(wizard.textImport);
    requestImport(payload);
  }

  async function handleFileImport(files: FileList | null) {
    if (!files || files.length === 0) return;

    const file = files[0];
    setIsImportingFile(true);
    try {
      const parsed = await parseFile(file);
      const payload = await resolveFileUploadSource({
        fileName: file.name,
        entries: parsed.entries,
        warnings: parsed.errors,
      });
      requestImport(payload);
    } finally {
      setIsImportingFile(false);
    }
  }

  function handleGenerate() {
    if (eligibleEntries.length === 0) return;

    setIsGenerating(true);
    setTimeout(() => {
      const parsedSeed = parseInt(wizard.settings.seedText, 10);
      const seed = Number.isFinite(parsedSeed) ? parsedSeed : randomSeed();
      patchWizard({
        settings: {
          ...wizard.settings,
          seedText: String(seed),
        },
      });

      const result = wizard.settings.puzzleMode === 'wordsearch'
        ? createWordSearchFromEntries({
            entries: generationEntries,
            width: wizard.settings.width,
            height: wizard.settings.height,
            seed,
            wordSearchDirections: wizard.settings.wordSearchDirections,
          })
        : createPuzzleFromEntries({
            entries: generationEntries,
            width: wizard.settings.width,
            height: wizard.settings.height,
            seed,
            allowReverseWords: wizard.settings.allowReverseWords,
          });

      onPuzzleGenerated(result, wizard.settings.puzzleMode);
      setGenerationInfo(
        `${result.wordLocations.length} words placed | ${wizard.settings.width}x${wizard.settings.height} grid | seed: ${seed}`
      );
      setGridKey((prev) => prev + 1);
      setIsGenerating(false);
    }, 10);
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-[30rem] flex-shrink-0">
          <WizardShell currentStep={wizard.currentStep} onStepSelect={goToStep}>
            {wizard.currentStep === 'table' && (
              <EntryTableEditor
                table={wizard.table}
                onChangeRow={handleChangeRow}
                onAddRow={handleAddRow}
                onDeleteRow={handleDeleteRow}
                onDismissWarnings={handleDismissWarnings}
                onOpenTextImport={() => patchWizard({ currentStep: 'text-import' })}
                onImportFile={handleFileImport}
                isImportingFile={isImportingFile}
                onContinue={() => patchWizard({ currentStep: 'settings' })}
              />
            )}

            {wizard.currentStep === 'text-import' && (
              <TextImportView
                rawText={wizard.textImport.rawText}
                existingRowCount={wizard.table.rows.length}
                onChange={(rawText) => patchWizard({ textImport: { rawText } })}
                onBack={() => patchWizard({ currentStep: 'table' })}
                onImport={() => void handleTextImport()}
              />
            )}

            {wizard.currentStep === 'settings' && (
              <SettingsStep
                onBack={() => patchWizard({ currentStep: 'table' })}
                onNext={() => patchWizard({ currentStep: 'review' })}
              >
                <SettingsPanel
                  value={wizard.settings}
                  onChange={(settings) => patchWizard({ settings })}
                />
              </SettingsStep>
            )}

            {wizard.currentStep === 'review' && (
              <ReviewStep
                warningCount={wizard.table.warnings.length}
                totalRows={wizard.table.rows.length}
                validRowCount={generationEntries.length}
                invalidRowCount={invalidRowCount}
                eligibleCount={eligibleEntries.length}
                filteredOutCount={filteredOutCount}
                settings={wizard.settings}
                isGenerating={isGenerating}
                canGenerate={canGenerate}
                warnings={wizard.table.warnings}
                onBack={() => patchWizard({ currentStep: 'settings' })}
                onGenerate={handleGenerate}
              />
            )}
          </WizardShell>

          {pendingImport && (
            <ImportDecisionDialog
              payload={pendingImport}
              onReplace={() => applyImport(pendingImport, 'replace')}
              onAppend={() => applyImport(pendingImport, 'append')}
              onCancel={() => setPendingImport(null)}
            />
          )}
        </div>

        <div className="flex-1 min-w-0">
          {puzzle ? (
            <div className="space-y-6 animate-fade-in" key={gridKey}>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showAnswers}
                    onChange={(e) => setShowAnswers(e.target.checked)}
                    className="w-4 h-4 rounded border-stone-300 dark:border-stone-600
                               text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-stone-600 dark:text-stone-400">
                    Show answers
                  </span>
                </label>
                {generationInfo && (
                  <span className="text-xs text-stone-400 dark:text-stone-500 font-mono">
                    {generationInfo}
                  </span>
                )}
              </div>

              <div className="flex justify-center">
                <CrosswordGrid puzzle={puzzle} showAnswers={showAnswers} />
              </div>

              <CluePanel puzzle={puzzle} />
            </div>
          ) : (
            <EmptyState />
          )}
        </div>
      </div>
    </div>
  );
}

function WizardShell({
  currentStep,
  onStepSelect,
  children,
}: {
  currentStep: WizardStep;
  onStepSelect: (step: Exclude<WizardStep, 'text-import'>) => void;
  children: ReactNode;
}) {
  const normalizedStep = currentStep === 'text-import' ? 'table' : currentStep;
  const currentIndex = NAV_STEPS.findIndex((step) => step.id === normalizedStep);

  return (
    <div className="space-y-4">
      <div className="warm-card p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">
              Build a puzzle from your own words
            </h2>
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
              Edit entries in the main table, then tune settings and review before generating.
            </p>
          </div>
          {currentStep === 'text-import' && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-primary-50 dark:bg-primary-950/30 text-primary-700 dark:text-primary-300">
              Paste Text
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {NAV_STEPS.map((step, index) => {
            const isActive = step.id === normalizedStep;
            const isComplete = index < currentIndex;
            return (
              <button
                key={step.id}
                onClick={() => onStepSelect(step.id)}
                className={`rounded-xl border px-3 py-2 text-left transition-all
                  ${isActive
                    ? 'border-primary-400 bg-primary-50 dark:bg-primary-950/30'
                    : isComplete
                      ? 'border-stone-300 dark:border-stone-700 bg-white dark:bg-surface-dark-alt'
                      : 'border-stone-200 dark:border-stone-700/60 bg-stone-50/70 dark:bg-stone-900/20'
                  }`}
              >
                <span className="block text-[11px] uppercase tracking-wider text-stone-400 dark:text-stone-500">
                  Step {index + 1}
                </span>
                <span className="block text-sm font-medium text-stone-700 dark:text-stone-200">
                  {step.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {children}
    </div>
  );
}

function SettingsStep({
  children,
  onBack,
  onNext,
}: {
  children: ReactNode;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-4">
      {children}
      <WizardNav onBack={onBack} onNext={onNext} nextLabel="Continue to review" />
    </div>
  );
}

function ReviewStep({
  warningCount,
  totalRows,
  validRowCount,
  invalidRowCount,
  eligibleCount,
  filteredOutCount,
  settings,
  isGenerating,
  canGenerate,
  warnings,
  onBack,
  onGenerate,
}: {
  warningCount: number;
  totalRows: number;
  validRowCount: number;
  invalidRowCount: number;
  eligibleCount: number;
  filteredOutCount: number;
  settings: {
    width: number;
    height: number;
    puzzleMode: PuzzleMode;
  };
  isGenerating: boolean;
  canGenerate: boolean;
  warnings: string[];
  onBack: () => void;
  onGenerate: () => void;
}) {
  return (
    <div className="warm-card p-5 space-y-4">
      <div>
        <h3 className="text-base font-semibold text-stone-900 dark:text-stone-100">
          Review before generation
        </h3>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Review counts from the current table. Manual edits here are what the generator will use.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ReviewCard label="Puzzle type" value={settings.puzzleMode === 'wordsearch' ? 'Word Search' : 'Crossword'} />
        <ReviewCard label="Table rows" value={String(totalRows)} />
        <ReviewCard label="Valid rows" value={String(validRowCount)} />
        <ReviewCard label="Invalid / empty rows" value={String(invalidRowCount)} />
        <ReviewCard label="Eligible for grid" value={String(eligibleCount)} />
        <ReviewCard label="Import warnings" value={String(warningCount)} />
      </div>

      <div className="rounded-xl border border-stone-200 dark:border-stone-700/60 bg-stone-50/70 dark:bg-stone-900/20 p-4 space-y-2">
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Grid size: {settings.width}x{settings.height}
        </p>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          {filteredOutCount > 0
            ? `${filteredOutCount} valid entr${filteredOutCount === 1 ? 'y is' : 'ies are'} too long for the current grid.`
            : 'All valid rows fit within the current grid dimensions.'}
        </p>
      </div>

      {warnings.length > 0 && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-950/20 p-4">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-2">
            Import warnings
          </p>
          <ul className="text-xs text-amber-700 dark:text-amber-300 space-y-1 max-h-32 overflow-y-auto scrollbar-thin">
            {warnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {eligibleCount === 0 && (
        <div className="rounded-xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-950/20 p-4 text-sm text-red-700 dark:text-red-300">
          No valid entries fit the current grid. Update the table or increase the grid size before generating.
        </div>
      )}

      <WizardNav
        onBack={onBack}
        onNext={onGenerate}
        nextLabel={isGenerating ? 'Generating...' : 'Generate puzzle'}
        nextDisabled={!canGenerate}
      />
    </div>
  );
}

function ImportDecisionDialog({
  payload,
  onReplace,
  onAppend,
  onCancel,
}: {
  payload: ImportedEntryRows;
  onReplace: () => void;
  onAppend: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="mt-4 warm-card p-5 border-primary-200 dark:border-primary-800/40">
      <h3 className="text-base font-semibold text-stone-900 dark:text-stone-100">
        Import existing data?
      </h3>
      <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
        {payload.sourceSummary}. Your table already has content, so choose whether to replace it or append the imported rows.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={onReplace}
          className="px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-md btn-lift"
        >
          Replace
        </button>
        <button
          onClick={onAppend}
          className="px-4 py-2 rounded-xl border border-stone-300 dark:border-stone-600 text-sm text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-surface-dark-hover transition-all btn-lift"
        >
          Append
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-xl border border-stone-300 dark:border-stone-600 text-sm text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-surface-dark-hover transition-all btn-lift"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function ReviewCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-stone-200 dark:border-stone-700/60 bg-white/80 dark:bg-surface-dark-alt px-4 py-3">
      <p className="text-xs uppercase tracking-wider text-stone-400 dark:text-stone-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-stone-800 dark:text-stone-100">
        {value}
      </p>
    </div>
  );
}

function WizardNav({
  onBack,
  onNext,
  nextLabel = 'Continue',
  nextDisabled = false,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 pt-2">
      <button
        onClick={onBack}
        disabled={!onBack}
        className="px-4 py-2 rounded-xl border border-stone-300 dark:border-stone-600
                   text-sm text-stone-600 dark:text-stone-400
                   hover:bg-stone-50 dark:hover:bg-surface-dark-hover
                   disabled:opacity-30 disabled:cursor-not-allowed transition-all btn-lift"
      >
        Back
      </button>

      <button
        onClick={onNext}
        disabled={nextDisabled}
        className="px-4 py-2 rounded-xl text-sm font-semibold
                   bg-gradient-to-r from-primary-600 to-primary-700
                   hover:from-primary-700 hover:to-primary-800
                   text-white shadow-md btn-lift disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {nextLabel}
      </button>
    </div>
  );
}

function EmptyState() {
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
        Ready to create
      </h2>
      <p className="text-sm text-stone-500 dark:text-stone-400 max-w-xs leading-relaxed">
        Build your word list in the table, import from text or files, and generate a puzzle entirely in your browser.
      </p>

      <div className="flex flex-wrap justify-center gap-2 mt-5">
        <FeaturePill label="Entry Table" />
        <FeaturePill label="Paste Text" />
        <FeaturePill label="Upload File" />
        <FeaturePill label="Word Search" />
      </div>
    </div>
  );
}

function FeaturePill({ label }: { label: string }) {
  return (
    <span className="text-xs px-2.5 py-1 rounded-full bg-stone-100 dark:bg-stone-800/50 text-stone-500 dark:text-stone-400 border border-stone-200/50 dark:border-stone-700/30">
      {label}
    </span>
  );
}
