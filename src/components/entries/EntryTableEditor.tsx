import { useRef } from 'react';
import { validateEntryTableRow, type EntryTableDraft, type EntryTableRow } from './entryTable';

interface EntryTableEditorProps {
  table: EntryTableDraft;
  onChangeRow: (rowId: string, field: 'word' | 'clue', value: string) => void;
  onAddRow: () => void;
  onDeleteRow: (rowId: string) => void;
  onDismissWarnings: () => void;
  onOpenTextImport: () => void;
  onImportFile: (files: FileList | null) => void;
  isImportingFile: boolean;
  /** If provided, shows a "Continue" button at the bottom. Omit to hide navigation. */
  onContinue?: () => void;
}

export function EntryTableEditor({
  table,
  onChangeRow,
  onAddRow,
  onDeleteRow,
  onDismissWarnings,
  onOpenTextImport,
  onImportFile,
  isImportingFile,
  onContinue,
}: EntryTableEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="warm-card p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-stone-900 dark:text-stone-100">
            Entry Table
          </h3>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            This table is the source of truth for generation. Imports fill it, but you can always edit rows here.
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2 self-end sm:self-auto sm:ml-auto">
          <button
            onClick={onOpenTextImport}
            className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-600 text-sm text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-surface-dark-hover transition-all btn-lift"
          >
            Paste Text
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-600 text-sm text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-surface-dark-hover transition-all btn-lift"
          >
            {isImportingFile ? 'Importing...' : 'Upload File'}
          </button>
          <button
            disabled
            className="px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 text-sm text-stone-400 dark:text-stone-500 cursor-not-allowed"
            title="Image import is planned for a future update"
          >
            Image Import
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.csv,.json"
            onChange={(e) => onImportFile(e.target.files)}
            className="hidden"
          />
        </div>
      </div>

      {table.warnings.length > 0 && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-950/20 p-4">
          <div className="flex items-center justify-between gap-3 mb-2">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              Import warnings
            </p>
            <button
              onClick={onDismissWarnings}
              className="text-xs text-amber-700 dark:text-amber-300 hover:underline"
            >
              Dismiss
            </button>
          </div>
          <ul className="text-xs text-amber-700 dark:text-amber-300 space-y-1 max-h-28 overflow-y-auto scrollbar-thin">
            {table.warnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="text-left text-xs uppercase tracking-wider text-stone-400 dark:text-stone-500 pb-2 pr-3">Word</th>
              <th className="text-left text-xs uppercase tracking-wider text-stone-400 dark:text-stone-500 pb-2 pr-3">Clue / Definition</th>
              <th className="text-right text-xs uppercase tracking-wider text-stone-400 dark:text-stone-500 pb-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row) => (
              <EntryTableRowEditor
                key={row.id}
                row={row}
                onChangeRow={onChangeRow}
                onDeleteRow={onDeleteRow}
              />
            ))}
          </tbody>
        </table>
      </div>

      <button
        onClick={onAddRow}
        className="px-3 py-2 rounded-xl border border-primary-300 dark:border-primary-700 text-sm text-primary-700 dark:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-950/20 transition-all btn-lift"
      >
        Add Row
      </button>

      {/* Navigation — only shown when used inside a wizard (onContinue provided). */}
      {onContinue && (
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onContinue}
            className="px-4 py-2 rounded-xl text-sm font-semibold
                       bg-gradient-to-r from-primary-600 to-primary-700
                       hover:from-primary-700 hover:to-primary-800
                       text-white shadow-md btn-lift"
          >
            Continue to settings
          </button>
        </div>
      )}
    </div>
  );
}

function EntryTableRowEditor({
  row,
  onChangeRow,
  onDeleteRow,
}: {
  row: EntryTableRow;
  onChangeRow: (rowId: string, field: 'word' | 'clue', value: string) => void;
  onDeleteRow: (rowId: string) => void;
}) {
  const validation = validateEntryTableRow(row);

  return (
    <tr className="align-top">
      <td className="pr-3 pb-3 w-48">
        <input
          value={row.word}
          onChange={(e) => onChangeRow(row.id, 'word', e.target.value)}
          placeholder="word"
          className="w-full rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 px-3 py-2 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        {validation.wordError && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{validation.wordError}</p>
        )}
      </td>
      <td className="pr-3 pb-3">
        <input
          value={row.clue}
          onChange={(e) => onChangeRow(row.id, 'clue', e.target.value)}
          placeholder="definition or clue"
          className="w-full rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 px-3 py-2 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        {validation.clueError && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{validation.clueError}</p>
        )}
      </td>
      <td className="pb-3 text-right">
        <button
          onClick={() => onDeleteRow(row.id)}
          className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-600 text-sm text-stone-500 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-surface-dark-hover transition-all btn-lift"
        >
          Delete
        </button>
      </td>
    </tr>
  );
}
