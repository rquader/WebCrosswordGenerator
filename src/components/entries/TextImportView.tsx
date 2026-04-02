import { useMemo } from 'react';
import { parseTextInput } from '../../utils/fileParser';

interface TextImportViewProps {
  rawText: string;
  existingRowCount: number;
  onChange: (rawText: string) => void;
  onBack: () => void;
  onImport: () => void;
}

export function TextImportView({
  rawText,
  existingRowCount,
  onChange,
  onBack,
  onImport,
}: TextImportViewProps) {
  const preview = useMemo(() => parseTextInput(rawText), [rawText]);

  return (
    <div className="warm-card p-5 space-y-4">
      <div>
        <h3 className="text-base font-semibold text-stone-900 dark:text-stone-100">
          Paste text to import rows
        </h3>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Parsed entries will return to the main table for final editing before generation.
          {existingRowCount > 0 && ' If your table already has rows, you will choose whether to replace or append them.'}
        </p>
      </div>

      <textarea
        value={rawText}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`java: A programming language\narray - A collection of elements\nloop, Repeating code block`}
        rows={12}
        className="w-full rounded-xl border border-stone-300 dark:border-stone-600
                   bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100
                   px-3 py-3 text-sm font-mono
                   placeholder:text-stone-400 dark:placeholder:text-stone-500
                   focus:outline-none focus:ring-2 focus:ring-primary-500
                   resize-y transition-shadow"
      />

      <div className="flex flex-wrap gap-2 text-xs">
        <span className="px-2.5 py-1 rounded-full bg-primary-50 dark:bg-primary-950/30 text-primary-700 dark:text-primary-300">
          {preview.entries.length} valid
        </span>
        {preview.errors.length > 0 && (
          <span className="px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300">
            {preview.errors.length} warning{preview.errors.length === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {preview.errors.length > 0 && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-950/20 p-4">
          <ul className="text-xs text-amber-700 dark:text-amber-300 space-y-1 max-h-32 overflow-y-auto scrollbar-thin">
            {preview.errors.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl border border-stone-300 dark:border-stone-600 text-sm text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-surface-dark-hover transition-all btn-lift"
        >
          Back to Table
        </button>
        <button
          onClick={onImport}
          disabled={preview.entries.length === 0}
          className="px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-md btn-lift disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Import into Table
        </button>
      </div>
    </div>
  );
}
