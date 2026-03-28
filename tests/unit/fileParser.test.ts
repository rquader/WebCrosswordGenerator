/**
 * Unit tests for file parsing utilities.
 * Tests the local-only parsing of .txt, .csv, and .json formats.
 */

import { describe, it, expect } from 'vitest';
import { parseTextInput } from '../../src/utils/fileParser';

describe('parseTextInput', () => {
  it('parses "word: clue" format', () => {
    const result = parseTextInput('java: A programming language\narray: A collection');
    expect(result.entries.length).toBe(2);
    expect(result.entries[0].word).toBe('java');
    expect(result.entries[0].clue).toBe('A programming language');
    expect(result.errors.length).toBe(0);
  });

  it('parses "word - clue" format', () => {
    const result = parseTextInput('loop - Repeating code block');
    expect(result.entries[0].word).toBe('loop');
    expect(result.entries[0].clue).toBe('Repeating code block');
  });

  it('parses "word, clue" format', () => {
    const result = parseTextInput('method, A function in a class');
    expect(result.entries[0].word).toBe('method');
  });

  it('parses "word | clue" format', () => {
    const result = parseTextInput('string | A sequence of characters');
    expect(result.entries[0].word).toBe('string');
  });

  it('skips empty lines and comments', () => {
    const input = '# This is a comment\njava: Language\n\n// Another comment\narray: Collection';
    const result = parseTextInput(input);
    expect(result.entries.length).toBe(2);
  });

  it('reports errors for lines without separators', () => {
    const result = parseTextInput('java: Language\nbadline\narray: Collection');
    expect(result.entries.length).toBe(2);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0]).toContain('Line 2');
  });

  it('cleans words to lowercase alpha only', () => {
    const result = parseTextInput('Hello World: A greeting');
    expect(result.entries[0].word).toBe('helloworld');
  });

  it('handles Windows line endings (\\r\\n)', () => {
    const result = parseTextInput('java: Language\r\narray: Collection\r\n');
    expect(result.entries.length).toBe(2);
  });

  it('handles BOM marker', () => {
    const result = parseTextInput('\uFEFFjava: Language');
    expect(result.entries.length).toBe(1);
    expect(result.entries[0].word).toBe('java');
  });

  it('reports empty word errors', () => {
    const result = parseTextInput(': No word here');
    expect(result.entries.length).toBe(0);
    expect(result.errors.length).toBe(1);
  });

  it('reports empty clue errors', () => {
    const result = parseTextInput('java: ');
    expect(result.entries.length).toBe(0);
    expect(result.errors.length).toBe(1);
  });
});
