/**
 * Unit tests for the database processor utilities.
 */

import { describe, it, expect } from 'vitest';
import { filterByLength, getWords, getClues, prepareForGenerator, getClueForWord } from '@logic/databaseProcessor';
import type { WordCluePair } from '@logic/types';

const sampleEntries: WordCluePair[] = [
  { word: 'id', clue: 'Short identifier' },
  { word: 'java', clue: 'A programming language' },
  { word: 'array', clue: 'A collection' },
  { word: 'method', clue: 'A function in a class' },
  { word: 'inheritance', clue: 'OOP concept' },
];

describe('databaseProcessor', () => {
  describe('filterByLength', () => {
    it('returns only words with length <= maxLength', () => {
      const result = filterByLength(sampleEntries, 4);
      const words = result.map(e => e.word);

      expect(words).toContain('id');
      expect(words).toContain('java');
      expect(words).not.toContain('array');
      expect(words).not.toContain('method');
      expect(words).not.toContain('inheritance');
    });

    it('returns all entries when maxLength is very large', () => {
      const result = filterByLength(sampleEntries, 100);
      expect(result.length).toBe(sampleEntries.length);
    });

    it('returns empty array when maxLength is 0', () => {
      const result = filterByLength(sampleEntries, 0);
      expect(result.length).toBe(0);
    });
  });

  describe('getWords', () => {
    it('extracts words from entries', () => {
      const words = getWords(sampleEntries);
      expect(words).toEqual(['id', 'java', 'array', 'method', 'inheritance']);
    });
  });

  describe('getClues', () => {
    it('extracts clues from entries', () => {
      const clues = getClues(sampleEntries);
      expect(clues).toEqual([
        'Short identifier',
        'A programming language',
        'A collection',
        'A function in a class',
        'OOP concept',
      ]);
    });
  });

  describe('getClueForWord', () => {
    it('finds the clue for an existing word', () => {
      expect(getClueForWord(sampleEntries, 'java')).toBe('A programming language');
    });

    it('returns undefined for a missing word', () => {
      expect(getClueForWord(sampleEntries, 'python')).toBeUndefined();
    });
  });

  describe('prepareForGenerator', () => {
    it('filters and splits into words and clues', () => {
      const result = prepareForGenerator(sampleEntries, 5);

      expect(result.words).toEqual(['id', 'java', 'array']);
      expect(result.clues).toEqual(['Short identifier', 'A programming language', 'A collection']);
    });
  });
});
