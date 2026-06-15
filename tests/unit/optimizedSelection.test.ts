/**
 * Optimized subset selection tests.
 *
 * selectOptimizedSubset picks, from a quality-ranked candidate pool, the
 * subset that packs the best crossword on a pinned grid — trading packing
 * density against word quality (qualityBias). These tests pin the contract:
 *
 *   - Determinism: pure function of the config (same config -> same subset).
 *   - Premise: a larger pool packs at least as dense as its own best-N words
 *     at the same grid (the whole reason for an "Optimized" mode).
 *   - Bias mechanism: when the highest-quality words are hard to pack, a high
 *     qualityBias still selects them (lower average pool-rank) and a low
 *     qualityBias trades them away for easier-to-pack words.
 *   - Edge: an empty pool returns an empty result without throwing.
 *
 * Word lists are inline real-ish words on purpose — the engine must handle
 * any list, not just the bundled packs.
 */

import { describe, it, expect } from 'vitest';
import { selectOptimizedSubset } from '@logic/optimizedSelection';
import type { WordCluePair } from '@logic/types';

function entries(words: string[]): WordCluePair[] {
  return words.map(word => ({ word, clue: `clue for ${word}` }));
}

/** Average pool-rank of a selected subset (lower = higher quality picked). */
function averageSelectedRank(
  selectedWords: string[],
  pool: WordCluePair[],
): number {
  const rankOf = new Map<string, number>();
  pool.forEach((entry, index) => {
    if (!rankOf.has(entry.word)) rankOf.set(entry.word, index);
  });
  const ranks = selectedWords.map(word => rankOf.get(word)!);
  return ranks.reduce((sum, r) => sum + r, 0) / ranks.length;
}

/** 30 common 5-8 letter words, best-first (rank = index). */
const COMMON_30 = [
  'planet', 'rocket', 'garden', 'silver', 'dragon', 'castle', 'forest', 'market',
  'island', 'window', 'bridge', 'candle', 'flower', 'letter', 'animal', 'number',
  'orange', 'purple', 'yellow', 'mother', 'father', 'sister', 'winter', 'summer',
  'spring', 'autumn', 'school', 'friend', 'people', 'travel',
];

describe('selectOptimizedSubset', () => {
  it('is deterministic — same config yields identical entries', () => {
    const config = {
      pool: entries(COMMON_30),
      width: 14,
      height: 14,
      seed: 99,
      qualityBias: 0.5,
    };

    const first = selectOptimizedSubset(config);
    const second = selectOptimizedSubset(config);

    // Same words, in the same order.
    expect(second.entries).toEqual(first.entries);
    expect(second.selectedCount).toBe(first.selectedCount);
    expect(second.density).toBe(first.density);
  });

  it('packs a 3x pool at least as dense as its own best-N at the same grid', () => {
    const grid = { width: 14, height: 14, seed: 42, qualityBias: 0 };

    // Pure grid-fit (qualityBias 0): density is what we are comparing.
    const bigPool = selectOptimizedSubset({ pool: entries(COMMON_30), ...grid });
    const smallPool = selectOptimizedSubset({
      pool: entries(COMMON_30.slice(0, 13)),
      ...grid,
    });

    // The bigger pool gives the packer more letters to interlock on, so it
    // packs at least as dense as the exactly-target (first 13) set.
    expect(bigPool.poolSize).toBe(30);
    expect(smallPool.poolSize).toBe(13);
    expect(bigPool.density).toBeGreaterThanOrEqual(smallPool.density);
  });

  it('qualityBias=1 selects higher-quality words than qualityBias=0 when the best words are hard to pack', () => {
    // Ranks 0-3 are deliberately HARD to pack (rare letters, awkward shapes);
    // the rest are easy-to-pack common words. The two biases must diverge:
    // grid-fit drops the awkward top words, quality keeps them.
    const hardFirst = [
      'jazzy', 'quiz', 'xylophone', 'rhythm', // rank 0-3: rare letters / odd lengths
      'planet', 'garden', 'silver', 'castle', 'forest', 'market', 'island', 'candle',
      'flower', 'letter', 'animal', 'orange', 'winter', 'summer', 'spring', 'school',
      'friend', 'people', 'sister', 'mother', 'father', 'travel', 'window', 'bridge',
    ];
    const pool = entries(hardFirst);
    const grid = { pool, width: 12, height: 12, seed: 7 };

    const gridFit = selectOptimizedSubset({ ...grid, qualityBias: 0 });
    const quality = selectOptimizedSubset({ ...grid, qualityBias: 1 });

    const fitRank = averageSelectedRank(gridFit.entries.map(e => e.word), pool);
    const qualityRank = averageSelectedRank(quality.entries.map(e => e.word), pool);

    // Pure quality selects a higher-quality subset = lower average pool-rank.
    expect(qualityRank).toBeLessThan(fitRank);
  });

  it('returns an empty result for an empty pool without throwing', () => {
    const result = selectOptimizedSubset({
      pool: [],
      width: 14,
      height: 14,
      seed: 1,
      qualityBias: 0.5,
    });

    expect(result.selectedCount).toBe(0);
    expect(result.entries).toEqual([]);
    expect(result.poolSize).toBe(0);
    expect(result.density).toBe(0);
    expect(result.crossword.wordLocations).toEqual([]);
    expect(result.crossword.width).toBe(14);
    expect(result.crossword.height).toBe(14);
  });
});
