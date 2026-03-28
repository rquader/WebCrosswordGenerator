/**
 * Unit tests for the seeded PRNG.
 *
 * Verifies:
 * 1. Determinism — same seed = same sequence
 * 2. Distribution — values are within expected bounds
 * 3. Shuffle — Fisher-Yates produces consistent results
 */

import { describe, it, expect } from 'vitest';
import { SeededRandom } from '@logic/seedRandom';

describe('SeededRandom', () => {
  describe('determinism', () => {
    it('produces the same sequence for the same seed', () => {
      const rng1 = new SeededRandom(42);
      const rng2 = new SeededRandom(42);

      for (let i = 0; i < 100; i++) {
        expect(rng1.nextInt(1000)).toBe(rng2.nextInt(1000));
      }
    });

    it('produces different sequences for different seeds', () => {
      const rng1 = new SeededRandom(1);
      const rng2 = new SeededRandom(2);

      let allSame = true;
      for (let i = 0; i < 20; i++) {
        if (rng1.nextInt(1000) !== rng2.nextInt(1000)) {
          allSame = false;
          break;
        }
      }
      expect(allSame).toBe(false);
    });
  });

  describe('nextInt', () => {
    it('returns values in [0, bound)', () => {
      const rng = new SeededRandom(123);

      for (let i = 0; i < 1000; i++) {
        const value = rng.nextInt(10);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(10);
      }
    });

    it('throws on non-positive bound', () => {
      const rng = new SeededRandom(1);
      expect(() => rng.nextInt(0)).toThrow();
      expect(() => rng.nextInt(-1)).toThrow();
    });
  });

  describe('nextFloat', () => {
    it('returns values in [0, 1)', () => {
      const rng = new SeededRandom(456);

      for (let i = 0; i < 1000; i++) {
        const value = rng.nextFloat();
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(1);
      }
    });
  });

  describe('shuffle', () => {
    it('produces the same shuffle order for the same seed', () => {
      const rng1 = new SeededRandom(99);
      const rng2 = new SeededRandom(99);

      const arr1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const arr2 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

      rng1.shuffle(arr1);
      rng2.shuffle(arr2);

      expect(arr1).toEqual(arr2);
    });

    it('actually changes the order (not identity shuffle)', () => {
      const rng = new SeededRandom(42);
      const original = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const arr = [...original];

      rng.shuffle(arr);

      // Very unlikely to remain in original order
      expect(arr).not.toEqual(original);
    });

    it('preserves all elements (no duplicates or losses)', () => {
      const rng = new SeededRandom(77);
      const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

      rng.shuffle(arr);

      expect(arr.sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    });
  });
});
