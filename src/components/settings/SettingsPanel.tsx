/**
 * Settings panel for configuring crossword generation.
 *
 * Contains:
 * - Grid width/height sliders (2-10, matching Java's range)
 * - Category dropdown (all preset packs)
 * - Optional seed input for reproducible puzzles
 * - Generate button
 */

import { useState } from 'react';
import { presetCategories } from '../../logic/database';

export type PuzzleMode = 'crossword' | 'wordsearch';

export interface GenerationSettings {
  width: number;
  height: number;
  categoryId: string;
  seed: number;
  allowReverseWords: boolean;
  puzzleMode: PuzzleMode;
}

interface SettingsPanelProps {
  onGenerate: (settings: GenerationSettings) => void;
  isGenerating: boolean;
  showCategoryPicker?: boolean;
  customEntryCount?: number;
}

/**
 * Generate a random seed value (0-9999).
 */
function randomSeed(): number {
  return Math.floor(Math.random() * 10000);
}

export function SettingsPanel({ onGenerate, isGenerating, showCategoryPicker = true, customEntryCount = 0 }: SettingsPanelProps) {
  const [width, setWidth] = useState(8);
  const [height, setHeight] = useState(8);
  const [categoryId, setCategoryId] = useState('unit_1');
  const [seedText, setSeedText] = useState('');
  const [allowReverse, setAllowReverse] = useState(true);
  const [puzzleMode, setPuzzleMode] = useState<PuzzleMode>('crossword');

  function handleGenerate() {
    // Parse seed: use the entered number, or generate a random one
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
    });
  }

  function handleRandomize() {
    const newSeed = randomSeed();
    setSeedText(String(newSeed));
  }

  return (
    <div className="bg-white dark:bg-surface-dark-alt rounded-xl border border-stone-200 dark:border-stone-700/50 p-5 shadow-card">
      <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100 mb-4 uppercase tracking-wider">
        Settings
      </h2>

      <div className="space-y-5">
        {/* Puzzle Mode Toggle */}
        <div>
          <label id="puzzle-type-label" className="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1.5">
            Puzzle Type
          </label>
          <div className="flex rounded-lg bg-stone-100 dark:bg-stone-800 p-1" role="group" aria-labelledby="puzzle-type-label">
            <button
              onClick={() => setPuzzleMode('crossword')}
              aria-pressed={puzzleMode === 'crossword'}
              className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-all duration-150
                ${puzzleMode === 'crossword'
                  ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-sm'
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
                  ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-sm'
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
                }`}
            >
              Word Search
            </button>
          </div>
        </div>

        {/* Grid Size */}
        <div className="grid grid-cols-2 gap-4">
          <SliderField
            label="Width"
            value={width}
            min={2}
            max={10}
            onChange={setWidth}
          />
          <SliderField
            label="Height"
            value={height}
            min={2}
            max={10}
            onChange={setHeight}
          />
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
                         bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100
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
          <div className="rounded-lg bg-stone-50 dark:bg-stone-800/50 p-3">
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

        {/* Seed */}
        <div>
          <label htmlFor="settings-seed" className="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1.5">
            Seed (optional)
          </label>
          <div className="flex gap-2">
            <input
              id="settings-seed"
              type="text"
              value={seedText}
              onChange={(e) => setSeedText(e.target.value)}
              placeholder="Random"
              className="flex-1 rounded-lg border border-stone-300 dark:border-stone-600
                         bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100
                         px-3 py-2 text-sm placeholder:text-stone-400 dark:placeholder:text-stone-500
                         focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                         transition-shadow"
            />
            <button
              onClick={handleRandomize}
              className="px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-600
                         text-stone-500 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-700
                         text-sm transition-colors"
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

        {/* Allow Reverse Words */}
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

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full py-2.5 rounded-lg font-medium text-sm
                     bg-primary-600 hover:bg-primary-700 active:bg-primary-800
                     text-white shadow-sm
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-all duration-150"
        >
          {isGenerating ? 'Generating...' : 'Generate Crossword'}
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
