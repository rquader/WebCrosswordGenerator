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
import type { CrosswordResult, WordCluePair } from '../../logic/types';

type InputMode = 'preset' | 'custom';

interface GenerateTabProps {
  puzzle: CrosswordResult | null;
  onPuzzleGenerated: (result: CrosswordResult) => void;
}

export function GenerateTab({ puzzle, onPuzzleGenerated }: GenerateTabProps) {
  const [showAnswers, setShowAnswers] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationInfo, setGenerationInfo] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<InputMode>('preset');
  const [customEntries, setCustomEntries] = useState<WordCluePair[]>([]);

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

      onPuzzleGenerated(result);
      setGenerationInfo(
        result.wordLocations.length + ' words placed | ' +
        settings.width + 'x' + settings.height + ' grid | seed: ' + settings.seed
      );
      setIsGenerating(false);
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
          <div className="flex rounded-lg bg-stone-100 dark:bg-stone-800 p-1">
            <button
              onClick={() => setInputMode('preset')}
              className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-all duration-150
                ${inputMode === 'preset'
                  ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-sm'
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
                }`}
            >
              Presets
            </button>
            <button
              onClick={() => setInputMode('custom')}
              className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-all duration-150
                ${inputMode === 'custom'
                  ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-sm'
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
                }`}
            >
              Custom
            </button>
          </div>

          {/* Settings panel (always shown — controls grid size, seed, generate) */}
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
            <div className="space-y-6 animate-fade-in">
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
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary-50 dark:bg-primary-950/30 flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-primary-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-stone-700 dark:text-stone-300 mb-1">
        Create a Crossword Puzzle
      </h2>
      <p className="text-sm text-stone-400 dark:text-stone-500 max-w-sm">
        Choose a category or upload your own words, set grid size, and hit Generate.
        Everything runs locally — no data leaves your device.
      </p>
    </div>
  );
}
