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
const MAX_GRID_SIZE = 20;

/**
 * Recommend a grid size based on must-include words.
 *
 * Algorithm:
 *   1. minDimension = longest word length (hard floor)
 *   2. Estimate total letters: must-include * expansion factor
 *      (skeleton adds connecting words — roughly 1.5-1.8x the user's content)
 *   3. Calculate needed area at ~30% cell density (typical crossword)
 *   4. recommendedDim = max(sqrt(area), minDimension + 1) + padding
 *   5. Clamp to [MIN_GRID_SIZE, MAX_GRID_SIZE]
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
  const avgWordLength = totalLetters / wordLengths.length;

  // Expansion factor: shorter average words pack more densely, so reduce
  // the multiplier for lists dominated by short words.
  const baseMultiplier = 1.7;
  const shortWordAdjustment = Math.max(0, (6 - avgWordLength) * 0.1);
  const expansionFactor = baseMultiplier - shortWordAdjustment;

  const estimatedTotalLetters = totalLetters * expansionFactor;

  // Crossword density target: 30% of cells contain letters
  const targetDensity = 0.30;
  const neededArea = estimatedTotalLetters / targetDensity;

  // Minimum dimension: must fit longest word, plus 1 for breathing room
  const minDimension = longestWord;
  const fromArea = Math.ceil(Math.sqrt(neededArea));
  let recommended = Math.max(fromArea, minDimension + 1);

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
    minDimension,
    outliers,
  };
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
  const longest = sorted[sorted.length - 1];
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
