import type { WordCluePair } from '../../logic/types';
import { normalizeWordInput } from '../../utils/fileParser';

export interface EntryTableRow {
  id: string;
  word: string;
  clue: string;
}

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
  };
}

export function createEntryRowsFromEntries(entries: WordCluePair[]): EntryTableRow[] {
  return entries.map((entry) => ({
    id: createEntryRowId(),
    word: normalizeWordInput(entry.word),
    clue: entry.clue,
  }));
}

/**
 * Validation stays in one place so table UI, review, and generation use the same rules.
 */
export function validateEntryTableRow(row: EntryTableRow): EntryRowValidation {
  const normalizedWord = normalizeWordInput(row.word);
  const trimmedClue = row.clue.trim();
  const isEmpty = normalizedWord.length === 0 && trimmedClue.length === 0;
  const wordError = isEmpty || normalizedWord.length > 0 ? null : 'Word is required';
  const clueError = isEmpty || trimmedClue.length > 0 ? null : 'Clue is required';

  return {
    normalizedWord,
    trimmedClue,
    wordError,
    clueError,
    isEmpty,
    isValid: !isEmpty && !wordError && !clueError,
  };
}

export function getGenerationEntriesFromRows(rows: EntryTableRow[]): WordCluePair[] {
  const entries: WordCluePair[] = [];
  for (const row of rows) {
    const validation = validateEntryTableRow(row);
    if (!validation.isValid) continue;
    entries.push({
      word: validation.normalizedWord,
      clue: validation.trimmedClue,
    });
  }
  return entries;
}

export function countInvalidOrEmptyRows(rows: EntryTableRow[]): number {
  let count = 0;
  for (const row of rows) {
    if (!validateEntryTableRow(row).isValid) {
      count += 1;
    }
  }
  return count;
}

export function hasMeaningfulRows(rows: EntryTableRow[]): boolean {
  return rows.some((row) => {
    const validation = validateEntryTableRow(row);
    return !validation.isEmpty;
  });
}
