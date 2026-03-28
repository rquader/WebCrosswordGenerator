/**
 * Generate tab — the main puzzle creation interface.
 *
 * Layout: settings panel on the left (with toggle between preset/custom),
 * crossword grid + clues on the right.
 * On mobile, settings stack above the grid.
 */

import { useState, useCallback } from 'react';
import { SettingsPanel } from '../settings/SettingsPanel';
import type { GenerationSettings } from '../settings/SettingsPanel';
import { CustomInputPanel } from '../input/CustomInputPanel';
import { CrosswordGrid } from '../grid/CrosswordGrid';
import { CluePanel } from '../clues/CluePanel';
import {
  createPuzzleFromPreset,
  createPuzzleFromCustom,
  createWordSearchFromPreset,
  createWordSearchFromCustom,
} from '../../logic/createPuzzle';
import type { CrosswordResult, WordCluePair, PuzzleMode } from '../../logic/types';

type InputMode = 'preset' | 'custom';

interface GenerateTabProps {
  puzzle: CrosswordResult | null;
  onPuzzleGenerated: (result: CrosswordResult, mode: PuzzleMode) => void;
}

export function GenerateTab({ puzzle, onPuzzleGenerated }: GenerateTabProps) {
  const [showAnswers, setShowAnswers] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationInfo, setGenerationInfo] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<InputMode>('preset');
  const [customEntries, setCustomEntries] = useState<WordCluePair[]>([]);
  const [gridKey, setGridKey] = useState(0);

  function handleGenerate(settings: GenerationSettings) {
    setIsGenerating(true);

    setTimeout(() => {
      let result: CrosswordResult;
      const isCustom = inputMode === 'custom' && customEntries.length > 0;
      const isWordSearch = settings.puzzleMode === 'wordsearch';
      const baseOptions = {
        width: settings.width,
        height: settings.height,
        seed: settings.seed,
        allowReverseWords: settings.allowReverseWords,
        wordSearchDirections: settings.wordSearchDirections,
      };

      if (isCustom && isWordSearch) {
        result = createWordSearchFromCustom({ ...baseOptions, entries: customEntries });
      } else if (isCustom) {
        result = createPuzzleFromCustom({ ...baseOptions, entries: customEntries });
      } else if (isWordSearch) {
        result = createWordSearchFromPreset({ ...baseOptions, categoryId: settings.categoryId });
      } else {
        result = createPuzzleFromPreset({ ...baseOptions, categoryId: settings.categoryId });
      }

      onPuzzleGenerated(result, settings.puzzleMode);
      setGenerationInfo(
        result.wordLocations.length + ' words placed | ' +
        settings.width + 'x' + settings.height + ' grid | seed: ' + settings.seed
      );
      setIsGenerating(false);
      setGridKey(prev => prev + 1);
    }, 10);
  }

  const handleCustomEntries = useCallback((entries: WordCluePair[]) => {
    setCustomEntries(entries);
  }, []);

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Settings + Input */}
        <div className="lg:w-80 flex-shrink-0 space-y-4">
          {/* Input mode toggle */}
          <div className="flex rounded-lg bg-stone-100 dark:bg-stone-800/60 p-1">
            <button
              onClick={() => setInputMode('preset')}
              className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-all duration-150
                ${inputMode === 'preset'
                  ? 'bg-white dark:bg-surface-dark-hover text-stone-900 dark:text-stone-100 shadow-sm'
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
                }`}
            >
              Presets
            </button>
            <button
              onClick={() => setInputMode('custom')}
              className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-all duration-150
                ${inputMode === 'custom'
                  ? 'bg-white dark:bg-surface-dark-hover text-stone-900 dark:text-stone-100 shadow-sm'
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
                }`}
            >
              Custom
            </button>
          </div>

          {/* Settings panel */}
          <SettingsPanel
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
            showCategoryPicker={inputMode === 'preset'}
            customEntryCount={inputMode === 'custom' ? customEntries.length : 0}
          />

          {/* Custom input panel (shown only in custom mode) */}
          {inputMode === 'custom' && (
            <CustomInputPanel onEntriesReady={handleCustomEntries} />
          )}
        </div>

        {/* Right: Grid + Clues */}
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

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
      {/* Animated floating crossword grid */}
      <div className="relative w-28 h-28 mb-8">
        {/* Soft glow behind */}
        <div className="absolute inset-0 rounded-2xl bg-primary-500/10 dark:bg-primary-400/5 blur-xl" />

        <svg viewBox="0 0 100 100" className="w-full h-full relative z-10" fill="none">
          {/* Row 1 */}
          <rect x="6" y="6" width="26" height="26" rx="3" className="fill-primary-50 dark:fill-primary-950/30 stroke-primary-300 dark:stroke-primary-700/60" strokeWidth="1" style={{ animationDelay: '0ms' }} />
          <rect x="37" y="6" width="26" height="26" rx="3" className="fill-grid-cell dark:fill-grid-cell-dark stroke-primary-400 dark:stroke-primary-600/50" strokeWidth="1.2" style={{ animationDelay: '50ms' }} />
          <rect x="68" y="6" width="26" height="26" rx="3" className="fill-primary-50 dark:fill-primary-950/30 stroke-primary-300 dark:stroke-primary-700/60" strokeWidth="1" style={{ animationDelay: '100ms' }} />
          {/* Row 2 */}
          <rect x="6" y="37" width="26" height="26" rx="3" className="fill-grid-cell dark:fill-grid-cell-dark stroke-primary-400 dark:stroke-primary-600/50" strokeWidth="1.2" style={{ animationDelay: '50ms' }} />
          <rect x="37" y="37" width="26" height="26" rx="3" className="fill-primary-100 dark:fill-primary-900/30 stroke-primary-500 dark:stroke-primary-500/60" strokeWidth="1.5" style={{ animationDelay: '100ms' }} />
          <rect x="68" y="37" width="26" height="26" rx="3" className="fill-grid-cell dark:fill-grid-cell-dark stroke-primary-400 dark:stroke-primary-600/50" strokeWidth="1.2" style={{ animationDelay: '150ms' }} />
          {/* Row 3 */}
          <rect x="6" y="68" width="26" height="26" rx="3" className="fill-primary-50 dark:fill-primary-950/30 stroke-primary-300 dark:stroke-primary-700/60" strokeWidth="1" style={{ animationDelay: '100ms' }} />
          <rect x="37" y="68" width="26" height="26" rx="3" className="fill-grid-cell dark:fill-grid-cell-dark stroke-primary-400 dark:stroke-primary-600/50" strokeWidth="1.2" style={{ animationDelay: '150ms' }} />
          <rect x="68" y="68" width="26" height="26" rx="3" className="fill-primary-50 dark:fill-primary-950/30 stroke-primary-300 dark:stroke-primary-700/60" strokeWidth="1" style={{ animationDelay: '200ms' }} />

          {/* Sample letters in center cells */}
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
        Pick a word pack or bring your own. Set your grid, hit generate, and start solving.
      </p>

      {/* Feature pills */}
      <div className="flex flex-wrap justify-center gap-2 mt-5">
        <FeaturePill label="Crosswords" />
        <FeaturePill label="Word Search" />
        <FeaturePill label="Custom Words" />
        <FeaturePill label="Print & Export" />
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
