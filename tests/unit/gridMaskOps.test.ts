import { describe, it, expect } from 'vitest';
import {
  MIN_GRID_SIDE,
  MAX_GRID_SIDE,
  DEFAULT_GRID_SIDE,
  clampGridSide,
  createBlockMask,
  resizeBlockMask,
  setCell,
} from '../../src/logic/gridMaskOps';

describe('gridMaskOps', () => {
  describe('clampGridSide', () => {
    it('clamps below MIN and above MAX', () => {
      expect(clampGridSide(2)).toBe(MIN_GRID_SIDE);
      expect(clampGridSide(99)).toBe(MAX_GRID_SIDE);
    });
    it('rounds and passes through in-range values', () => {
      expect(clampGridSide(15)).toBe(15);
      expect(clampGridSide(12.4)).toBe(12);
    });
    it('falls back to the default on non-finite input', () => {
      expect(clampGridSide(NaN)).toBe(DEFAULT_GRID_SIDE);
    });
  });

  describe('createBlockMask', () => {
    it('creates an all-open mask of the right shape', () => {
      const m = createBlockMask(4, 3);
      expect(m.length).toBe(3);
      expect(m[0].length).toBe(4);
      expect(m.flat().every(c => c === false)).toBe(true);
    });
  });

  describe('resizeBlockMask', () => {
    it('preserves the overlapping top-left region when growing', () => {
      let m = createBlockMask(3, 3);
      m = setCell(m, 0, 0, true);
      m = setCell(m, 2, 2, true);
      const grown = resizeBlockMask(m, 3, 3, 5, 5);
      expect(grown.length).toBe(5);
      expect(grown[0].length).toBe(5);
      expect(grown[0][0]).toBe(true);
      expect(grown[2][2]).toBe(true);
      expect(grown[4][4]).toBe(false); // new cell is open
    });
    it('drops cells outside the new bounds when shrinking', () => {
      let m = createBlockMask(4, 4);
      m = setCell(m, 0, 0, true);
      m = setCell(m, 3, 3, true);
      const shrunk = resizeBlockMask(m, 4, 4, 2, 2);
      expect(shrunk.length).toBe(2);
      expect(shrunk[0].length).toBe(2);
      expect(shrunk[0][0]).toBe(true);
      expect(shrunk.flat().filter(Boolean).length).toBe(1); // (3,3) dropped
    });
  });

  describe('setCell', () => {
    it('returns a new mask with the cell changed, cloning only that row', () => {
      const m = createBlockMask(3, 3);
      const next = setCell(m, 1, 1, true);
      expect(next).not.toBe(m);
      expect(next[1]).not.toBe(m[1]); // changed row cloned
      expect(next[0]).toBe(m[0]); // unchanged rows shared
      expect(next[1][1]).toBe(true);
      expect(m[1][1]).toBe(false); // original not mutated
    });
    it('is a no-op (same reference) when the cell already has the target state', () => {
      const m = createBlockMask(3, 3);
      expect(setCell(m, 1, 1, false)).toBe(m);
    });
    it('ignores out-of-bounds coordinates', () => {
      const m = createBlockMask(3, 3);
      expect(setCell(m, -1, 0, true)).toBe(m);
      expect(setCell(m, 0, 5, true)).toBe(m);
    });
  });
});
