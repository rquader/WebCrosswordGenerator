/**
 * Flagship Optimized AI-generation: canvas sizing + the high-level entry point.
 *
 * Optimized builds at a PINNED canvas (sized for the target count) and fills it
 * densely with the best-fitting, highest-quality subset of a larger AI pool —
 * the density win only exists at a fixed canvas (auto-sizing relaxes it). These
 * tests pin the canvas inverse, the finished-result shape, determinism, and that
 * the result packs above the typical Standard baseline.
 */
import { describe, it, expect } from 'vitest';
import { canvasForCount, recommendedWordCountTarget } from '@logic/gridRecommendation';
import { createOptimizedPuzzleFromEntries } from '@logic/createPuzzle';
import type { WordCluePair } from '@logic/types';

// A 40-word on-theme pool (best-first by convention), all 4-9 letters.
const POOL: WordCluePair[] = [
  'planet', 'rocket', 'meteor', 'saturn', 'uranus', 'nebula', 'cosmos', 'galaxy', 'crater', 'gravity',
  'orbit', 'comet', 'moon', 'eclipse', 'asteroid', 'venus', 'mercury', 'jupiter', 'neptune', 'lunar',
  'solar', 'cosmic', 'quasar', 'pulsar', 'photon', 'vacuum', 'helium', 'plasma', 'aurora', 'stellar',
  'telescope', 'astronaut', 'meteorite', 'spectrum', 'horizon', 'equinox', 'gaseous', 'radiant', 'cluster', 'corona',
].map((w, i) => ({ word: w, clue: `clue ${i}` }));

describe('canvasForCount', () => {
  it('inverts recommendedWordCountTarget (round-trips within rounding)', () => {
    for (const t of [5, 8, 13, 19, 26, 34]) {
      const c = canvasForCount(t);
      expect(c.width).toBe(c.height);
      const back = recommendedWordCountTarget(c.width, c.height);
      expect(Math.abs(back - t)).toBeLessThanOrEqual(Math.max(2, Math.round(t * 0.2)));
    }
  });

  it('clamps to the supported grid range', () => {
    expect(canvasForCount(1).width).toBeGreaterThanOrEqual(8);
    expect(canvasForCount(10000).width).toBeLessThanOrEqual(26);
  });
});

describe('createOptimizedPuzzleFromEntries', () => {
  it('builds a finished puzzle (no blank slots) from a subset of the pool', () => {
    const r = createOptimizedPuzzleFromEntries({ pool: POOL, targetCount: 13, qualityBias: 0.2, seed: 42 });
    const placed = r.slots.filter(s => s.word !== undefined);
    expect(placed.length).toBeGreaterThan(0);
    expect(placed.length).toBeLessThanOrEqual(POOL.length); // it's a SUBSET of the pool
    expect(r.slots.every(s => s.word !== undefined)).toBe(true); // finished — every slot is a real word
  });

  it('is deterministic for the same pool + seed', () => {
    const a = createOptimizedPuzzleFromEntries({ pool: POOL, targetCount: 13, qualityBias: 0.2, seed: 7 });
    const b = createOptimizedPuzzleFromEntries({ pool: POOL, targetCount: 13, qualityBias: 0.2, seed: 7 });
    expect(a.grid).toEqual(b.grid);
    expect(a.width).toBe(b.width);
    expect(a.slots.length).toBe(b.slots.length);
  });

  it('packs above the typical Standard baseline (~40-42%)', () => {
    const r = createOptimizedPuzzleFromEntries({ pool: POOL, targetCount: 13, qualityBias: 0.2, seed: 42 });
    let occ = 0;
    for (const row of r.grid) for (const cell of row) if (cell !== '-') occ++;
    const fill = occ / (r.width * r.height);
    expect(fill).toBeGreaterThan(0.42);
  });
});
