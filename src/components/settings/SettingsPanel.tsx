/**
 * Settings panel for configuring puzzle generation.
 *
 * Contains:
 * - Puzzle mode toggle (crossword / word search)
 * - Grid width/height sliders (2-10)
 * - Category dropdown (all preset packs)
 * - Optional seed input for reproducible puzzles
 * - Word search direction settings (when in word search mode)
 * - Generate button
 */

import { useState, useEffect } from 'react';
import { presetCategories } from '../../logic/database';
import type { PuzzleMode, WordSearchDirectionSettings } from '../../logic/types';
import { DEFAULT_WORD_SEARCH_DIRECTIONS } from '../../logic/wordSearchGenerator';

const SETTINGS_STORAGE_KEY = 'crossword-settings';

export interface GenerationSettings {
  width: number;
  height: number;
  categoryId: string;
  seed: number;
  allowReverseWords: boolean;
  puzzleMode: PuzzleMode;
  wordSearchDirections: WordSearchDirectionSettings;
}

interface SettingsPanelProps {
  onGenerate: (settings: GenerationSettings) => void;
  isGenerating: boolean;
  showCategoryPicker?: boolean;
  customEntryCount?: number;
}

function randomSeed(): number {
  return Math.floor(Math.random() * 10000);
}

export function SettingsPanel({ onGenerate, isGenerating, showCategoryPicker = true, customEntryCount = 0 }: SettingsPanelProps) {
  // Load saved settings from localStorage
  const saved = loadSavedSettings();
  const [width, setWidth] = useState(saved.width);
  const [height, setHeight] = useState(saved.height);
  const [categoryId, setCategoryId] = useState(saved.categoryId);
  const [seedText, setSeedText] = useState('');
  const [allowReverse, setAllowReverse] = useState(saved.allowReverse);
  const [puzzleMode, setPuzzleMode] = useState<PuzzleMode>(saved.puzzleMode);
  const [seedCopied, setSeedCopied] = useState(false);
  const [wsDirections, setWsDirections] = useState<WordSearchDirectionSettings>({
    ...DEFAULT_WORD_SEARCH_DIRECTIONS,
    ...saved.wsDirections,
  });

  // Persist settings on change
  useEffect(() => {
    saveSettings({ width, height, categoryId, allowReverse, puzzleMode, wsDirections });
  }, [width, height, categoryId, allowReverse, puzzleMode, wsDirections]);

  function handleGenerate() {
    let seed: number;
    const parsed = parseInt(seedText, 10);
    if (!isNaN(parsed)) {
      seed = parsed;
    } else {
      seed = randomSeed();
      setSeedText(String(seed));
    }

    onGenerate({
      width,
      height,
      categoryId,
      seed,
      allowReverseWords: allowReverse,
      puzzleMode,
      wordSearchDirections: wsDirections,
    });
  }

  function handleRandomize() {
    const newSeed = randomSeed();
    setSeedText(String(newSeed));
  }

  function handleCopySeed() {
    if (seedText) {
      navigator.clipboard.writeText(seedText);
      setSeedCopied(true);
      setTimeout(() => setSeedCopied(false), 1500);
    }
  }

  function toggleDirection(key: keyof WordSearchDirectionSettings) {
    setWsDirections(prev => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="warm-card p-5">
      <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100 mb-4 uppercase tracking-wider">
        Settings
      </h2>

      <div className="space-y-5">
        {/* Puzzle Mode Toggle */}
        <div>
          <label id="puzzle-type-label" className="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1.5">
            Puzzle Type
          </label>
          <div className="flex rounded-lg bg-stone-100 dark:bg-stone-800/60 p-1" role="group" aria-labelledby="puzzle-type-label">
            <button
              onClick={() => setPuzzleMode('crossword')}
              aria-pressed={puzzleMode === 'crossword'}
              className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-all duration-150
                ${puzzleMode === 'crossword'
                  ? 'bg-white dark:bg-surface-dark-hover text-stone-900 dark:text-stone-100 shadow-sm'
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
                }`}
            >
              Crossword
            </button>
            <button
              onClick={() => setPuzzleMode('wordsearch')}
              aria-pressed={puzzleMode === 'wordsearch'}
              className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-all duration-150
                ${puzzleMode === 'wordsearch'
                  ? 'bg-white dark:bg-surface-dark-hover text-stone-900 dark:text-stone-100 shadow-sm'
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
                }`}
            >
              Word Search
            </button>
          </div>
        </div>

        {/* Grid Size */}
        <div className="grid grid-cols-2 gap-4">
          <SliderField label="Width" value={width} min={2} max={15} onChange={setWidth} />
          <SliderField label="Height" value={height} min={2} max={15} onChange={setHeight} />
        </div>

        {/* Category (only for preset mode) */}
        {showCategoryPicker ? (
          <div>
            <label htmlFor="settings-category" className="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1.5">
              Category
            </label>
            <select
              id="settings-category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-lg border border-stone-300 dark:border-stone-600
                         bg-white dark:bg-surface-dark-hover text-stone-900 dark:text-stone-100
                         px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500
                         focus:border-primary-500 transition-shadow"
            >
              {presetCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-stone-400 dark:text-stone-500">
              {presetCategories.find(c => c.id === categoryId)?.description}
            </p>
          </div>
        ) : (
          <div className="rounded-lg bg-stone-50 dark:bg-stone-800/40 p-3">
            <p className="text-sm text-stone-600 dark:text-stone-400">
              Using <span className="font-semibold text-primary-600 dark:text-primary-400">{customEntryCount}</span> custom word{customEntryCount !== 1 ? 's' : ''}
            </p>
            {customEntryCount === 0 && (
              <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">
                Add words below to generate
              </p>
            )}
          </div>
        )}

        {/* Word Search Direction Settings — same style as "Allow reversed words" */}
        {puzzleMode === 'wordsearch' && (
          <div className="space-y-2.5">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={wsDirections.horizontal} onChange={() => toggleDirection('horizontal')}
                className="w-4 h-4 rounded border-stone-300 dark:border-stone-600 text-primary-600 focus:ring-primary-500" />
              <span className="text-sm text-stone-600 dark:text-stone-400">Horizontal</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={wsDirections.vertical} onChange={() => toggleDirection('vertical')}
                className="w-4 h-4 rounded border-stone-300 dark:border-stone-600 text-primary-600 focus:ring-primary-500" />
              <span className="text-sm text-stone-600 dark:text-stone-400">Vertical</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={wsDirections.diagonal} onChange={() => toggleDirection('diagonal')}
                className="w-4 h-4 rounded border-stone-300 dark:border-stone-600 text-primary-600 focus:ring-primary-500" />
              <span className="text-sm text-stone-600 dark:text-stone-400">Allow diagonals</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={wsDirections.reversed} onChange={() => toggleDirection('reversed')}
                className="w-4 h-4 rounded border-stone-300 dark:border-stone-600 text-primary-600 focus:ring-primary-500" />
              <span className="text-sm text-stone-600 dark:text-stone-400">Allow reversed words</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={wsDirections.reversedDiagonal} onChange={() => toggleDirection('reversedDiagonal')}
                className="w-4 h-4 rounded border-stone-300 dark:border-stone-600 text-primary-600 focus:ring-primary-500" />
              <span className="text-sm text-stone-600 dark:text-stone-400">Allow reversed diagonals</span>
            </label>
          </div>
        )}

        {/* Seed */}
        <div>
          <label htmlFor="settings-seed" className="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1.5">
            Seed (optional)
          </label>
          <div className="flex gap-1.5">
            <input
              id="settings-seed"
              type="text"
              value={seedText}
              onChange={(e) => setSeedText(e.target.value)}
              placeholder="Random"
              className="flex-1 rounded-lg border border-stone-300 dark:border-stone-600
                         bg-white dark:bg-surface-dark-hover text-stone-900 dark:text-stone-100
                         px-3 py-2 text-sm font-mono placeholder:text-stone-400 dark:placeholder:text-stone-500
                         focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                         transition-shadow"
            />
            <button
              onClick={handleCopySeed}
              disabled={!seedText}
              className="px-2.5 py-2 rounded-lg border border-stone-300 dark:border-stone-600
                         text-stone-500 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-surface-dark-hover
                         disabled:opacity-30 disabled:cursor-not-allowed
                         text-sm transition-all btn-lift"
              title="Copy seed"
            >
              {seedCopied ? (
                <svg className="w-4 h-4 text-primary-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                </svg>
              )}
            </button>
            <button
              onClick={handleRandomize}
              className="px-2.5 py-2 rounded-lg border border-stone-300 dark:border-stone-600
                         text-stone-500 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-surface-dark-hover
                         text-sm transition-all btn-lift"
              title="Generate random seed"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
              </svg>
            </button>
          </div>
          <p className="mt-1 text-xs text-stone-400 dark:text-stone-500">
            Same seed + settings = same puzzle every time
          </p>
        </div>

        {/* Allow Reverse Words (crossword mode only) */}
        {puzzleMode === 'crossword' && (
          <label htmlFor="settings-allow-reverse" className="flex items-center gap-2 cursor-pointer">
            <input
              id="settings-allow-reverse"
              type="checkbox"
              checked={allowReverse}
              onChange={(e) => setAllowReverse(e.target.checked)}
              className="w-4 h-4 rounded border-stone-300 dark:border-stone-600
                         text-primary-600 focus:ring-primary-500 transition-colors"
            />
            <span className="text-sm text-stone-600 dark:text-stone-400">
              Allow reversed words
            </span>
          </label>
        )}

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full py-3 rounded-xl font-semibold text-sm
                     bg-gradient-to-r from-primary-600 to-primary-700
                     hover:from-primary-700 hover:to-primary-800
                     active:from-primary-800 active:to-primary-900
                     text-white shadow-md btn-lift
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-all duration-200
                     flex items-center justify-center gap-2"
        >
          {isGenerating ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Generating...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              Generate
            </>
          )}
        </button>
      </div>
    </div>
  );
}

/**
 * A labeled range slider with current value display.
 */
interface SliderFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

function SliderField({ label, value, min, max, onChange }: SliderFieldProps) {
  const sliderId = `settings-slider-${label.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label htmlFor={sliderId} className="text-sm font-medium text-stone-600 dark:text-stone-400">
          {label}
        </label>
        <span className="text-sm font-mono font-semibold text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/30 px-1.5 py-0.5 rounded">
          {value}
        </span>
      </div>
      <input
        id={sliderId}
        type="range"
        min={min}
        max={max}
        value={value}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer
                   bg-stone-200 dark:bg-stone-700
                   accent-primary-600"
      />
      <div className="flex justify-between text-xs text-stone-400 dark:text-stone-500 mt-0.5">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

// --- Settings persistence ---

interface SavedSettings {
  width: number;
  height: number;
  categoryId: string;
  allowReverse: boolean;
  puzzleMode: PuzzleMode;
  wsDirections?: WordSearchDirectionSettings;
}

function loadSavedSettings(): SavedSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return { width: 8, height: 8, categoryId: 'unit_1', allowReverse: true, puzzleMode: 'crossword' };
    const data = JSON.parse(raw) as Partial<SavedSettings>;
    return {
      width: data.width ?? 8,
      height: data.height ?? 8,
      categoryId: data.categoryId ?? 'unit_1',
      allowReverse: data.allowReverse ?? true,
      puzzleMode: data.puzzleMode ?? 'crossword',
      wsDirections: data.wsDirections,
    };
  } catch {
    return { width: 8, height: 8, categoryId: 'unit_1', allowReverse: true, puzzleMode: 'crossword' };
  }
}

function saveSettings(settings: SavedSettings) {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // silently fail
  }
}
