import { useRef } from 'react';
import { validateEntryTableRow, type EntryTableDraft, type EntryTableRow, type EntryValidationOptions } from './entryTable';

interface EntryTableEditorProps {
  table: EntryTableDraft;
  /** Language, two-word option, and clue policy — matches generation. */
  wordRules?: EntryValidationOptions;
  onChangeRow: (rowId: string, field: 'word' | 'clue', value: string) => void;
  onAddRow: () => void;
  onDeleteRow: (rowId: string) => void;
  /** Promote an AI-suggested row to a guaranteed (manual) word. */
  onKeepRow?: (rowId: string) => void;
  /** Show the AI-suggestion treatment (Keep + marker). Optimized crossword only. */
  showAiDistinction?: boolean;
  onDismissWarnings: () => void;
  onOpenTextImport: () => void;
  onImportFile: (files: FileList | null) => void;
  isImportingFile: boolean;
}

export function EntryTableEditor({
  table,
  wordRules,
  onChangeRow,
  onAddRow,
  onDeleteRow,
  onKeepRow,
  showAiDistinction,
  onDismissWarnings,
  onOpenTextImport,
  onImportFile,
  isImportingFile,
}: EntryTableEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button onClick={onOpenTextImport} className="btn-secondary btn-sm">
          Paste text
        </button>
        <button onClick={() => fileInputRef.current?.click()} className="btn-secondary btn-sm">
          {isImportingFile ? 'Importing…' : 'Upload file'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.csv,.json"
          onChange={(e) => onImportFile(e.target.files)}
          className="hidden"
        />
      </div>

      {table.warnings.length > 0 && (
        <div className="note note-warn">
          <div className="flex items-center justify-between gap-3 mb-1.5">
            <p className="text-meta font-medium text-warn">Import warnings</p>
            <button
              onClick={onDismissWarnings}
              className="text-meta text-ink-3 hover:text-ink transition-colors"
            >
              Dismiss
            </button>
          </div>
          <ul className="text-meta text-ink-2 space-y-1 max-h-28 overflow-y-auto scrollbar-thin">
            {table.warnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {showAiDistinction && table.rows.some((r) => r.source === 'ai') && (
        <p className="note text-xs">
          <span className="font-semibold text-rubric">AI suggestions</span> are a pool — your
          puzzle keeps the best that fit. Your own words are always included; press{' '}
          <span className="font-semibold">Keep</span> to guarantee an AI word too.
        </p>
      )}

      <div className="overflow-x-auto max-h-[45vh] overflow-y-auto scrollbar-thin">
        <table className="w-full border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="text-left sub-label pb-2 pr-3">Word</th>
              <th className="text-left sub-label pb-2 pr-3">Clue / Definition</th>
              <th className="pb-2">
                <span className="sr-only">Remove</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row) => (
              <EntryTableRowEditor
                key={row.id}
                row={row}
                wordRules={wordRules}
                onChangeRow={onChangeRow}
                onDeleteRow={onDeleteRow}
                onKeepRow={onKeepRow}
                showAiDistinction={showAiDistinction}
              />
            ))}
          </tbody>
        </table>
      </div>

      <button onClick={onAddRow} className="btn-secondary btn-sm">
        Add word
      </button>
    </div>
  );
}

function EntryTableRowEditor({
  row,
  wordRules,
  onChangeRow,
  onDeleteRow,
  onKeepRow,
  showAiDistinction,
}: {
  row: EntryTableRow;
  wordRules?: EntryValidationOptions;
  onChangeRow: (rowId: string, field: 'word' | 'clue', value: string) => void;
  onDeleteRow: (rowId: string) => void;
  onKeepRow?: (rowId: string) => void;
  showAiDistinction?: boolean;
}) {
  const validation = validateEntryTableRow(row, wordRules ?? {});
  const clueOptional = wordRules?.requireClue === false;
  const isAiSuggestion = !!showAiDistinction && row.source === 'ai';

  return (
    <tr className={`align-top ${isAiSuggestion ? 'bg-well/40' : ''}`}>
      <td className="pr-3 pb-3 w-48">
        <input
          value={row.word}
          onChange={(e) => onChangeRow(row.id, 'word', e.target.value)}
          placeholder="word"
          className="field"
        />
        {validation.wordError && (
          <p className="mt-1 text-xs text-danger">{validation.wordError}</p>
        )}
      </td>
      <td className="pr-2 pb-3">
        <input
          value={row.clue}
          onChange={(e) => onChangeRow(row.id, 'clue', e.target.value)}
          placeholder={clueOptional ? 'optional for word search' : 'definition or clue'}
          className="field"
        />
        {validation.clueError && (
          <p className="mt-1 text-xs text-danger">{validation.clueError}</p>
        )}
      </td>
      <td className="pb-3 pt-2 text-right whitespace-nowrap">
        {isAiSuggestion && (
          <>
            <span className="mr-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-3 align-middle">AI</span>
            {onKeepRow && (
              <button
                onClick={() => onKeepRow(row.id)}
                title="Keep — always include this word"
                className="mr-1 px-2 py-1 rounded-btn text-xs font-medium text-rubric hover:bg-well transition-colors align-middle"
              >
                Keep
              </button>
            )}
          </>
        )}
        <button
          onClick={() => onDeleteRow(row.id)}
          aria-label={row.word ? `Remove ${row.word}` : 'Remove row'}
          title="Remove"
          className="p-1.5 rounded-btn text-ink-3 hover:text-danger hover:bg-well transition-colors align-middle"
        >
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>
      </td>
    </tr>
  );
}
