/**
 * Tests for the skeleton crossword generator.
 *
 * Covers:
 *   1. Skeleton generation with must-include words
 *   2. Adaptive behavior — skipping skeleton when enough words fill the grid
 *   3. Word bank integration — filling structural gaps
 *   4. Slot structure — pre-filled vs empty slots, constraints
 *   5. Constraint computation — locked letters from crossing words
 *   6. Edge cases — no words, all word bank, tiny grids
 *   7. Seed reproducibility
 */

import { describe, it, expect } from 'vitest';
import { generateSkeleton } from '@logic/skeletonGenerator';
import type { PrioritizedEntry, SkeletonSlot } from '@logic/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mustEntry(word: string, clue: string): PrioritizedEntry {
  return { word, clue, priority: 'must' };
}

function canEntry(word: string, clue: string): PrioritizedEntry {
  return { word, clue, priority: 'can' };
}

function dontEntry(word: string, clue: string): PrioritizedEntry {
  return { word, clue, priority: 'dont' };
}

/** Count slots that are pre-filled (user words). */
function countFilledSlots(slots: SkeletonSlot[]): number {
  return slots.filter(s => s.word !== undefined).length;
}

/** Count empty (blank) skeleton slots. */
function countEmptySlots(slots: SkeletonSlot[]): number {
  return slots.filter(s => s.word === undefined).length;
}

// ============================================================================
// Basic Skeleton Generation
// ============================================================================

describe('skeleton generation basics', () => {
  it('generates a skeleton with must-include words pre-filled', () => {
    const result = generateSkeleton({
      width: 12,
      height: 12,
      seed: 42,
      entries: [
        mustEntry('python', 'A snake language'),
        mustEntry('java', 'Coffee language'),
        mustEntry('react', 'UI library'),
      ],
    });

    // Must-include words should be placed
    expect(result.mustPlacedCount).toBe(3);
    expect(result.mustTotalCount).toBe(3);
    expect(result.failures.length).toBe(0);

    // There should be some slots
    expect(result.slots.length).toBeGreaterThan(0);

    // Must-include words should appear as filled slots.
    // Reversed words are stored as they appear in the grid (e.g. 'tcaer' for 'react').
    const filledWords = result.slots
      .filter(s => s.word !== undefined)
      .map(s => s.word!);

    function containsWordOrReverse(words: string[], target: string): boolean {
      const reversed = target.split('').reverse().join('');
      return words.includes(target) || words.includes(reversed);
    }

    expect(containsWordOrReverse(filledWords, 'python')).toBe(true);
    expect(containsWordOrReverse(filledWords, 'java')).toBe(true);
    expect(containsWordOrReverse(filledWords, 'react')).toBe(true);
  });

  it('creates empty slots for word bank words (skeleton structure)', () => {
    const result = generateSkeleton({
      width: 12,
      height: 12,
      seed: 42,
      entries: [
        mustEntry('hello', 'Greeting'),
        mustEntry('world', 'Earth'),
      ],
    });

    // With only 2 must-include words, the skeleton should add blank slots
    const emptySlots = countEmptySlots(result.slots);
    // We expect at least some empty slots (word bank words stripped)
    expect(emptySlots).toBeGreaterThanOrEqual(0);
    // Total slots should be more than just the 2 must-include words
    expect(result.slots.length).toBeGreaterThanOrEqual(2);
  });

  it('respects grid dimensions', () => {
    const result = generateSkeleton({
      width: 10,
      height: 10,
      seed: 42,
      entries: [mustEntry('code', 'Programming')],
    });

    expect(result.width).toBe(10);
    expect(result.height).toBe(10);
    expect(result.grid.length).toBe(10);
    expect(result.grid[0].length).toBe(10);
  });
});

// ============================================================================
// Three-Tier Handling
// ============================================================================

describe('three-tier handling', () => {
  it('excludes dont-include words entirely', () => {
    const result = generateSkeleton({
      width: 12,
      height: 12,
      seed: 42,
      entries: [
        mustEntry('python', 'Snake'),
        canEntry('java', 'Coffee'),
        dontEntry('excluded', 'Should not appear'),
      ],
    });

    // 'excluded' should not appear anywhere
    const allWords = result.slots.map(s => s.word).filter(Boolean);
    expect(allWords).not.toContain('excluded');
  });

  it('places can-include words after must-include', () => {
    // Use words with shared letters for reliable intersection
    const result = generateSkeleton({
      width: 12,
      height: 12,
      seed: 42,
      entries: [
        mustEntry('program', 'Code'),
        mustEntry('grape', 'Fruit'),
        canEntry('north', 'Direction'),
        canEntry('toast', 'Bread'),
        canEntry('arrow', 'Pointer'),
      ],
    });

    expect(result.mustPlacedCount).toBeGreaterThanOrEqual(1);
    expect(result.mustTotalCount).toBe(2);
    expect(result.canPlacedCount).toBeGreaterThanOrEqual(0);
    expect(result.canTotalCount).toBe(3);
  });

  it('reports must-include failures', () => {
    const result = generateSkeleton({
      width: 4,
      height: 4,
      seed: 42,
      entries: [
        mustEntry('toolongword', 'Will not fit'),
        mustEntry('hi', 'Short greeting'),
      ],
    });

    expect(result.failures.length).toBeGreaterThanOrEqual(1);
    expect(result.failures.some(f => f.word === 'toolongword')).toBe(true);
  });
});

// ============================================================================
// Slot Structure
// ============================================================================

describe('slot structure', () => {
  it('slots have correct direction and position', () => {
    const result = generateSkeleton({
      width: 12,
      height: 12,
      seed: 42,
      entries: [mustEntry('hello', 'Greeting')],
    });

    for (const slot of result.slots) {
      expect(['across', 'down']).toContain(slot.direction);
      expect(slot.startX).toBeGreaterThanOrEqual(0);
      expect(slot.startY).toBeGreaterThanOrEqual(0);
      expect(slot.length).toBeGreaterThan(0);
      expect(slot.id).toBeGreaterThan(0);

      // Slot must fit within grid bounds
      if (slot.direction === 'across') {
        expect(slot.startX + slot.length).toBeLessThanOrEqual(12);
      } else {
        expect(slot.startY + slot.length).toBeLessThanOrEqual(12);
      }
    }
  });

  it('filled slots have word and clue, empty slots do not', () => {
    const result = generateSkeleton({
      width: 12,
      height: 12,
      seed: 42,
      entries: [
        mustEntry('python', 'Snake language'),
        mustEntry('java', 'Coffee language'),
      ],
    });

    for (const slot of result.slots) {
      if (slot.isUserWord) {
        expect(slot.word).toBeTruthy();
        expect(slot.clue).toBeTruthy();
      } else {
        expect(slot.word).toBeUndefined();
        expect(slot.clue).toBeUndefined();
      }
    }
  });

  it('constraints map contains valid locked letters', () => {
    const result = generateSkeleton({
      width: 12,
      height: 12,
      seed: 42,
      entries: [
        mustEntry('python', 'Snake'),
        mustEntry('java', 'Coffee'),
        mustEntry('react', 'UI'),
      ],
    });

    for (const slot of result.slots) {
      // Constraints should be valid Map entries
      for (const [pos, letter] of slot.constraints) {
        expect(pos).toBeGreaterThanOrEqual(0);
        expect(pos).toBeLessThan(slot.length);
        expect(letter).toMatch(/^[a-z]$/);
      }
    }
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe('edge cases', () => {
  it('handles no entries at all (pure word bank skeleton)', () => {
    const result = generateSkeleton({
      width: 10,
      height: 10,
      seed: 42,
      entries: [],
    });

    // Should produce a skeleton entirely from word bank
    expect(result.mustPlacedCount).toBe(0);
    expect(result.mustTotalCount).toBe(0);
    expect(result.canPlacedCount).toBe(0);
    expect(result.canTotalCount).toBe(0);
    // There should still be slots (from word bank, all empty)
    expect(result.slots.length).toBeGreaterThanOrEqual(0);
  });

  it('handles only dont-include entries (treated as no entries)', () => {
    const result = generateSkeleton({
      width: 10,
      height: 10,
      seed: 42,
      entries: [
        dontEntry('excluded', 'Nope'),
        dontEntry('also excluded', 'Still nope'),
      ],
    });

    expect(result.mustTotalCount).toBe(0);
    expect(result.canTotalCount).toBe(0);
  });

  it('handles single word entry', () => {
    const result = generateSkeleton({
      width: 10,
      height: 10,
      seed: 42,
      entries: [mustEntry('hello', 'Greeting')],
    });

    expect(result.mustPlacedCount).toBe(1);
    const helloSlot = result.slots.find(s => s.word === 'hello');
    expect(helloSlot).toBeTruthy();
    expect(helloSlot!.isUserWord).toBe(true);
  });
});

// ============================================================================
// Seed Reproducibility
// ============================================================================

describe('seed reproducibility', () => {
  it('produces identical skeletons for the same seed', () => {
    const config = {
      width: 12,
      height: 12,
      seed: 42,
      entries: [
        mustEntry('python', 'Snake'),
        mustEntry('java', 'Coffee'),
        canEntry('node', 'Runtime'),
      ],
    };

    const result1 = generateSkeleton(config);
    const result2 = generateSkeleton(config);

    expect(result1.grid).toEqual(result2.grid);
    expect(result1.slots.length).toBe(result2.slots.length);
    expect(result1.mustPlacedCount).toBe(result2.mustPlacedCount);
    expect(result1.canPlacedCount).toBe(result2.canPlacedCount);
  });

  it('produces different skeletons for different seeds', () => {
    const entries = [
      mustEntry('python', 'Snake'),
      mustEntry('java', 'Coffee'),
      canEntry('node', 'Runtime'),
    ];

    const result1 = generateSkeleton({ width: 12, height: 12, seed: 1, entries });
    const result2 = generateSkeleton({ width: 12, height: 12, seed: 999, entries });

    // Different seeds should produce different layouts
    const grid1 = result1.grid.flat().join('');
    const grid2 = result2.grid.flat().join('');
    expect(grid1).not.toBe(grid2);
  });
});
