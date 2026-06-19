/**
 * Tests for gridFill.ts - the fixed-grid fill solver for the skeleton-first
 * ("build your own grid") flow. Best-effort backtracking CSP over fixed slots.
 *
 * Fixtures are built like the app: a mask string -> deriveSlotsFromBlockMask ->
 * computeIntersections.
 */
import { describe, it, expect } from 'vitest';
import { fillGrid } from '@logic/gridFill';
import {
  deriveSlotsFromBlockMask,
  computeIntersections,
  type BlockMask,
} from '@logic/gridSkeleton';
import type { SkeletonSlot, WordCluePair } from '@logic/types';

function maskFromRows(rows: string[]): { mask: BlockMask; width: number; height: number } {
  const mask = rows.map(row => row.split('').map(ch => ch === '#'));
  const height = mask.length;
  const width = height > 0 ? mask[0].length : 0;
  return { mask, width, height };
}
function fixture(rows: string[]) {
  const { mask, width, height } = maskFromRows(rows);
  const skeleton = deriveSlotsFromBlockMask(mask, width, height);
  const intersections = computeIntersections(skeleton.slots);
  return { slots: skeleton.slots, intersections, width, height };
}
function pool(words: string[]): WordCluePair[] {
  return words.map(w => ({ word: w, clue: 'clue for ' + w }));
}

/** Cell -> letter for every placed slot; throws if two placed slots disagree. */
function lettersFromAssignments(
  slots: SkeletonSlot[],
  assignments: Map<number, { word: string; clue: string }>,
): Map<string, string> {
  const byId = new Map(slots.map(s => [s.id, s]));
  const letters = new Map<string, string>();
  for (const [slotId, { word }] of assignments) {
    const slot = byId.get(slotId)!;
    for (let i = 0; i < word.length; i++) {
      const x = slot.direction === 'across' ? slot.startX + i : slot.startX;
      const y = slot.direction === 'across' ? slot.startY : slot.startY + i;
      const key = x + ',' + y;
      const existing = letters.get(key);
      if (existing !== undefined) {
        expect(existing, 'cell ' + key + ' disagreement').toBe(word[i]);
      }
      letters.set(key, word[i]);
    }
  }
  return letters;
}

/** Assert every intersection between two PLACED slots holds one shared letter. */
function assertCrossingsAgree(
  slots: SkeletonSlot[],
  intersections: ReturnType<typeof computeIntersections>,
  assignments: Map<number, { word: string; clue: string }>,
) {
  for (const cross of intersections) {
    const a = assignments.get(cross.acrossSlotId);
    const d = assignments.get(cross.downSlotId);
    if (!a || !d) continue;
    expect(a.word[cross.acrossPos]).toBe(d.word[cross.downPos]);
  }
}

/** Words placed across all assignments (for duplicate checks). */
function placedWords(assignments: Map<number, { word: string; clue: string }>): string[] {
  return [...assignments.values()].map(a => a.word);
}

describe('fillGrid - full fill of a single crossing', () => {
  it('fills both slots of a 3x3 plus and the shared cell agrees', () => {
    // #.# / ... / #.# : across row 1 crosses down col 1 at (1,1), both index 1.
    const { slots, intersections } = fixture(['#.#', '...', '#.#']);
    expect(slots).toHaveLength(2);
    expect(intersections).toHaveLength(1);
    // "cat" and "oat" share 'a' at index 1 - a valid interlock.
    const result = fillGrid({ slots, intersections, pool: pool(['cat', 'oat', 'dog', 'pen']), seed: 1 });
    expect(result.unfilledSlotIds).toEqual([]);
    expect(result.assignments.size).toBe(2);
    assertCrossingsAgree(slots, intersections, result.assignments);
    const letters = lettersFromAssignments(slots, result.assignments);
    expect(letters.get('1,1')).toBeDefined();
    for (const { word, clue } of result.assignments.values()) {
      expect(clue).toBe('clue for ' + word);
    }
  });
});

describe('fillGrid - full fill of parallel (non-crossing) slots', () => {
  it('fills every slot with distinct words; no duplicates', () => {
    const { slots, intersections } = fixture(['...', '###', '...', '###', '...']);
    expect(slots.filter(s => s.direction === 'across')).toHaveLength(3);
    expect(intersections).toHaveLength(0);
    const result = fillGrid({ slots, intersections, pool: pool(['cat', 'dog', 'pen', 'sun', 'bat']), seed: 7 });
    expect(result.unfilledSlotIds).toEqual([]);
    expect(result.assignments.size).toBe(3);
    const words = placedWords(result.assignments);
    expect(new Set(words).size).toBe(words.length);
    for (const w of words) expect(w.length).toBe(3);
  });
});

describe('fillGrid - full fill of a denser interlocked grid', () => {
  // A 5x5 with a window of blocks - several crossings between across/down slots.
  // #...# / ..... / ..#.. / ..... / #...#
  const rows = ['#...#', '.....', '..#..', '.....', '#...#'];

  it('fully fills with sufficient pool and EVERY crossing agrees', () => {
    const { slots, intersections } = fixture(rows);
    expect(intersections.length).toBeGreaterThan(2);
    // A generous, varied pool of 3/4/5-letter words so a consistent fill exists.
    const words = [
      'cat', 'car', 'cot', 'cab', 'can', 'cap', 'cad', 'cam',
      'arc', 'are', 'art', 'ark', 'ate', 'ace', 'ado', 'age',
      'tap', 'tar', 'tan', 'top', 'tin', 'ten', 'tea', 'toe',
      'oat', 'one', 'ore', 'owl', 'own', 'out', 'old', 'oak',
      'rat', 'ran', 'rap', 'raw', 'rad', 'ram', 'rob',
      'cart', 'card', 'care', 'cane', 'cave', 'cake', 'case', 'cast',
      'tart', 'tate', 'tale', 'tame', 'tape', 'taco', 'taro', 'tarn',
      'rate', 'race', 'rare', 'rave', 'rage', 'rake', 'rant', 'roam',
      'oats', 'oaks', 'orca', 'open', 'oral', 'oboe', 'omen', 'odor',
      'scare', 'score', 'stare', 'store', 'crate', 'cream', 'trace', 'react',
      'acorn', 'actor', 'cater', 'cadet', 'arena', 'aroma',
    ];
    const result = fillGrid({ slots, intersections, pool: pool(words), seed: 3 });
    assertCrossingsAgree(slots, intersections, result.assignments);
    lettersFromAssignments(slots, result.assignments); // throws on any cell conflict
    // No duplicate answers, ever.
    const placed = placedWords(result.assignments);
    expect(new Set(placed).size).toBe(placed.length);
  });
});

describe('fillGrid - insufficient pool leaves slots blank (best-effort)', () => {
  it('reports unfilled slots and keeps crossings among placed slots valid', () => {
    // Three parallel across slots of length 3, but only two 3-letter words.
    const { slots, intersections } = fixture(['...', '###', '...', '###', '...']);
    const result = fillGrid({ slots, intersections, pool: pool(['cat', 'dog']), seed: 2 });
    // Two slots fillable, one must be blank.
    expect(result.assignments.size).toBe(2);
    expect(result.unfilledSlotIds).toHaveLength(1);
    // The unfilled id is a real slot id not present in assignments.
    const blankId = result.unfilledSlotIds[0];
    expect(result.assignments.has(blankId)).toBe(false);
    expect(slots.some(s => s.id === blankId)).toBe(true);
    // No duplicate answers.
    const placed = placedWords(result.assignments);
    expect(new Set(placed).size).toBe(placed.length);
    // Crossings among placed slots still valid (vacuously true here, no crossings).
    assertCrossingsAgree(slots, intersections, result.assignments);
  });

  it('on a crossing grid with no consistent fill, leaves a slot blank rather than failing', () => {
    // 3x3 plus: across + down cross at (1,1). Pool words share no common letter
    // at the crossing, so they cannot both be placed - one slot goes blank.
    const { slots, intersections } = fixture(['#.#', '...', '#.#']);
    // "cat" (idx1='a') and "dog" (idx1='o'): no shared letter at the cross.
    const result = fillGrid({ slots, intersections, pool: pool(['cat', 'dog']), seed: 5 });
    // Exactly one slot can be placed; the crossing partner cannot match.
    expect(result.assignments.size).toBe(1);
    expect(result.unfilledSlotIds).toHaveLength(1);
    assertCrossingsAgree(slots, intersections, result.assignments);
  });
});

describe('fillGrid - locked words', () => {
  it('keeps the locked word verbatim and crossers respect its letter', () => {
    const { slots, intersections } = fixture(['#.#', '...', '#.#']);
    const acrossSlot = slots.find(s => s.direction === 'across')!;
    const downSlot = slots.find(s => s.direction === 'down')!;
    // Lock the across slot to "cat". The crossing is at acrossPos 1 / downPos 1,
    // so the down word must have 'a' at index 1.
    const locked = new Map([[acrossSlot.id, { word: 'cat', clue: 'feline' }]]);
    const result = fillGrid({
      slots,
      intersections,
      pool: pool(['oat', 'dog', 'bar', 'pen']), // 'oat' has 'a' at index 1
      locked,
      seed: 1,
    });
    // Locked word preserved verbatim (word + clue).
    expect(result.assignments.get(acrossSlot.id)).toEqual({ word: 'cat', clue: 'feline' });
    // Down slot filled, respecting the locked crossing letter 'a' at index 1.
    const down = result.assignments.get(downSlot.id);
    expect(down).toBeDefined();
    expect(down!.word[1]).toBe('a');
    assertCrossingsAgree(slots, intersections, result.assignments);
  });

  it('locked always wins even when no crosser can match (crosser goes blank)', () => {
    const { slots, intersections } = fixture(['#.#', '...', '#.#']);
    const acrossSlot = slots.find(s => s.direction === 'across')!;
    const downSlot = slots.find(s => s.direction === 'down')!;
    const locked = new Map([[acrossSlot.id, { word: 'cat', clue: 'feline' }]]);
    // Down pool has no word with 'a' at index 1, so the down slot cannot fill.
    const result = fillGrid({
      slots,
      intersections,
      pool: pool(['dog', 'pen', 'bus']),
      locked,
      seed: 1,
    });
    expect(result.assignments.get(acrossSlot.id)).toEqual({ word: 'cat', clue: 'feline' });
    expect(result.unfilledSlotIds).toEqual([downSlot.id]);
    assertCrossingsAgree(slots, intersections, result.assignments);
  });

  it('does not reuse a locked word elsewhere in the grid', () => {
    // Two parallel across slots of length 3. Lock the first to "cat"; the only
    // other 3-letter candidate is also "cat" -> the second slot must stay blank
    // (no duplicate answers), not reuse the locked word.
    const { slots } = fixture(['...', '###', '...']);
    const acrossSlots = slots.filter(s => s.direction === 'across').sort((a, b) => a.id - b.id);
    expect(acrossSlots).toHaveLength(2);
    const locked = new Map([[acrossSlots[0].id, { word: 'cat', clue: 'feline' }]]);
    const result = fillGrid({
      slots,
      intersections: [],
      pool: pool(['cat']),
      locked,
      seed: 1,
    });
    expect(result.assignments.get(acrossSlots[0].id)).toEqual({ word: 'cat', clue: 'feline' });
    // Second slot must NOT be filled with the duplicate "cat".
    expect(result.assignments.has(acrossSlots[1].id)).toBe(false);
    expect(result.unfilledSlotIds).toEqual([acrossSlots[1].id]);
  });
});

describe('fillGrid - per-slot candidates (soft preferences)', () => {
  it('tries a slot\u2019s candidates first, falling back to an alternate that crosses', () => {
    // 3x3 plus: across crosses down at (1,1). The across slot's FIRST candidate
    // ("dog", 'o' at idx1) clashes with the down candidate ("cat", 'a' at idx1).
    // Its SECOND candidate ("oak", 'a' at idx1) agrees, so the solver must
    // backtrack off "dog" and place "oak" to fill both slots.
    const { slots, intersections } = fixture(['#.#', '...', '#.#']);
    const acrossSlot = slots.find(s => s.direction === 'across')!;
    const downSlot = slots.find(s => s.direction === 'down')!;
    const slotCandidates = new Map<number, WordCluePair[]>([
      [acrossSlot.id, [{ word: 'dog', clue: 'a pet' }, { word: 'oak', clue: 'a tree' }]],
      [downSlot.id, [{ word: 'cat', clue: 'a feline' }]],
    ]);

    const result = fillGrid({ slots, intersections, pool: [], slotCandidates, seed: 1 });

    expect(result.assignments.size).toBe(2);
    expect(result.assignments.get(acrossSlot.id)?.word).toBe('oak');
    expect(result.assignments.get(downSlot.id)?.word).toBe('cat');
    assertCrossingsAgree(slots, intersections, result.assignments);
  });

  it('prefers a candidate over an equally-valid pool word, keeping its clue', () => {
    const { slots, intersections } = fixture(['...']); // one length-3 across slot
    const slot = slots[0];
    const slotCandidates = new Map<number, WordCluePair[]>([
      [slot.id, [{ word: 'sun', clue: 'a star' }]],
    ]);
    // Pool also offers 'sun' (different clue) plus others; the candidate wins.
    const result = fillGrid({
      slots,
      intersections,
      pool: pool(['dog', 'sun', 'pen']),
      slotCandidates,
      seed: 1,
    });
    expect(result.assignments.get(slot.id)).toEqual({ word: 'sun', clue: 'a star' });
  });
});

describe('fillGrid - no duplicate answers across the whole grid', () => {
  it('never places the same word in two slots', () => {
    const { slots, intersections } = fixture(['#...#', '.....', '..#..', '.....', '#...#']);
    // Deliberately include some repeats in the pool; solver must still dedupe.
    const words = [
      'cat', 'cat', 'car', 'cot', 'cab', 'arc', 'are', 'art', 'oat', 'ore',
      'tap', 'tar', 'tan', 'rat', 'ran', 'rap', 'one', 'own', 'oak', 'ace',
      'cart', 'card', 'care', 'rate', 'race', 'rare', 'oats', 'open', 'oral', 'tart',
      'scare', 'score', 'stare', 'crate', 'react', 'actor', 'acorn', 'arena',
    ];
    const result = fillGrid({ slots, intersections, pool: pool(words), seed: 9 });
    const placed = placedWords(result.assignments);
    expect(new Set(placed).size).toBe(placed.length);
  });
});

describe('fillGrid - determinism', () => {
  it('same seed yields identical assignments and unfilled ids', () => {
    const { slots, intersections } = fixture(['#...#', '.....', '..#..', '.....', '#...#']);
    const words = [
      'cat', 'car', 'cot', 'cab', 'can', 'arc', 'are', 'art', 'oat', 'ore',
      'tap', 'tar', 'tan', 'rat', 'ran', 'rap', 'one', 'own', 'oak', 'ace',
      'cart', 'card', 'care', 'rate', 'race', 'rare', 'oats', 'open', 'oral', 'tart',
      'scare', 'score', 'stare', 'crate', 'react', 'actor', 'acorn', 'arena',
    ];
    const a = fillGrid({ slots, intersections, pool: pool(words), seed: 42 });
    const b = fillGrid({ slots, intersections, pool: pool(words), seed: 42 });
    expect([...a.assignments.entries()].sort((x, y) => x[0] - y[0]))
      .toEqual([...b.assignments.entries()].sort((x, y) => x[0] - y[0]));
    expect(a.unfilledSlotIds).toEqual(b.unfilledSlotIds);
  });

  it('is deterministic with the default seed (no seed argument)', () => {
    const { slots, intersections } = fixture(['#.#', '...', '#.#']);
    const a = fillGrid({ slots, intersections, pool: pool(['cat', 'oat', 'dog']) });
    const b = fillGrid({ slots, intersections, pool: pool(['cat', 'oat', 'dog']) });
    expect([...a.assignments.entries()]).toEqual([...b.assignments.entries()]);
    expect(a.unfilledSlotIds).toEqual(b.unfilledSlotIds);
  });
});

describe('fillGrid - word bank fallback', () => {
  it('fills extra slots from the curated bank when includeWordBank is true', () => {
    // Three parallel across slots of length 3; pool only supplies one word.
    // With the bank on, the other two slots should fill from the bank (clue '').
    const { slots, intersections } = fixture(['...', '###', '...', '###', '...']);
    const withoutBank = fillGrid({ slots, intersections, pool: pool(['dog']), seed: 4 });
    const withBank = fillGrid({
      slots,
      intersections,
      pool: pool(['dog']),
      includeWordBank: true,
      seed: 4,
    });
    expect(withoutBank.assignments.size).toBe(1);
    expect(withBank.assignments.size).toBeGreaterThan(withoutBank.assignments.size);
    expect(withBank.unfilledSlotIds.length).toBeLessThan(withoutBank.unfilledSlotIds.length);
    // The pool word keeps its real clue; bank-sourced fills carry an empty clue.
    let bankFilled = 0;
    for (const { word, clue } of withBank.assignments.values()) {
      if (word === 'dog') expect(clue).toBe('clue for dog');
      else {
        expect(clue).toBe('');
        bankFilled++;
      }
    }
    expect(bankFilled).toBeGreaterThan(0);
    // No duplicate answers across pool + bank.
    const placed = placedWords(withBank.assignments);
    expect(new Set(placed).size).toBe(placed.length);
  });
});

describe('fillGrid - edge cases', () => {
  it('returns empty result for an empty slot list', () => {
    const result = fillGrid({ slots: [], intersections: [], pool: pool(['cat']) });
    expect(result.assignments.size).toBe(0);
    expect(result.unfilledSlotIds).toEqual([]);
  });

  it('leaves every slot blank when the pool is empty and bank is off', () => {
    const { slots, intersections } = fixture(['#.#', '...', '#.#']);
    const result = fillGrid({ slots, intersections, pool: [] });
    expect(result.assignments.size).toBe(0);
    expect(result.unfilledSlotIds).toEqual(slots.map(s => s.id).sort((a, b) => a - b));
  });
});
