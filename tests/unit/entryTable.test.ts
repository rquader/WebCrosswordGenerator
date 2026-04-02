import { describe, expect, it } from 'vitest';
import {
  countInvalidOrEmptyRows,
  createEntryRowsFromEntries,
  getGenerationEntriesFromRows,
  hasMeaningfulRows,
  validateEntryTableRow,
} from '../../src/components/entries/entryTable';

describe('entryTable', () => {
  it('creates editable rows from normalized entries', () => {
    const rows = createEntryRowsFromEntries([
      { word: 'React', clue: 'A UI library' },
      { word: 'Vite', clue: 'A build tool' },
    ]);

    expect(rows).toHaveLength(2);
    expect(rows[0].word).toBe('react');
    expect(rows[1].clue).toBe('A build tool');
  });

  it('validates rows and ignores empty rows for generation', () => {
    const valid = validateEntryTableRow({ id: '1', word: 'react', clue: 'A UI library' });
    const empty = validateEntryTableRow({ id: '2', word: '', clue: '' });
    const missingClue = validateEntryTableRow({ id: '3', word: 'vite', clue: '' });

    expect(valid.isValid).toBe(true);
    expect(empty.isEmpty).toBe(true);
    expect(missingClue.clueError).toBe('Clue is required');
  });

  it('derives generation entries from valid rows only', () => {
    const entries = getGenerationEntriesFromRows([
      { id: '1', word: 'react', clue: 'A UI library' },
      { id: '2', word: '', clue: '' },
      { id: '3', word: 'tool', clue: '' },
    ]);

    expect(entries).toEqual([
      { word: 'react', clue: 'A UI library' },
    ]);
  });

  it('counts invalid rows and detects meaningful content', () => {
    const rows = [
      { id: '1', word: 'react', clue: 'A UI library' },
      { id: '2', word: '', clue: '' },
      { id: '3', word: 'tool', clue: '' },
    ];

    expect(countInvalidOrEmptyRows(rows)).toBe(2);
    expect(hasMeaningfulRows(rows)).toBe(true);
    expect(hasMeaningfulRows([{ id: '4', word: '', clue: '' }])).toBe(false);
  });
});
