import { describe, expect, it } from 'vitest';
import {
  countInvalidOrEmptyRows,
  createEmptyEntryRow,
  createEntryRowsFromEntries,
  getGenerationEntriesFromRows,
  hasMeaningfulRows,
  setEntryRowSource,
  splitEntriesBySource,
  validateEntryTableRow,
  type EntryTableRow,
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

  it('defaults source to manual for new and derived rows', () => {
    expect(createEmptyEntryRow().source).toBe('manual');

    const rows = createEntryRowsFromEntries([{ word: 'react', clue: 'A UI library' }]);
    expect(rows[0].source).toBe('manual');
  });

  it('tags rows ai when source is passed', () => {
    const rows = createEntryRowsFromEntries(
      [
        { word: 'react', clue: 'A UI library' },
        { word: 'vite', clue: 'A build tool' },
      ],
      {},
      'ai',
    );

    expect(rows.every((row) => row.source === 'ai')).toBe(true);
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
    expect(hasMeaningfulRows([{ word: '', clue: '' }])).toBe(false);
  });

  it('splits entries by source, preserving order and dropping invalid rows', () => {
    const rows: EntryTableRow[] = [
      { id: '1', word: 'react', clue: 'A UI library', source: 'manual' },
      { id: '2', word: 'vite', clue: 'A build tool', source: 'ai' },
      { id: '3', word: '', clue: '', source: 'ai' }, // empty -> dropped
      { id: '4', word: 'redux', clue: 'State container', source: 'manual' },
      { id: '5', word: 'esbuild', clue: '', source: 'ai' }, // missing clue -> invalid, dropped
      { id: '6', word: 'rollup', clue: 'A bundler', source: 'ai' },
    ];

    const { manual, ai } = splitEntriesBySource(rows);

    // Order preserved within each group; invalid/empty rows dropped.
    expect(manual).toEqual([
      { word: 'react', clue: 'A UI library' },
      { word: 'redux', clue: 'State container' },
    ]);
    expect(ai).toEqual([
      { word: 'vite', clue: 'A build tool' },
      { word: 'rollup', clue: 'A bundler' },
    ]);
  });

  it('treats a row missing source as manual when splitting', () => {
    // Simulates a partially shaped row (e.g. older data not yet migrated).
    const rows = [{ id: '1', word: 'react', clue: 'A UI library' }] as EntryTableRow[];
    const { manual, ai } = splitEntriesBySource(rows);
    expect(manual).toEqual([{ word: 'react', clue: 'A UI library' }]);
    expect(ai).toEqual([]);
  });

  it('setEntryRowSource flips one row and returns a new array', () => {
    const rows: EntryTableRow[] = [
      { id: '1', word: 'react', clue: 'A UI library', source: 'ai' },
      { id: '2', word: 'vite', clue: 'A build tool', source: 'ai' },
    ];

    const updated = setEntryRowSource(rows, '1', 'manual');

    expect(updated).not.toBe(rows); // new array
    expect(updated[0].source).toBe('manual');
    expect(updated[1].source).toBe('ai'); // untouched
    expect(rows[0].source).toBe('ai'); // original not mutated
  });
});
