import { describe, expect, it } from 'vitest';
import { resolveFileUploadSource } from '../../src/components/sources/fileUploadSource';
import { resolveTextEntrySource } from '../../src/components/sources/textEntrySource';

describe('word import helpers', () => {
  it('text import resolves typed content into normalized entries', async () => {
    const result = await resolveTextEntrySource({
      rawText: 'Java: A programming language\narray - A collection',
    });

    expect(result.entries).toEqual([
      { word: 'java', clue: 'A programming language' },
      { word: 'array', clue: 'A collection' },
    ]);
    expect(result.warnings).toEqual([]);
    expect(result.sourceLabel).toBe('Text Import');
  });

  it('text import keeps warnings without blocking valid entries', async () => {
    const result = await resolveTextEntrySource({
      rawText: 'java: A programming language\nbadline\narray: A collection',
    });

    expect(result.entries.length).toBe(2);
    expect(result.warnings.length).toBe(1);
  });

  it('file upload resolves from parsed payloads', async () => {
    const result = await resolveFileUploadSource({
      fileName: 'words.csv',
      entries: [
        { word: 'react', clue: 'A UI library' },
        { word: 'vite', clue: 'A build tool' },
      ],
      warnings: ['Line 4: Empty clue'],
    });

    expect(result.entries.length).toBe(2);
    expect(result.warnings).toEqual(['Line 4: Empty clue']);
    expect(result.sourceLabel).toContain('words.csv');
  });

  it('returns zero valid entries when file payload is empty', async () => {
    const result = await resolveFileUploadSource({
      fileName: 'empty.txt',
      entries: [],
      warnings: ['No valid lines found'],
    });

    expect(result.entries).toEqual([]);
    expect(result.warnings).toEqual(['No valid lines found']);
  });
});
