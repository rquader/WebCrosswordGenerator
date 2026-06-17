import { useRef } from 'react';
import { InfoTip } from '../ui/InfoTip';
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
  /** Show the AI-suggestion treatment (Keep + pool section). Optimized crossword only. */
  showAiDistinction?: boolean;
  /**
   * Target word count for the puzzle (Optimized mode). When provided, the
   * "Your words" header shows how many guaranteed words fill the target —
   * e.g. "7 of 11 in your puzzle". Display only.
   */
  targetCount?: number;
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
  targetCount,
  onDismissWarnings,
  onOpenTextImport,
  onImportFile,
  isImportingFile,
}: EntryTableEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Two anchored groups appear only in the AI-distinction case AND only once
  // the AI has actually contributed words. Otherwise the list is a single
  // plain table — the manual / word-search flow stays exactly as before.
  const aiRows = table.rows.filter((r) => r.source === 'ai');
  const showGroups = !!showAiDistinction && aiRows.length > 0;
  const manualRows = showGroups ? table.rows.filter((r) => r.source !== 'ai') : table.rows;

  // How many guaranteed words are real (valid) — the number that will be in
  // the puzzle. Counts only non-empty, valid rows so a trailing blank row
  // never inflates the tally.
  const keptCount = manualRows.filter((r) => validateEntryTableRow(r, wordRules ?? {}).isValid).length;

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

      {showGroups ? (
        <div className="space-y-4">
          {/* ── Your words — anchored, permanent (always in the puzzle) ── */}
          <section className="rounded-card border border-line bg-well px-3.5 py-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 mb-0.5">
              <h4 className="section-label">Your words</h4>
              <span className="text-meta text-ink-3">
                {targetCount && targetCount > keptCount
                  ? <><span className="font-semibold text-ink-2">{keptCount}</span> of {targetCount} in your puzzle</>
                  : <><span className="font-semibold text-ink-2">{keptCount}</span> {keptCount === 1 ? 'word' : 'words'} in your puzzle</>}
              </span>
            </div>
            <p className="text-meta text-ink-3 mb-2.5">
              {keptCount === 0
                ? 'Type a word below, or keep an AI suggestion to lock it in.'
                : 'Always in your puzzle.'}
            </p>
            <EntryRowsTable
              rows={manualRows}
              wordRules={wordRules}
              onChangeRow={onChangeRow}
              onDeleteRow={onDeleteRow}
            />
            <button onClick={onAddRow} className="btn-secondary btn-sm mt-3">
              Add word
            </button>
          </section>

          {/* ── AI suggestions — a separate pool the user pulls from ── */}
          <section className="rounded-card border border-dashed border-line-2 px-3.5 py-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 mb-0.5">
              <h4 className="section-label flex items-center gap-1.5">
                AI suggestions
                <InfoTip label="AI suggestions">
                  A pool of candidate words. Your puzzle automatically keeps the best ones that fit;
                  press Keep on any word to guarantee it a spot.
                </InfoTip>
              </h4>
              <span className="text-meta text-ink-3">
                <span className="font-semibold text-ink-2">{aiRows.length}</span> in the pool
              </span>
            </div>
            <p className="text-meta text-ink-3 mb-2.5">
              Your puzzle keeps the best that fit. Press{' '}
              <span className="font-semibold text-rubric">Keep</span> to lock one in.
            </p>
            <EntryRowsTable
              rows={aiRows}
              wordRules={wordRules}
              onChangeRow={onChangeRow}
              onDeleteRow={onDeleteRow}
              onKeepRow={onKeepRow}
              isPool
            />
          </section>
        </div>
      ) : (
        <>
          <EntryRowsTable
            rows={manualRows}
            wordRules={wordRules}
            onChangeRow={onChangeRow}
            onDeleteRow={onDeleteRow}
          />
          <button onClick={onAddRow} className="btn-secondary btn-sm">
            Add word
          </button>
        </>
      )}
    </div>
  );
}

/**
 * The editable word/clue table. Shared by the plain (single-list) layout and
 * by each grouped section. In a pool section (`isPool`) every row shows a
 * deliberate Keep button that promotes it into "Your words".
 */
function EntryRowsTable({
  rows,
  wordRules,
  onChangeRow,
  onDeleteRow,
  onKeepRow,
  isPool,
}: {
  rows: EntryTableRow[];
  wordRules?: EntryValidationOptions;
  onChangeRow: (rowId: string, field: 'word' | 'clue', value: string) => void;
  onDeleteRow: (rowId: string) => void;
  onKeepRow?: (rowId: string) => void;
  isPool?: boolean;
}) {
  return (
    <div className="overflow-x-auto max-h-[45vh] overflow-y-auto scrollbar-thin">
      <table className="w-full border-separate border-spacing-0">
        <thead>
          <tr>
            <th className="text-left sub-label pb-2 pr-3">Word</th>
            <th className="text-left sub-label pb-2 pr-3">Clue / Definition</th>
            <th className="pb-2">
              <span className="sr-only">{isPool ? 'Keep or remove' : 'Remove'}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <EntryTableRowEditor
              key={row.id}
              row={row}
              wordRules={wordRules}
              onChangeRow={onChangeRow}
              onDeleteRow={onDeleteRow}
              onKeepRow={onKeepRow}
              isPool={isPool}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EntryTableRowEditor({
  row,
  wordRules,
  onChangeRow,
  onDeleteRow,
  onKeepRow,
  isPool,
}: {
  row: EntryTableRow;
  wordRules?: EntryValidationOptions;
  onChangeRow: (rowId: string, field: 'word' | 'clue', value: string) => void;
  onDeleteRow: (rowId: string) => void;
  onKeepRow?: (rowId: string) => void;
  isPool?: boolean;
}) {
  const validation = validateEntryTableRow(row, wordRules ?? {});
  const clueOptional = wordRules?.requireClue === false;

  return (
    <tr className="align-top animate-fade-in">
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
        {isPool && onKeepRow && (
          <button
            onClick={() => onKeepRow(row.id)}
            title="Keep — move into your words, always included"
            className="btn-secondary btn-sm mr-1 align-middle"
          >
            Keep
          </button>
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
