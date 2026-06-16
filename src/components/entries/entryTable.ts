import type { WordCluePair } from '../../logic/types';
import { normalizeWordInput } from '../../utils/fileParser';
import { validateWord, type WordRules } from '../../logic/language';

/**
 * Word rules plus table-level policy: crosswords need a clue per word,
 * word searches don't (the word bank IS the puzzle).
 */
export interface EntryValidationOptions extends WordRules {
  /** Default true. Pass false in word search mode. */
  requireClue?: boolean;
}

/**
 * Per-word provenance (ADR-10). Manual words are guaranteed a spot in the
 * puzzle; AI words form a curated pool the generator may pick a subset from.
 * Defaults to 'manual' everywhere — typed words and pack words are guaranteed,
 * and old persisted rows (no source) migrate to 'manual' on load.
 */
export type EntrySource = 'manual' | 'ai';

export interface EntryTableRow {
  id: string;
  word: string;
  clue: string;
  source: EntrySource;
}

/**
 * The fields validation reads off a row. Validation never touches `source`,
 * so it accepts this looser shape — handy for tests and ad-hoc row checks.
 */
export type EntryRowValues = Pick<EntryTableRow, 'word' | 'clue'>;

export interface EntryTableDraft {
  rows: EntryTableRow[];
  warnings: string[];
}

export interface TableImportPayload {
  entries: WordCluePair[];
  warnings: string[];
  sourceLabel: string;
  sourceSummary: string;
}

export interface EntryRowValidation {
  normalizedWord: string;
  trimmedClue: string;
  wordError: string | null;
  clueError: string | null;
  isEmpty: boolean;
  isValid: boolean;
}

/**
 * Row ID counter. Starts from the current timestamp to avoid collisions
 * with rows loaded from localStorage (which may have IDs from previous sessions).
 * Using Date.now() ensures new IDs never collide with old `entry-row-N` IDs
 * unless the user creates 10M+ rows in one session.
 */
let rowCounter = Date.now();

/**
 * Generate stable row ids for the editable table.
 */
export function createEntryRowId(): string {
  rowCounter += 1;
  return `entry-row-${rowCounter}`;
}

/**
 * New tables start with a blank row so the primary editor is immediately usable.
 */
export function createEmptyEntryRow(): EntryTableRow {
  return {
    id: createEntryRowId(),
    word: '',
    clue: '',
    source: 'manual',
  };
}

/**
 * Build editable rows from entries. `source` tags where the words came from:
 * 'manual' (default) for typed words, pack loads, and file/text imports —
 * all guaranteed a spot — and 'ai' for words pasted back from the AI builder
 * (a curated pool). See ADR-10.
 */
export function createEntryRowsFromEntries(
  entries: WordCluePair[],
  rules: WordRules = {},
  source: EntrySource = 'manual',
): EntryTableRow[] {
  return entries.map((entry) => ({
    id: createEntryRowId(),
    word: normalizeWordInput(entry.word, rules),
    clue: entry.clue,
    source,
  }));
}

/**
 * Validation stays in one place so table UI, review, and generation use
 * the same rules. `rules` carries the puzzle language, the two-word
 * answers option (see validateWord in logic/language.ts), and whether
 * clues are required (crossword yes, word search no).
 */
export function validateEntryTableRow(row: EntryRowValues, rules: EntryValidationOptions = {}): EntryRowValidation {
  const requireClue = rules.requireClue ?? true;
  const normalizedWord = normalizeWordInput(row.word, rules);
  const trimmedClue = row.clue.trim();
  const isEmpty = normalizedWord.length === 0 && trimmedClue.length === 0;
  const wordError = isEmpty ? null : validateWord(normalizedWord);
  const clueError = isEmpty || !requireClue || trimmedClue.length > 0 ? null : 'Clue is required';

  return {
    normalizedWord,
    trimmedClue,
    wordError,
    clueError,
    isEmpty,
    isValid: !isEmpty && !wordError && !clueError,
  };
}

export function getGenerationEntriesFromRows(rows: EntryRowValues[], rules: EntryValidationOptions = {}): WordCluePair[] {
  const entries: WordCluePair[] = [];
  for (const row of rows) {
    const validation = validateEntryTableRow(row, rules);
    if (!validation.isValid) continue;
    entries.push({
      word: validation.normalizedWord,
      clue: validation.trimmedClue,
    });
  }
  return entries;
}

export function countInvalidOrEmptyRows(rows: EntryRowValues[], rules: EntryValidationOptions = {}): number {
  let count = 0;
  for (const row of rows) {
    if (!validateEntryTableRow(row, rules).isValid) {
      count += 1;
    }
  }
  return count;
}

export function hasMeaningfulRows(rows: EntryRowValues[], rules: EntryValidationOptions = {}): boolean {
  return rows.some((row) => {
    const validation = validateEntryTableRow(row, rules);
    return !validation.isEmpty;
  });
}

/**
 * Partition valid entries by provenance (ADR-10). Manual entries are
 * guaranteed a spot (must-include); AI entries form a curated pool the
 * generator picks a subset from. Order is preserved within each group, and
 * invalid/empty rows are dropped (same rules as getGenerationEntriesFromRows).
 *
 * This is the API the Optimized generation split (F3) consumes:
 *   manual -> mustInclude, ai -> candidate pool.
 *
 * A row missing `source` is treated as 'manual' — safe for any partially
 * shaped input and consistent with the persistence migration.
 */
export function splitEntriesBySource(
  rows: EntryTableRow[],
  rules: EntryValidationOptions = {},
): { manual: WordCluePair[]; ai: WordCluePair[] } {
  const manual: WordCluePair[] = [];
  const ai: WordCluePair[] = [];
  for (const row of rows) {
    const validation = validateEntryTableRow(row, rules);
    if (!validation.isValid) continue;
    const entry: WordCluePair = { word: validation.normalizedWord, clue: validation.trimmedClue };
    if (row.source === 'ai') {
      ai.push(entry);
    } else {
      manual.push(entry);
    }
  }
  return { manual, ai };
}

/**
 * Set the provenance of a single row by id, returning a NEW array (rows are
 * never mutated in place). The "Keep" UI (F6) calls this to promote an AI
 * suggestion to a guaranteed manual word ('ai' -> 'manual'). Rows whose id
 * doesn't match are returned untouched.
 */
export function setEntryRowSource(
  rows: EntryTableRow[],
  id: string,
  source: EntrySource,
): EntryTableRow[] {
  return rows.map((row) => (row.id === id ? { ...row, source } : row));
}
