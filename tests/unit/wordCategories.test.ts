import { describe, it, expect } from 'vitest';
import {
  detectCategories,
  preferredBankWords,
  topicPreferredWords,
  categoryMembers,
  WORD_CATEGORY_NAMES,
} from '@logic/wordCategories';
import { WORD_BANK } from '@logic/wordBank';

const BANK = new Set(WORD_BANK.map(w => w.toLowerCase()));

describe('detectCategories', () => {
  it('detects categories from the topic string', () => {
    expect(detectCategories('Ocean Life')).toContain('ocean');
    expect(detectCategories('all about animals')).toContain('animals');
    expect(detectCategories('the solar system and planets')).toContain('space');
    expect(detectCategories('musical instruments')).toContain('music');
  });

  it('detects categories from the words already placed', () => {
    expect(detectCategories('', ['TIGER', 'ZEBRA', 'LION'])).toContain('animals');
  });

  it('matches whole tokens, not substrings (no false positives)', () => {
    // "category" must NOT trigger 'animals' via the member word 'cat'.
    expect(detectCategories('category management')).not.toContain('animals');
  });

  it('returns [] for an empty or unmatched topic', () => {
    expect(detectCategories('')).toEqual([]);
    expect(detectCategories('quarterly budget figures')).toEqual([]);
  });
});

describe('category membership', () => {
  it('every category has several members, all present in WORD_BANK', () => {
    for (const category of WORD_CATEGORY_NAMES) {
      const members = categoryMembers(category);
      expect(members.length, `${category} should have members`).toBeGreaterThan(3);
      for (const word of members) {
        expect(BANK.has(word), `${category} member "${word}" must be in the bank`).toBe(true);
      }
    }
  });
});

describe('preferredBankWords / topicPreferredWords', () => {
  it('unions the members of the active categories (all in the bank)', () => {
    const animals = preferredBankWords(['animals']);
    expect(animals.size).toBeGreaterThan(3);
    for (const word of animals) expect(BANK.has(word)).toBe(true);
  });

  it('maps a topic straight to a non-empty bank-word set', () => {
    const ocean = topicPreferredWords('Ocean Life');
    expect(ocean.size).toBeGreaterThan(0);
    for (const word of ocean) expect(BANK.has(word)).toBe(true);
  });

  it('returns an empty set for an unmatched topic (caller keeps default order)', () => {
    expect(topicPreferredWords('quarterly budget figures').size).toBe(0);
    expect(preferredBankWords([]).size).toBe(0);
  });
});
