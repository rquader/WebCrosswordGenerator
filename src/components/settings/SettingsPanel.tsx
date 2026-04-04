/**
 * Settings panel for configuring puzzle generation.
 *
 * This component is controlled by the generation wizard and is
 * intentionally unaware of where the word list came from.
 */

import type { GenerationSettings } from './generationSettings';
import type { GridRecommendation } from '../../logic/types';

interface SettingsPanelProps {
  value: GenerationSettings;
  onChange: (settings: GenerationSettings) => void;
  /** Grid recommendation based on current must-include words. */
  recommendation?: GridRecommendation | null;
}

function randomSeed(): number {
  return Math.floor(Math.random() * 10000);
}

function Divider() {
  return <div className="h-px bg-stone-200 dark:bg-stone-700/50" />;
}

export function SettingsPanel({ value, onChange, recommendation }: SettingsPanelProps) {
  const seedCopied = false;

  function patch(next: Partial<GenerationSettings>) {
    onChange({ ...value, ...next });
  }

  function handleCopySeed() {
    if (value.seedText) {
      navigator.clipboard.writeText(value.seedText);
    }
  }

  function handleRandomize() {
    patch({ seedText: String(randomSeed()) });
  }

  function toggleDirection(key: 'diagonal' | 'reversed' | 'reversedDiagonal') {
    patch({
      wordSearchDirections: {
        ...value.wordSearchDirections,
        [key]: !value.wordSearchDirections[key],
        horizontal: true,
        vertical: true,
      },
    });
  }

  function applyQuickSize(width: number, height: number) {
    patch({ width, height });
  }

  return (
    <div className="warm-card p-5">
      <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100 mb-4 uppercase tracking-wider">
        Grid Setup
      </h2>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-2">
            Grid Size
          </label>

          {/* Grid recommendation badge */}
          {recommendation && recommendation.minDimension > 0 && (
            <div className="mb-3 flex items-start gap-2">
              <div className="flex-1 rounded-lg border border-primary-200 dark:border-primary-800/40 bg-primary-50/60 dark:bg-primary-950/20 px-3 py-2">
                <p className="text-xs font-medium text-primary-700 dark:text-primary-300">
                  Suggested: {recommendation.width}x{recommendation.height}
                </p>
                <p className="text-xs text-primary-600/80 dark:text-primary-400/70 mt-0.5">
                  {recommendation.reason}
                </p>
              </div>
              <button
                onClick={() => applyQuickSize(recommendation.width, recommendation.height)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-primary-600 text-white shadow-sm hover:bg-primary-700 transition-all btn-lift flex-shrink-0"
              >
                Apply
              </button>
            </div>
          )}

          {/* Outlier warnings */}
          {recommendation && recommendation.outliers.length > 0 && (
            <div className="mb-3 rounded-lg border border-amber-200 dark:border-amber-800/40 bg-amber-50/60 dark:bg-amber-950/20 px-3 py-2">
              {recommendation.outliers.map((outlier, i) => (
                <p key={i} className="text-xs text-amber-700 dark:text-amber-300">
                  <span className="font-medium uppercase">{outlier.word || `Word (${outlier.length} letters)`}</span>
                  {' '}is much longer than your other words (median {outlier.medianOtherLength} letters).
                  This needs a significantly larger grid.
                </p>
              ))}
            </div>
          )}

          {/* Min dimension warning */}
          {recommendation && recommendation.minDimension > 0 &&
           (value.width < recommendation.minDimension && value.height < recommendation.minDimension) && (
            <div className="mb-3 rounded-lg border border-red-200 dark:border-red-800/40 bg-red-50/60 dark:bg-red-950/20 px-3 py-2">
              <p className="text-xs text-red-700 dark:text-red-300">
                Your longest word ({recommendation.minDimension} letters) won't fit in a {value.width}x{value.height} grid.
                At least one dimension must be {recommendation.minDimension} or larger.
              </p>
            </div>
          )}

          {/* Quick size presets — dynamic if recommendation exists */}
          <div className="flex flex-wrap gap-2 mb-3">
            {getQuickSizePresets(recommendation).map(({ label, width, height }) => {
              const isActive = value.width === width && value.height === height;
              return (
                <button
                  key={label}
                  onClick={() => applyQuickSize(width, height)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-150
                    ${isActive
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'bg-stone-100 dark:bg-stone-800/60 text-stone-500 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700/60'
                    }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <SliderField label="Width" value={value.width} min={2} max={20} onChange={(next) => patch({ width: next })} />
            <SliderField label="Height" value={value.height} min={2} max={20} onChange={(next) => patch({ height: next })} />
          </div>
        </div>

        {value.puzzleMode === 'wordsearch' && (
          <>
            <Divider />

            <div className="space-y-2.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={value.wordSearchDirections.diagonal}
                  onChange={() => toggleDirection('diagonal')}
                  className="w-4 h-4 rounded border-stone-300 dark:border-stone-600 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-stone-600 dark:text-stone-400">Allow diagonals</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={value.wordSearchDirections.reversed}
                  onChange={() => toggleDirection('reversed')}
                  className="w-4 h-4 rounded border-stone-300 dark:border-stone-600 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-stone-600 dark:text-stone-400">Allow reversed words</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={value.wordSearchDirections.reversedDiagonal}
                  onChange={() => toggleDirection('reversedDiagonal')}
                  className="w-4 h-4 rounded border-stone-300 dark:border-stone-600 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-stone-600 dark:text-stone-400">Allow reversed diagonals</span>
              </label>
            </div>
          </>
        )}

        <Divider />

        <div>
          <label htmlFor="settings-seed" className="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1.5">
            Seed (optional)
          </label>
          <div className="flex gap-1.5">
            <input
              id="settings-seed"
              type="text"
              value={value.seedText}
              onChange={(e) => patch({ seedText: e.target.value })}
              placeholder="Random"
              className="flex-1 rounded-lg border border-stone-300 dark:border-stone-600
                         bg-white dark:bg-surface-dark-hover text-stone-900 dark:text-stone-100
                         px-3 py-2 text-sm font-mono placeholder:text-stone-400 dark:placeholder:text-stone-500
                         focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                         transition-shadow"
            />
            <button
              onClick={handleCopySeed}
              disabled={!value.seedText}
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

        {value.puzzleMode === 'crossword' && (
          <>
            <Divider />

            <label htmlFor="settings-allow-reverse" className="flex items-center gap-2 cursor-pointer">
              <input
                id="settings-allow-reverse"
                type="checkbox"
                checked={value.allowReverseWords}
                onChange={(e) => patch({ allowReverseWords: e.target.checked })}
                className="w-4 h-4 rounded border-stone-300 dark:border-stone-600
                           text-primary-600 focus:ring-primary-500 transition-colors"
              />
              <span className="text-sm text-stone-600 dark:text-stone-400">
                Allow reversed words
              </span>
            </label>
          </>
        )}
      </div>
    </div>
  );
}

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

/**
 * Build quick size preset buttons. If a recommendation exists, presets adapt
 * to be relative to it (compact / recommended / spacious). Otherwise, static defaults.
 */
function getQuickSizePresets(
  recommendation?: GridRecommendation | null
): { label: string; width: number; height: number }[] {
  if (!recommendation || recommendation.minDimension === 0) {
    return [
      { label: 'Small 5x5', width: 5, height: 5 },
      { label: 'Medium 8x8', width: 8, height: 8 },
      { label: 'Large 12x12', width: 12, height: 12 },
    ];
  }

  const rec = recommendation.width;
  const compact = Math.max(8, rec - 2);
  const spacious = Math.min(20, rec + 3);

  return [
    { label: `Compact ${compact}x${compact}`, width: compact, height: compact },
    { label: `Suggested ${rec}x${rec}`, width: rec, height: rec },
    { label: `Spacious ${spacious}x${spacious}`, width: spacious, height: spacious },
  ];
}
