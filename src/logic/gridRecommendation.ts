/**
 * Grid size recommendation and outlier word detection.
 *
 * Given a set of must-include words, recommends a grid size that will
 * comfortably fit all of them plus connecting skeleton slots. Also detects
 * words that are significantly longer than the rest (outliers), which would
 * force a disproportionately large grid.
 *
 * The recommendation is a starting point — the user can always adjust with
 * sliders. The outlier warning is non-blocking and dismissable.
 */

import type { GridRecommendation, OutlierWord } from './types';

/** Grid dimension limits. */
const MIN_GRID_SIZE = 8;
const MAX_GRID_SIZE = 26;

/**
 * Letters-to-cells ratio the recommendation aims for. Deliberately
 * optimistic (Phase 16 recalibration): a too-small recommendation
 * self-corrects — the skeleton generator grows the grid until every word
 * places — while a too-large one is forever sparse (nothing shrinks a
 * grid the placer never struggled with). Measured across pack profiles,
 * starting at 0.55 converges on the same final size as starting larger,
 * with visibly fewer empty cells.
 */
const PACKING_DENSITY = 0.55;

/**
 * Recommend a grid size based on must-include words.
 *
 * Algorithm:
 *   1. Area term: total letters / PACKING_DENSITY → side = ceil(sqrt(area))
 *   2. Floor: the longest word plus one cell of slack.
 *   3. Clamp to [MIN_GRID_SIZE, MAX_GRID_SIZE].
 *
 * The result is a *starting point* biased small on purpose: generation
 * auto-grows from here to the smallest grid that fits every word, which
 * is exactly the densest grid the engine can produce for the list.
 * (The old min(2*longest, longest+5) structural floor oversized grids —
 * one 14-letter word forced 19×19 and an 18%-full puzzle.)
 *
 * @param wordLengths - Array of word lengths (one per must-include word)
 * @returns Recommendation with dimensions, reason, and outlier warnings
 */
export function recommendGridSize(wordLengths: number[]): GridRecommendation {
  // No words → sensible default
  if (wordLengths.length === 0) {
    return {
      width: 10,
      height: 10,
      reason: 'Default size — add words for a tailored recommendation.',
      minDimension: 0,
      outliers: [],
    };
  }

  const longestWord = Math.max(...wordLengths);
  const totalLetters = wordLengths.reduce((sum, len) => sum + len, 0);

  const fromArea = Math.ceil(Math.sqrt(totalLetters / PACKING_DENSITY));
  let recommended = Math.max(fromArea, longestWord + 1);

  // Clamp to valid range
  recommended = clamp(recommended, MIN_GRID_SIZE, MAX_GRID_SIZE);

  // Build reason string
  const reason = buildReason(wordLengths.length, longestWord, recommended);

  // Detect outlier words
  const outliers = detectOutliers(wordLengths);

  return {
    width: recommended,
    height: recommended,
    reason,
    minDimension: longestWord,
    outliers,
  };
}

/**
 * A stable key for "the set of word lengths that drives a recommendation."
 *
 * The grid recommendation is a pure function of the word *lengths* (via max,
 * sum, and median) — not of clue text, row order, or row identity. The UI
 * recomputes (and re-renders the live size) only when this key changes, so
 * editing a clue, reordering rows, or toggling an unrelated option never
 * thrashes the suggested size.
 *
 * Order-insensitive on purpose: the recommendation reads the same whether the
 * words are [3, 8, 5] or [5, 3, 8], so reordering the list should not trigger
 * a recompute. The outlier *naming* still maps lengths back to the words the
 * user typed at the call site; this signature governs only the size recompute.
 */
export function gridLengthSignature(lengths: number[]): string {
  return [...lengths].sort((a, b) => a - b).join(',');
}

/**
 * Whether a recommendation needs recomputing, given the previous and next
 * length signatures (see {@link gridLengthSignature}). A named predicate so
 * the debounce/guard intent is explicit at the call site rather than an
 * inline string compare.
 */
export function shouldRecomputeRecommendation(prevSignature: string, nextSignature: string): boolean {
  return prevSignature !== nextSignature;
}

/**
 * The grid size generation should actually use, given the auto-size toggle.
 *
 * This is the don't-stomp rule in one place: when auto-sizing is on, the
 * recommendation drives the size; when it's off (the user has touched the
 * size — `autoGridSize` going false is exactly that signal), the manual size
 * is used verbatim and is *never* overwritten by a changing recommendation.
 * The recommendation can keep updating as a *suggestion* alongside the manual
 * sliders; this function guarantees it can't silently replace a deliberate
 * choice. Auto only takes effect with a usable recommendation (a real word
 * list — `minDimension > 0`); otherwise the manual size stands.
 */
export function resolveEffectiveGridSize(
  autoGridSize: boolean,
  manual: { width: number; height: number },
  recommendation: GridRecommendation | null,
): { width: number; height: number } {
  const autoActive = autoGridSize && recommendation != null && recommendation.minDimension > 0;
  return autoActive
    ? { width: recommendation!.width, height: recommendation!.height }
    : { width: manual.width, height: manual.height };
}

/**
 * Word counts that fill a crossword grid well, calibrated against the
 * Phase 16 engine (12 seeds × pinned sizes 9–21, classroom-style word
 * pools): the placer reliably lands 34–50% letter density on a
 * right-sized grid — beyond that, words start failing to place; below
 * it, the grid reads sparse. A typical classroom vocabulary word runs
 * ~6.5 letters, so the count band is density × area / 6.5.
 */
const TYPICAL_WORD_LENGTH = 6.5;
const COMFORTABLE_DENSITY_LO = 0.34;
const COMFORTABLE_DENSITY_HI = 0.50;

export interface WordCountRange {
  lo: number;
  hi: number;
}

/**
 * The word-count range that gives the placer the best shot at a dense
 * grid of the given size. Below `lo` the puzzle looks sparse; above `hi`
 * words start needing a bigger grid (auto-size grows, forced sizes
 * report failures).
 */
export function recommendedWordCountRange(width: number, height: number): WordCountRange {
  const area = width * height;
  const lo = Math.max(2, Math.round(COMFORTABLE_DENSITY_LO * area / TYPICAL_WORD_LENGTH));
  const hi = Math.max(lo, Math.round(COMFORTABLE_DENSITY_HI * area / TYPICAL_WORD_LENGTH));
  return { lo, hi };
}

/**
 * The single best target word count for a grid of the given size — the
 * midpoint of {@link recommendedWordCountRange}. `lo` is the point a grid
 * starts to read sparse and `hi` the point words start failing to place,
 * so the midpoint is the safest target: comfortably dense without crowding
 * the placer.
 *
 * This is the canonical "target puzzle word count." Prefill it in the AI
 * Words stepper, and treat it as the base a future Optimized mode multiplies
 * to size its larger AI candidate pool (pool = target × N), so the count
 * math stays in one pure place rather than tangled in stepper UI.
 */
export function recommendedWordCountTarget(width: number, height: number): number {
  const { lo, hi } = recommendedWordCountRange(width, height);
  return Math.round((lo + hi) / 2);
}

/**
 * Recommend a grid size for word search puzzles.
 * Word searches need more breathing room — words are hidden among filler.
 *
 * @param wordLengths - Array of word lengths
 * @returns Recommendation (same shape as crossword recommendation)
 */
export function recommendWordSearchGridSize(wordLengths: number[]): GridRecommendation {
  if (wordLengths.length === 0) {
    return {
      width: 10,
      height: 10,
      reason: 'Default size — add words for a tailored recommendation.',
      minDimension: 0,
      outliers: [],
    };
  }

  const longestWord = Math.max(...wordLengths);
  const totalLetters = wordLengths.reduce((sum, len) => sum + len, 0);

  // Word search: grid needs to be bigger than content for challenge
  const fromLength = longestWord + 3;
  const fromArea = Math.ceil(Math.sqrt(totalLetters * 3));
  let recommended = Math.max(fromLength, fromArea);

  recommended = clamp(recommended, MIN_GRID_SIZE, MAX_GRID_SIZE);

  const reason = `For ${wordLengths.length} words (longest: ${longestWord} letters), `
    + `we recommend at least ${recommended}x${recommended} for a good word search.`;

  return {
    width: recommended,
    height: recommended,
    reason,
    minDimension: longestWord,
    outliers: detectOutliers(wordLengths),
  };
}

/**
 * Detect words that are significantly longer than the rest of the set.
 *
 * A word is an outlier if:
 *   1. It's more than 2x the median length of all words, AND
 *   2. It's at least 4 letters longer than the second-longest word, AND
 *   3. There are at least 3 words total (need enough data to judge)
 *
 * We operate on lengths rather than actual word strings because the caller
 * may have both lengths and words — the caller maps back to the original words.
 *
 * @param wordLengths - Array of word lengths
 * @returns Array of outlier descriptions (index matches input array)
 */
export function detectOutliers(wordLengths: number[]): OutlierWord[] {
  if (wordLengths.length < 3) {
    return [];
  }

  const sorted = [...wordLengths].sort((a, b) => a - b);
  const median = computeMedian(sorted);
  const secondLongest = sorted[sorted.length - 2];

  const outliers: OutlierWord[] = [];

  for (let i = 0; i < wordLengths.length; i++) {
    const len = wordLengths[i];

    const isMuchLongerThanMedian = len > 2 * median;
    const isMuchLongerThanSecond = len >= secondLongest + 4;

    // Only flag the actual longest words that satisfy both conditions
    if (isMuchLongerThanMedian && isMuchLongerThanSecond) {
      outliers.push({
        word: '', // Caller fills in the actual word string
        length: len,
        medianOtherLength: median,
      });
    }
  }

  return outliers;
}

/**
 * Detect outlier words from a list of word strings.
 * Convenience wrapper that fills in word strings in the results.
 *
 * @param words - Array of word strings
 * @returns Array of outlier descriptions with word strings filled in
 */
export function detectOutlierWords(words: string[]): OutlierWord[] {
  const lengths = words.map(w => w.length);
  const outliers = detectOutliers(lengths);

  // Map outlier lengths back to the original words.
  // An outlier's length matches the word at the same index in the
  // lengths array, but detectOutliers iterates in order, so we
  // can rebuild the mapping.
  const result: OutlierWord[] = [];
  let outlierIdx = 0;

  for (let i = 0; i < words.length && outlierIdx < outliers.length; i++) {
    if (words[i].length === outliers[outlierIdx].length
        && outliers[outlierIdx].word === '') {
      result.push({
        ...outliers[outlierIdx],
        word: words[i],
      });
      outlierIdx++;
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Compute the median of a sorted numeric array. */
function computeMedian(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

/** Clamp a number to [min, max]. */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Build a human-readable reason string for the recommendation. */
function buildReason(wordCount: number, longestWord: number, recommended: number): string {
  if (longestWord >= recommended - 1) {
    return `Your longest word (${longestWord} letters) needs at least a `
      + `${longestWord + 1}-wide grid. We recommend ${recommended}x${recommended} `
      + `to fit all ${wordCount} words with connecting words.`;
  }
  return `For ${wordCount} words (longest: ${longestWord} letters), `
    + `we recommend ${recommended}x${recommended}.`;
}
