/**
 * High-level puzzle creation.
 *
 * The UI passes normalized word-clue entries into these helpers.
 * They apply the shared length filter before delegating to the
 * crossword or word-search generators.
 *
 * Phase 10 adds:
 *   - createSkeletonFromEntries() — three-tier priority system + adaptive skeleton
 *   - createPuzzleWithPriority() — priority placement without skeleton
 *
 * Two-word phrases: entries may arrive with a space ("extra time").
 * The generators only ever see the solid grid form ("extratime") — these
 * entry points strip the space before placement and re-attach the spaced
 * form as `displayWord` on everything that surfaces to the UI (placed
 * words, skeleton slots, skipped/failed word lists). See language.ts.
 */

import type {
  CrosswordResult,
  DirectionalWord,
  WordCluePair,
  WordSearchDirectionSettings,
  PrioritizedEntry,
  SkeletonResult,
  PriorityGeneratorResult,
} from './types';
import { generateCrossword } from './generator';
import { generateWordSearch } from './wordSearchGenerator';
import { generateCrosswordWithPriority } from './priorityGenerator';
import { generateSkeleton } from './skeletonGenerator';
import { filterByLength, prepareForGenerator } from './databaseProcessor';
import { toGridWord } from './language';

/**
 * Options for creating a puzzle from word-clue entries.
 */
export interface EntryPuzzleOptions {
  entries: WordCluePair[];
  width: number;
  height: number;
  seed: number;
  allowReverseWords?: boolean;
  wordSearchDirections?: WordSearchDirectionSettings;

  /**
   * Word search only: grow the grid (+1 per side, capped) until every word
   * places. Default true — mirrors the crossword skeleton's growToFit.
   * Set false (Force Dimensions) to pin the size and report skipped words.
   */
  growToFit?: boolean;
}

/* ── Two-word phrase plumbing ─────────────────────────────────────────── */

/**
 * Convert entries to the grid form the generators understand, remembering
 * which grid words have a different display form (i.e. contained a space).
 */
function toGridFormEntries<T extends WordCluePair>(
  entries: T[]
): { entries: T[]; displayByGridWord: Map<string, string> } {
  const displayByGridWord = new Map<string, string>();
  const converted = entries.map(entry => {
    const gridWord = toGridWord(entry.word);
    if (gridWord !== entry.word) {
      displayByGridWord.set(gridWord, entry.word);
    }
    return gridWord === entry.word ? entry : { ...entry, word: gridWord };
  });
  return { entries: converted, displayByGridWord };
}

/** Attach displayWord to placed words whose grid form had a spaced original. */
function attachDisplayWords(
  words: DirectionalWord[],
  displayByGridWord: Map<string, string>
): void {
  if (displayByGridWord.size === 0) return;
  for (const wl of words) {
    const display = displayByGridWord.get(wl.word);
    if (display !== undefined) {
      wl.displayWord = display;
    }
  }
}

/** Map grid-form words in a report list back to their display form. */
function toDisplayList(
  words: string[],
  displayByGridWord: Map<string, string>
): string[] {
  if (displayByGridWord.size === 0) return words;
  return words.map(w => displayByGridWord.get(w) ?? w);
}

function assertEntriesFit(entries: WordCluePair[], width: number, height: number): void {
  const maxDim = Math.max(width, height);
  if (filterByLength(entries, maxDim).length === 0) {
    throw new Error('No entries fit within the current grid dimensions');
  }
}

/**
 * Create a crossword puzzle from word-clue entries.
 */
export function createPuzzleFromEntries(options: EntryPuzzleOptions): CrosswordResult {
  const { entries, displayByGridWord } = toGridFormEntries(options.entries);
  assertEntriesFit(entries, options.width, options.height);

  const maxDim = Math.max(options.width, options.height);
  const { words, clues } = prepareForGenerator(entries, maxDim);

  const result = generateCrossword({
    width: options.width,
    height: options.height,
    seed: options.seed,
    words,
    clues,
    // Reversed entries aren't a crossword convention — off unless asked for.
    allowReverseWords: options.allowReverseWords ?? false,
  });

  attachDisplayWords(result.wordLocations, displayByGridWord);
  return result;
}

// ---------------------------------------------------------------------------
// Phase 10: Priority-based and skeleton generation
// ---------------------------------------------------------------------------

/**
 * Options for creating a puzzle with the three-tier priority system.
 */
export interface PriorityPuzzleOptions {
  entries: PrioritizedEntry[];
  width: number;
  height: number;
  seed: number;
  allowReverseWords?: boolean;
  /** Candidate layouts per generation (default 5 — see PriorityGeneratorConfig). */
  candidateCount?: number;
  /**
   * Skeleton only: grow the grid until every must-include word places
   * (default true — see SkeletonConfig.growToFit).
   */
  growToFit?: boolean;
  /**
   * Skeleton only: fill under-used space with word-bank words stripped to
   * blank slots (default true — see SkeletonConfig.bankFill). The default
   * Generate path passes false: words in, finished puzzle out.
   */
  bankFill?: boolean;
}

/**
 * Create a crossword with priority-based placement (no skeleton).
 *
 * Must-include words are placed first (failures reported).
 * Can-include words fill remaining space (silently skipped if they don't fit).
 * Dont-include words are excluded.
 *
 * Use this when the caller has enough words to fill the grid
 * and doesn't need skeleton slots.
 */
export function createPuzzleWithPriority(
  options: PriorityPuzzleOptions
): PriorityGeneratorResult {
  const { entries, displayByGridWord } = toGridFormEntries(options.entries);
  const mustEntries = entries.filter(e => e.priority === 'must');
  const canEntries = entries.filter(e => e.priority === 'can');

  const result = generateCrosswordWithPriority({
    width: options.width,
    height: options.height,
    seed: options.seed,
    mustIncludeWords: mustEntries.map(e => e.word),
    mustIncludeClues: mustEntries.map(e => e.clue),
    canIncludeWords: canEntries.map(e => e.word),
    canIncludeClues: canEntries.map(e => e.clue),
    allowReverseWords: options.allowReverseWords ?? false,
    candidateCount: options.candidateCount,
  });

  attachDisplayWords(result.crossword.wordLocations, displayByGridWord);
  attachDisplayWords(result.placedMust, displayByGridWord);
  attachDisplayWords(result.placedCan, displayByGridWord);
  result.failedMust = result.failedMust.map(f => ({
    ...f,
    word: displayByGridWord.get(f.word) ?? f.word,
  }));
  result.skippedCan = toDisplayList(result.skippedCan, displayByGridWord);
  return result;
}

/**
 * Create a skeleton crossword from prioritized entries.
 *
 * This is the primary Phase 10 entry point. It:
 *   1. Places must-include and can-include words
 *   2. Adaptively decides if skeleton slots are needed
 *   3. If needed, fills gaps with word bank and strips to blank slots
 *   4. Returns SkeletonResult with filled + empty slots and constraint data
 */
export function createSkeletonFromEntries(
  options: PriorityPuzzleOptions
): SkeletonResult {
  const { entries, displayByGridWord } = toGridFormEntries(options.entries);

  const result = generateSkeleton({
    width: options.width,
    height: options.height,
    seed: options.seed,
    entries,
    allowReverseWords: options.allowReverseWords,
    candidateCount: options.candidateCount,
    growToFit: options.growToFit,
    bankFill: options.bankFill,
  });

  if (displayByGridWord.size > 0) {
    for (const slot of result.slots) {
      if (slot.word !== undefined) {
        const display = displayByGridWord.get(slot.word);
        if (display !== undefined) {
          slot.displayWord = display;
        }
      }
    }
    result.failures = result.failures.map(f => ({
      ...f,
      word: displayByGridWord.get(f.word) ?? f.word,
    }));
  }
  return result;
}

/**
 * Hard cap for word-search auto-growth, mirroring the skeleton generator's.
 * A grid at this size that still can't fit a word means the word itself is
 * unreasonable (30+ letters) — it stays in skippedWords instead of hanging.
 */
const WORD_SEARCH_GROW_CAP = 30;

/**
 * Create a word search puzzle from word-clue entries.
 *
 * By default the grid grows one cell per side until every word places
 * (growToFit). With growToFit: false the requested size is honored and
 * unplaced words are reported in skippedWords — including words that are
 * longer than the grid, which the length filter would otherwise drop
 * silently before the generator ever saw them.
 */
export function createWordSearchFromEntries(options: EntryPuzzleOptions): CrosswordResult {
  const growToFit = options.growToFit ?? true;
  const { entries, displayByGridWord } = toGridFormEntries(options.entries);

  let result: CrosswordResult;
  let width = options.width;
  let height = options.height;

  if (!growToFit) {
    assertEntriesFit(entries, width, height);
    result = wordSearchAtSize(options, entries, width, height);
  } else {
    result = wordSearchAtSize(options, entries, width, height);

    while (result.skippedWords && Math.max(width, height) < WORD_SEARCH_GROW_CAP) {
      width = Math.min(width + 1, WORD_SEARCH_GROW_CAP);
      height = Math.min(height + 1, WORD_SEARCH_GROW_CAP);
      result = wordSearchAtSize(options, entries, width, height);
    }

    if (width !== options.width || height !== options.height) {
      result.grewFrom = { width: options.width, height: options.height };
    }
  }

  attachDisplayWords(result.wordLocations, displayByGridWord);
  if (result.skippedWords) {
    result.skippedWords = toDisplayList(result.skippedWords, displayByGridWord);
  }
  return result;
}

/** One word-search generation at a specific size, with too-long words reported. */
function wordSearchAtSize(
  options: EntryPuzzleOptions,
  gridFormEntries: WordCluePair[],
  width: number,
  height: number
): CrosswordResult {
  const maxDim = Math.max(width, height);
  const { words, clues } = prepareForGenerator(gridFormEntries, maxDim);
  const tooLong = gridFormEntries
    .filter(e => e.word.length > maxDim)
    .map(e => e.word);

  const result = generateWordSearch({
    width,
    height,
    seed: options.seed,
    words,
    clues,
    directions: options.wordSearchDirections,
  });

  if (tooLong.length > 0) {
    result.skippedWords = [...(result.skippedWords ?? []), ...tooLong];
  }
  return result;
}
