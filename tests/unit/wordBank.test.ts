import { describe, it, expect } from 'vitest';
import {
  WORD_BANK,
  getWordBankByMaxLength,
  getWordBankByExactLength,
} from '../../src/logic/wordBank';
import { getFullBlocklist, BLOCKLIST } from '../../src/data/blocklist';

/**
 * Invariants for WORD_BANK.
 *
 * The bank serves two purposes: (1) building connected skeleton grids that
 * are stripped to blank slots, and (2) the VISIBLE fallback fill for the
 * AI-fill flows — when the AI can't fill a slot, a bank word that fits the
 * crossings is placed and KEPT as a real answer the student sees. So the
 * bank must be clean, real, and broadly distributed across starting letters
 * and lengths, or some slots get no fallback and go silently blank.
 */
describe('WORD_BANK data integrity', () => {
  it('contains only lowercase a-z words', () => {
    const bad = WORD_BANK.filter(word => !/^[a-z]+$/.test(word));
    expect(bad).toEqual([]);
  });

  it('keeps every word within lengths [3, 15]', () => {
    const bad = WORD_BANK.filter(word => word.length < 3 || word.length > 15);
    expect(bad).toEqual([]);
  });

  it('has no case-insensitive duplicates', () => {
    const seen = new Map<string, number>();
    for (const word of WORD_BANK) {
      const key = word.toLowerCase();
      seen.set(key, (seen.get(key) ?? 0) + 1);
    }
    const dupes = [...seen.entries()]
      .filter(([, count]) => count > 1)
      .map(([word]) => word);
    expect(dupes).toEqual([]);
  });
});

describe('WORD_BANK coverage', () => {
  it('has every starting letter a-z represented at least 3 times', () => {
    const counts: Record<string, number> = {};
    for (const word of WORD_BANK) {
      const first = word[0];
      counts[first] = (counts[first] ?? 0) + 1;
    }
    const missing: string[] = [];
    for (let code = 'a'.charCodeAt(0); code <= 'z'.charCodeAt(0); code++) {
      const letter = String.fromCharCode(code);
      if ((counts[letter] ?? 0) < 3) {
        missing.push(`${letter}=${counts[letter] ?? 0}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('has length-5 words for the previously-missing g-z letters', () => {
    // These are exactly the high-traffic starting letters that the old
    // a-f-truncated bank could not supply at a common length.
    const requiredFirstLetters = ['g', 'h', 'm', 'p', 'r', 's', 't', 'w'];
    const fiveLetter = getWordBankByExactLength(5);
    const missing = requiredFirstLetters.filter(
      letter => !fiveLetter.some(word => word[0] === letter)
    );
    expect(missing).toEqual([]);
  });

  it('stays dense at the common lengths (>= 25 words each for 3-8)', () => {
    const thin: string[] = [];
    for (let length = 3; length <= 8; length++) {
      const count = getWordBankByExactLength(length).length;
      if (count < 25) {
        thin.push(`len ${length} = ${count}`);
      }
    }
    expect(thin).toEqual([]);
  });

  it('includes at least a few long words at lengths 13-15', () => {
    for (let length = 13; length <= 15; length++) {
      expect(getWordBankByExactLength(length).length).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('WORD_BANK safety', () => {
  it('contains no word that is on the profanity blocklist', () => {
    // getFullBlocklist() returns a flat, lowercased string[] — a clean
    // membership set. (We check exact membership; the blocklist is also used
    // as a substring scanner elsewhere, but exact membership is the right
    // assertion for "is this whole word itself a blocked word".)
    const blocked = new Set(getFullBlocklist());
    const offenders = WORD_BANK.filter(word => blocked.has(word.toLowerCase()));
    expect(offenders).toEqual([]);
  });

  it('contains no word with an offensive English term as a substring', () => {
    // Stronger guard for the VISIBLE-fallback use: a student should never
    // see a word that literally contains a slur/profanity as a substring.
    //
    // We intentionally do NOT use the full multi-language blocklist for the
    // substring check: it holds short foreign-language stems meant for
    // scanning random filler (e.g. French 'conne', 'pute'; Italian 'culo'),
    // which collide with innocent English words ('connect', 'computer').
    // We also restrict to English entries of length >= 5, because the very
    // short English stems ('cock', 'anal', 'rape', 'homo', 'dick', ...) are
    // substrings of perfectly innocent classroom words (peacock, analysis,
    // grape/therapy, homophone, dictionary). The length-5+ English entries
    // are all unambiguously offensive whole concepts, so a real bank word
    // containing one is a genuine red flag.
    const offensiveStems = BLOCKLIST.filter(term => term.length >= 5);
    const offenders = WORD_BANK.filter(word =>
      offensiveStems.some(stem => word.toLowerCase().includes(stem))
    );
    expect(offenders).toEqual([]);
  });
});

describe('WORD_BANK helpers (unchanged behavior)', () => {
  it('getWordBankByMaxLength returns only words <= maxLength', () => {
    const result = getWordBankByMaxLength(5);
    expect(result.length).toBeGreaterThan(0);
    expect(result.every(word => word.length <= 5)).toBe(true);
  });

  it('getWordBankByExactLength returns only words of that length', () => {
    const result = getWordBankByExactLength(7);
    expect(result.length).toBeGreaterThan(0);
    expect(result.every(word => word.length === 7)).toBe(true);
  });

  it('helpers do not mutate the bank', () => {
    const before = WORD_BANK.length;
    getWordBankByMaxLength(4);
    getWordBankByExactLength(4);
    expect(WORD_BANK.length).toBe(before);
  });
});
