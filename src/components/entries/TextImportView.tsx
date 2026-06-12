import { useMemo } from 'react';
import { parseTextInput } from '../../utils/fileParser';
import type { WordRules } from '../../logic/language';

interface TextImportViewProps {
  rawText: string;
  existingRowCount: number;
  /** Puzzle language + two-word option, so the preview parses like the import will. */
  wordRules?: WordRules;
  onChange: (rawText: string) => void;
  onBack: () => void;
  onImport: () => void;
}

export function TextImportView({
  rawText,
  existingRowCount,
  wordRules,
  onChange,
  onBack,
  onImport,
}: TextImportViewProps) {
  const preview = useMemo(() => parseTextInput(rawText, wordRules ?? {}), [rawText, wordRules]);

  return (
    <div className="warm-card p-5 space-y-4">
      <div>
        <h3 className="text-base font-semibold text-ink">
          Paste text to import rows
        </h3>
        <p className="mt-1 text-sm text-ink-2">
          Parsed entries will return to the main table for final editing before generation.
          {existingRowCount > 0 && ' If your table already has rows, you will choose whether to replace or append them.'}
        </p>
      </div>

      <textarea
        value={rawText}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`java: A programming language\narray - A collection of elements\nloop, Repeating code block`}
        rows={12}
        className="field font-mono py-3 focus:outline-none resize-y"
      />

      <div className="flex flex-wrap gap-2 text-xs">
        <span className="px-2.5 py-1 rounded-btn bg-well border border-line text-ink-2">
          {preview.entries.length} valid
        </span>
        {preview.errors.length > 0 && (
          <span className="px-2.5 py-1 rounded-btn bg-well border border-line text-warn font-medium">
            {preview.errors.length} warning{preview.errors.length === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {preview.errors.length > 0 && (
        <div className="note note-warn">
          <ul className="text-meta text-ink-2 space-y-1 max-h-32 overflow-y-auto scrollbar-thin">
            {preview.errors.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 pt-2">
        <button onClick={onBack} className="btn-ghost">
          Back to table
        </button>
        <button
          onClick={onImport}
          disabled={preview.entries.length === 0}
          className="btn-primary"
        >
          Import into table
        </button>
      </div>
    </div>
  );
}
