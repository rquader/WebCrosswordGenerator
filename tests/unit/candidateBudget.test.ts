/**
 * Tests for the standard-path candidate budget (priorityGenerator.ts).
 *
 * The budget is a letter-weighted, deterministic work allowance:
 *   effectiveWork = totalWords + totalLetters / 5
 *   count         = clamp(round(5400 / effectiveWork), 12, 120)
 * Raised from the old best-of-8..30 to best-of-12..120, throttled by total
 * letters so long/large lists (costly per candidate) stay bounded to ~1s while
 * small/mid lists get the full 120. Constants are measurement-derived.
 *
 * We test the pure helper directly: cap bounds, the sanity counts the
 * benchmark predicts, letter-throttling, monotonicity, and determinism.
 */

import { describe, it, expect } from 'vitest';
import { candidateBudget, defaultCandidateCount } from '@logic/priorityGenerator';

const MIN = 12;
const MAX = 120;

describe('candidateBudget — cap bounds', () => {
  it('never drops below the floor (12), even for a huge skeleton-flooded list', () => {
    // ~300 word bank words averaging 6 letters — the skeleton fill path.
    const count = candidateBudget({ totalWords: 300, totalLetters: 1800 });
    expect(count).toBe(MIN);
    expect(count).toBeGreaterThanOrEqual(MIN);
  });

  it('never exceeds the ceiling (120), even for a tiny list', () => {
    const count = candidateBudget({ totalWords: 1, totalLetters: 3 });
    expect(count).toBe(MAX);
    expect(count).toBeLessThanOrEqual(MAX);
  });

  it('clamps every result into [12, 120] across a wide sweep', () => {
    for (let words = 1; words <= 400; words += 7) {
      const totalLetters = words * 6; // ~6 letters/word
      const count = candidateBudget({ totalWords: words, totalLetters });
      expect(count).toBeGreaterThanOrEqual(MIN);
      expect(count).toBeLessThanOrEqual(MAX);
    }
  });

  it('handles the empty / non-positive edge by returning the floor', () => {
    expect(candidateBudget({ totalWords: 0, totalLetters: 0 })).toBe(MIN);
    expect(candidateBudget({ totalWords: -5, totalLetters: 10 })).toBe(MIN);
  });
});

describe('candidateBudget — benchmark sanity counts', () => {
  // Expected counts come from the benchmark, not from re-derivation by feel.
  it('small list (8 words / ~41 letters) hits the full 120', () => {
    expect(candidateBudget({ totalWords: 8, totalLetters: 41 })).toBe(120);
  });

  it('mid list (14 words / ~85 letters) hits the full 120', () => {
    expect(candidateBudget({ totalWords: 14, totalLetters: 85 })).toBe(120);
  });

  it('large list (24 words / ~140 letters) lands around 100', () => {
    const count = candidateBudget({ totalWords: 24, totalLetters: 140 });
    expect(count).toBeGreaterThanOrEqual(95);
    expect(count).toBeLessThanOrEqual(105);
  });

  it('xlarge list (40 words / ~250 letters) lands in the 60-75 band', () => {
    const count = candidateBudget({ totalWords: 40, totalLetters: 250 });
    expect(count).toBeGreaterThanOrEqual(60);
    expect(count).toBeLessThanOrEqual(75);
  });

  it('long-word list (12 words / ~130 letters) still hits 120 (cheap count, costly each)', () => {
    expect(candidateBudget({ totalWords: 12, totalLetters: 130 })).toBe(120);
  });
});

describe('candidateBudget — letter throttling', () => {
  it('a small few-letter list gets the full 120', () => {
    // 8 short words (3 letters each) — both terms are tiny, so budget pins high.
    expect(candidateBudget({ totalWords: 8, totalLetters: 24 })).toBe(120);
  });

  it('a long-word list is throttled below 120 relative to its letters', () => {
    // Same 20-word count, but one list is letter-heavy. The letter-heavy list
    // must get FEWER candidates — letters cost work too.
    const shortWords = candidateBudget({ totalWords: 20, totalLetters: 60 });   // ~3 ltr/word
    const longWords = candidateBudget({ totalWords: 20, totalLetters: 300 });   // ~15 ltr/word
    expect(longWords).toBeLessThan(shortWords);
    expect(longWords).toBeLessThan(MAX);
  });

  it('adding letters at a fixed word count never raises the count (letters only cost)', () => {
    let prev = candidateBudget({ totalWords: 20, totalLetters: 0 });
    for (let letters = 20; letters <= 600; letters += 20) {
      const count = candidateBudget({ totalWords: 20, totalLetters: letters });
      expect(count).toBeLessThanOrEqual(prev);
      prev = count;
    }
  });
});

describe('candidateBudget — monotonic in work, deterministic', () => {
  it('is non-increasing as total work grows (more work => fewer candidates)', () => {
    // Grow words and letters together; the count must never go UP.
    let prev = candidateBudget({ totalWords: 1, totalLetters: 5 });
    for (let words = 1; words <= 120; words++) {
      const count = candidateBudget({ totalWords: words, totalLetters: words * 6 });
      expect(count).toBeLessThanOrEqual(prev);
      prev = count;
    }
  });

  it('is deterministic — identical input yields identical output', () => {
    const input = { totalWords: 23, totalLetters: 137 };
    const a = candidateBudget(input);
    const b = candidateBudget(input);
    const c = candidateBudget({ totalWords: 23, totalLetters: 137 });
    expect(a).toBe(b);
    expect(b).toBe(c);
  });
});

describe('defaultCandidateCount — wraps candidateBudget over word arrays', () => {
  it('sums grid-form letters from the words and matches the helper', () => {
    const words = ['python', 'java', 'react', 'node']; // 6+4+5+4 = 19 letters
    const viaArray = defaultCandidateCount(words);
    const viaHelper = candidateBudget({ totalWords: 4, totalLetters: 19 });
    expect(viaArray).toBe(viaHelper);
  });

  it('returns the floor for an empty word list', () => {
    expect(defaultCandidateCount([])).toBe(MIN);
  });

  it('throttles a letter-heavy list below an equal-count short list', () => {
    // Equal word count (20), but the long list is letter-heavy enough to cross
    // the clamp boundary (5400/120 = 45 effective-work units), so it drops below
    // 120 while the short list stays pinned at the ceiling.
    const shortList = Array.from({ length: 20 }, () => 'cat'); // 60 letters total
    const longList = Array.from({ length: 20 }, () => 'extraordinary'); // 260 letters total
    expect(defaultCandidateCount(longList)).toBeLessThan(defaultCandidateCount(shortList));
    expect(defaultCandidateCount(longList)).toBeLessThan(MAX);
  });
});
