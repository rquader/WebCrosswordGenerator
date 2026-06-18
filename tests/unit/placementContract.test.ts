/**
 * Placement-guarantee regression tests (part 2 of the placement suite).
 *
 * The product contract: every word a teacher adds IS placed at the recommended
 * size. The only acceptable failure is a word that physically cannot fit.
 *
 * The suite is split across three spec files (structural validity, this
 * guarantee block, and auto-grow in `placementAutoGrow.test.ts`) so that under
 * the deeper best-of-N re-seeding no single Vitest worker is pinned long enough
 * to trip Vitest's 60s worker-RPC ceiling. All three share
 * `placementGuaranteeFixtures.ts` and run in parallel by file. See the fixtures
 * module for the why.
 */

import { describe, it, expect } from 'vitest';
import { createSkeletonFromEntries } from '@logic/createPuzzle';
import { recommendGridSize } from '@logic/gridRecommendation';
import {
  HISTORY_32,
  CLASSROOM_10,
  SCIENCE_20,
  SEEDS,
  asEntries,
} from './placementGuaranteeFixtures';

// ---------------------------------------------------------------------------
// Placement guarantee — every word places at the recommended size
// ---------------------------------------------------------------------------

describe('placement guarantee at recommended size', () => {
  for (const [name, words] of [
    ['32-word history list', HISTORY_32],
    ['10-word classroom list', CLASSROOM_10],
    ['20-word science list', SCIENCE_20],
  ] as const) {
    it(`places every word of the ${name} on every seed`, () => {
      const rec = recommendGridSize(words.map(w => w.length));
      for (const seed of SEEDS) {
        const skeleton = createSkeletonFromEntries({
          entries: asEntries(words),
          width: rec.width,
          height: rec.height,
          seed,
        });
        expect(skeleton.failures, `seed ${seed} at ${rec.width}x${rec.height}`).toEqual([]);
        expect(skeleton.mustPlacedCount).toBe(words.length);
      }
    }, 30000); // heavy: full pipeline x many seeds — generous timeout to avoid load-induced flakes
  }
});
