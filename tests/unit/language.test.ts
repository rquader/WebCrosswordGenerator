/**
 * Tests for the puzzle language module — charsets, normalization,
 * two-word phrases, and the grid/display word split.
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeWord,
  normalizeWordWhileTyping,
  toGridWord,
  isTwoWordPhrase,
  validateWord,
  wordCharsetRegex,
  isPuzzleLanguage,
} from '@logic/language';

describe('normalizeWord', () => {
  it('lowercases and strips symbols but keeps digits', () => {
    expect(normalizeWord('  Co2! ')).toBe('co2');
    expect(normalizeWord('don’t')).toBe('dont');
    expect(normalizeWord('extra_time')).toBe('extratime');
  });

  it('drops accents for plain A-Z languages', () => {
    expect(normalizeWord('élève', { language: 'french' })).toBe('eleve');
    expect(normalizeWord('jalapeño')).toBe('jalapeno');
    expect(normalizeWord('açaí', { language: 'portuguese' })).toBe('acai');
  });

  it('writes ß as ss everywhere', () => {
    expect(normalizeWord('straße', { language: 'german' })).toBe('strasse');
  });

  it('keeps Spanish letters when the language is Spanish', () => {
    expect(normalizeWord('jalapeño', { language: 'spanish' })).toBe('jalapeño');
    expect(normalizeWord('CAMIÓN', { language: 'spanish' })).toBe('camión');
  });

  it('strips spaces unless two-word answers are allowed', () => {
    expect(normalizeWord('extra time')).toBe('extratime');
    expect(normalizeWord('extra time', { allowTwoWords: true })).toBe('extra time');
    expect(normalizeWord('  extra    time  ', { allowTwoWords: true })).toBe('extra time');
  });
});

describe('normalizeWordWhileTyping', () => {
  it('keeps one trailing space so the second word can be typed', () => {
    expect(normalizeWordWhileTyping('extra ', { allowTwoWords: true })).toBe('extra ');
    expect(normalizeWordWhileTyping('extra   ', { allowTwoWords: true })).toBe('extra ');
  });

  it('still strips the space entirely when phrases are off', () => {
    expect(normalizeWordWhileTyping('extra ')).toBe('extra');
  });
});

describe('grid/display word split', () => {
  it('toGridWord removes the space, isTwoWordPhrase detects it', () => {
    expect(toGridWord('extra time')).toBe('extratime');
    expect(toGridWord('single')).toBe('single');
    expect(isTwoWordPhrase('extra time')).toBe(true);
    expect(isTwoWordPhrase('single')).toBe(false);
  });
});

describe('validateWord', () => {
  it('rejects spaces when phrases are off, with a pointer to the setting', () => {
    const error = validateWord('extra time');
    expect(error).toContain('two-word answers');
  });

  it('accepts exactly two words when allowed, rejects three', () => {
    expect(validateWord('extra time', { allowTwoWords: true })).toBeNull();
    expect(validateWord('one two three', { allowTwoWords: true })).toBe('Two words at most');
  });

  it('requires at least 2 letters overall', () => {
    expect(validateWord('a')).toBe('Words need at least 2 letters');
    expect(validateWord('ab')).toBeNull();
  });
});

describe('wordCharsetRegex', () => {
  it('accepts digits everywhere, Spanish letters only for Spanish', () => {
    expect(wordCharsetRegex().test('CO2')).toBe(true);
    expect(wordCharsetRegex().test('JALAPEÑO')).toBe(false);
    expect(wordCharsetRegex({ language: 'spanish' }).test('JALAPEÑO')).toBe(true);
  });

  it('allows one internal space only with two-word answers', () => {
    expect(wordCharsetRegex().test('EXTRA TIME')).toBe(false);
    expect(wordCharsetRegex({ allowTwoWords: true }).test('EXTRA TIME')).toBe(true);
    expect(wordCharsetRegex({ allowTwoWords: true }).test('ONE TWO THREE')).toBe(false);
  });
});

describe('isPuzzleLanguage', () => {
  it('guards persisted settings values', () => {
    expect(isPuzzleLanguage('spanish')).toBe(true);
    expect(isPuzzleLanguage('klingon')).toBe(false);
    expect(isPuzzleLanguage(42)).toBe(false);
  });
});
