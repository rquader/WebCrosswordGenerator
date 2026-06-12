import { useRef } from 'react';
import { validateEntryTableRow, type EntryTableDraft, type EntryTableRow, type EntryValidationOptions } from './entryTable';

interface EntryTableEditorProps {
  table: EntryTableDraft;
  /** Language, two-word option, and clue policy — matches generation. */
  wordRules?: EntryValidationOptions;
  onChangeRow: (rowId: string, field: 'word' | 'clue', value: string) => void;
  onAddRow: () => void;
  onDeleteRow: (rowId: string) => void;
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
}: {
  row: EntryTableRow;
  wordRules?: EntryValidationOptions;
  onChangeRow: (rowId: string, field: 'word' | 'clue', value: string) => void;
  onDeleteRow: (rowId: string) => void;
}) {
  const validation = validateEntryTableRow(row, wordRules ?? {});
  const clueOptional = wordRules?.requireClue === false;

  return (
    <tr className="align-top">
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
      <td className="pb-3 pt-2 text-right">
        <button
          onClick={() => onDeleteRow(row.id)}
          aria-label={row.word ? `Remove ${row.word}` : 'Remove row'}
          title="Remove"
          className="p-1.5 rounded-btn text-ink-3 hover:text-danger hover:bg-well transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>
      </td>
    </tr>
  );
}
