/**
 * Skeleton crossword generator.
 *
 * Builds a crossword skeleton by:
 *   1. Placing must-include words (guaranteed)
 *   2. Placing can-include words (best-effort)
 *   3. Filling structural gaps with word bank words
 *   4. Stripping word bank words → blank slots for manual fill
 *
 * The result is a SkeletonResult with pre-filled slots (user's words)
 * and empty slots (blanks the user needs to fill with their own words).
 *
 * If enough user words are placed to produce a well-connected grid,
 * the skeleton step can be skipped entirely (no blank slots).
 */

import type {
  PrioritizedEntry,
  SkeletonResult,
  SkeletonSlot,
  PlacementFailure,
  DirectionalWord,
  CrosswordResult,
} from './types';
import { generateCrosswordWithPriority } from './priorityGenerator';
import { getWordBankByMaxLength } from './wordBank';

const EMPTY_CELL = '-';

export interface SkeletonConfig {
  /** Grid width. */
  width: number;
  /** Grid height. */
  height: number;
  /** PRNG seed for reproducibility. */
  seed: number;
  /** Words with their priority tiers (must/can/dont already filtered). */
  entries: PrioritizedEntry[];
  /**
   * Whether the generator may reverse words that don't fit.
   * Default: false — reversed entries aren't a crossword convention.
   */
  allowReverseWords?: boolean;
  /** Candidate layouts per generation pass (see PriorityGeneratorConfig). */
  candidateCount?: number;
  /**
   * When must-include words don't all fit at the requested size, grow the
   * grid (both dimensions, up to GROWTH_HARD_CAP) until they do, and report
   * the original size in `result.grewFrom`.
   *
   * Default: true — the product contract is that every user word is placed.
   * Set false to keep the exact requested size and get failures reported
   * (with a larger-size suggestion attached when one exists).
   */
  growToFit?: boolean;
  /**
   * Whether an under-filled grid gets word-bank words added and stripped
   * into blank slots for manual fill (the classic skeleton experience).
   *
   * Default: true. The Generate tab passes false on its default path —
   * the words-to-puzzle contract is "generate and you're done", with
   * blank-slot skeletons reserved for Force Dimensions and the explicit
   * blank-skeleton flow (empty word list).
   */
  bankFill?: boolean;
  /**
   * Trim empty border rows/columns from the finished result, so the grid
   * is exactly the words' bounding box. Pass true only when the engine
   * owns the size (the auto-size path) — a user-chosen size should render
   * at the size the user chose. Default: false.
   */
  cropToFit?: boolean;
  /** Emit debug logs. */
  debug?: boolean;
}

/** Absolute ceiling for auto-grown grids. Beyond this the input is unreasonable. */
export const GROWTH_HARD_CAP = 30;

/**
 * Generate a skeleton crossword.
 *
 * Runs the full pipeline at the requested size. If any must-include word
 * fails to place and growToFit is on (the default), the grid grows one
 * cell per side at a time — up to GROWTH_HARD_CAP — until every word
 * places. The result reports the size actually used, with the original
 * request in `grewFrom`.
 */
export function generateSkeleton(config: SkeletonConfig): SkeletonResult {
  const growToFit = config.growToFit ?? true;

  const baseline = generateSkeletonAtSize(config, config.width, config.height);
  if (baseline.failures.length === 0) {
    return finalizeSkeleton(baseline, config);
  }

  if (!growToFit) {
    attachGridSizeSuggestion(baseline, config);
    return baseline;
  }

  // Grow both dimensions together until every must-include word places.
  // Each attempt runs the full pipeline — placement interacts with the
  // word bank fill, so only the real result tells us whether a size works.
  let bestFallback = baseline;

  for (let delta = 1; ; delta++) {
    const width = Math.min(GROWTH_HARD_CAP, config.width + delta);
    const height = Math.min(GROWTH_HARD_CAP, config.height + delta);

    const attempt = generateSkeletonAtSize(config, width, height);

    if (attempt.failures.length === 0) {
      attempt.grewFrom = { width: config.width, height: config.height };
      return finalizeSkeleton(attempt, config);
    }

    if (attempt.failures.length < bestFallback.failures.length) {
      attempt.grewFrom = { width: config.width, height: config.height };
      bestFallback = attempt;
    }

    if (width === GROWTH_HARD_CAP && height === GROWTH_HARD_CAP) {
      // Physically unreasonable input (e.g. dozens of very long words).
      // Return the best attempt; remaining failures are reported honestly.
      return finalizeSkeleton(bestFallback, config);
    }
  }
}

/**
 * Final shaping of a generation result: when the caller asked for
 * crop-to-fit, trim the empty border so the grid is exactly the words'
 * bounding box. Whatever margin the placer left around the layout is
 * pure empty cells in the rendered puzzle — trimming it is the single
 * cheapest density win, and it never changes the layout itself.
 */
function finalizeSkeleton(result: SkeletonResult, config: SkeletonConfig): SkeletonResult {
  if (!config.cropToFit) {
    return result;
  }
  const cropped = cropSkeletonToContent(result);
  // The "sized up" report only makes sense if the final grid really is
  // larger than the request; after cropping it often isn't.
  if (cropped.grewFrom !== undefined
      && cropped.width <= cropped.grewFrom.width
      && cropped.height <= cropped.grewFrom.height) {
    delete cropped.grewFrom;
  }
  return cropped;
}

/**
 * Trim border rows/columns that contain no slot cells. Slot coordinates
 * (not grid letters) define the bounding box, so blank skeleton slots
 * survive a crop intact. Returns the result unchanged when there is
 * nothing to trim or nothing was placed.
 */
export function cropSkeletonToContent(result: SkeletonResult): SkeletonResult {
  if (result.slots.length === 0) {
    return result;
  }

  let minX = Infinity;
  let maxX = -1;
  let minY = Infinity;
  let maxY = -1;
  for (const slot of result.slots) {
    const endX = slot.direction === 'across' ? slot.startX + slot.length - 1 : slot.startX;
    const endY = slot.direction === 'across' ? slot.startY : slot.startY + slot.length - 1;
    if (slot.startX < minX) minX = slot.startX;
    if (endX > maxX) maxX = endX;
    if (slot.startY < minY) minY = slot.startY;
    if (endY > maxY) maxY = endY;
  }

  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  if (minX === 0 && minY === 0 && width === result.width && height === result.height) {
    return result;
  }

  const grid: string[][] = [];
  for (let y = minY; y <= maxY; y++) {
    grid.push(result.grid[y].slice(minX, maxX + 1));
  }

  return {
    ...result,
    grid,
    width,
    height,
    slots: result.slots.map(slot => ({
      ...slot,
      startX: slot.startX - minX,
      startY: slot.startY - minY,
    })),
  };
}

/**
 * One full skeleton generation pass at a fixed size.
 *
 * Steps:
 *   1. Separate entries by priority tier (must / can / dont)
 *   2. Run priority generator with must + can words
 *   3. Check if the result needs a skeleton (are there structural gaps?)
 *   4. If yes: run again with word bank words as can-include to fill gaps
 *   5. Strip word bank words from the grid → blank skeleton slots
 *   6. Build SkeletonResult with pre-filled and empty slots
 */
function generateSkeletonAtSize(
  config: SkeletonConfig,
  width: number,
  height: number,
): SkeletonResult {
  const { seed, entries } = config;
  const allowReverse = config.allowReverseWords ?? false;
  const debug = config.debug ?? false;
  const candidateCount = config.candidateCount;

  // Step 1: Separate by tier
  const { mustWords, mustClues, canWords, canClues } = separateTiers(entries);

  // Step 2: Run priority generator with user words only
  const userResult = generateCrosswordWithPriority({
    width,
    height,
    seed,
    mustIncludeWords: mustWords,
    mustIncludeClues: mustClues,
    canIncludeWords: canWords,
    canIncludeClues: canClues,
    allowReverseWords: allowReverse,
    candidateCount,
    debug,
  });

  const totalUserPlaced = userResult.placedMust.length + userResult.placedCan.length;

  // Step 3: Check if skeleton is needed
  // A skeleton is needed if fewer than ~70% of reasonable grid capacity is filled.
  // Rough capacity: for an NxN grid, expect about N*1.2 words at decent density.
  // With bankFill off the answer is always no — the user's words ARE the puzzle.
  const estimatedCapacity = Math.floor(Math.max(width, height) * 1.2);
  const needsSkeleton = (config.bankFill ?? true) && totalUserPlaced < estimatedCapacity * 0.7;

  if (!needsSkeleton) {
    // Enough user words — skip skeleton, return complete puzzle
    return buildResultFromCrossword(
      userResult.crossword,
      userResult.placedMust,
      userResult.placedCan,
      userResult.failedMust,
      mustWords.length,
      canWords.length,
    );
  }

  // Step 4: Fill gaps with word bank words as additional can-include
  const maxDim = Math.max(width, height);
  const bankWords = getWordBankByMaxLength(maxDim);

  // Exclude words the user already used (avoid duplicates in the grid)
  const usedWords = new Set<string>();
  for (const loc of userResult.crossword.wordLocations) {
    usedWords.add(loc.word);
  }
  const availableBank = bankWords.filter(w => !usedWords.has(w));

  // Run generator again with user words + bank words.
  // Bank words are can-include — they fill remaining space.
  const bankClues = availableBank.map(() => '__WORD_BANK__');

  const fullResult = generateCrosswordWithPriority({
    width,
    height,
    seed,
    mustIncludeWords: mustWords,
    mustIncludeClues: mustClues,
    canIncludeWords: [...canWords, ...availableBank],
    canIncludeClues: [...canClues, ...bankClues],
    allowReverseWords: allowReverse,
    candidateCount,
    debug,
  });

  // Step 5: Identify which placed words came from the word bank
  // Bank words have clue === '__WORD_BANK__'
  const bankPlacedWords = new Set<string>();
  for (const loc of fullResult.crossword.wordLocations) {
    if (loc.clue === '__WORD_BANK__') {
      bankPlacedWords.add(loc.word);
    }
  }

  // Step 6: Build skeleton — strip bank words from grid, create blank slots
  return buildSkeletonFromFullResult(
    fullResult.crossword,
    bankPlacedWords,
    fullResult.failedMust,
    mustWords.length,
    canWords.length,
    fullResult.placedMust.length,
    fullResult.placedCan.filter(loc => loc.clue !== '__WORD_BANK__').length,
  );
}

/** Split prioritized entries into must/can word and clue arrays ('dont' excluded). */
function separateTiers(entries: PrioritizedEntry[]) {
  const mustWords: string[] = [];
  const mustClues: string[] = [];
  const canWords: string[] = [];
  const canClues: string[] = [];

  for (const entry of entries) {
    if (entry.priority === 'must') {
      mustWords.push(entry.word);
      mustClues.push(entry.clue);
    } else if (entry.priority === 'can') {
      canWords.push(entry.word);
      canClues.push(entry.clue);
    }
  }

  return { mustWords, mustClues, canWords, canClues };
}

/**
 * Fallback for growToFit: false — when must-include words failed at the
 * pinned size, probe progressively larger grids for one where every
 * must-include word places, and attach it as `result.suggestion` so the
 * UI can offer a one-click regenerate.
 */
function attachGridSizeSuggestion(result: SkeletonResult, config: SkeletonConfig): void {
  const { mustWords, mustClues } = separateTiers(config.entries);
  if (result.failures.length === 0 || mustWords.length === 0) {
    return;
  }

  for (let delta = 1; delta <= 8; delta++) {
    const width = Math.min(GROWTH_HARD_CAP, config.width + delta);
    const height = Math.min(GROWTH_HARD_CAP, config.height + delta);
    if (width === result.width && height === result.height) {
      return; // Already at the cap — nothing bigger to suggest
    }

    const probe = generateCrosswordWithPriority({
      width,
      height,
      seed: config.seed,
      mustIncludeWords: mustWords,
      mustIncludeClues: mustClues,
      canIncludeWords: [],
      canIncludeClues: [],
      allowReverseWords: config.allowReverseWords ?? false,
      candidateCount: 3,
    });

    if (probe.failedMust.length === 0) {
      result.suggestion = { width, height };
      return;
    }
    if (width === GROWTH_HARD_CAP && height === GROWTH_HARD_CAP) {
      return;
    }
  }
}

// ---------------------------------------------------------------------------
// Internal: build SkeletonResult from a completed crossword
// ---------------------------------------------------------------------------

/**
 * Build a SkeletonResult from a crossword where no skeleton slots are needed.
 * All placed words become pre-filled slots. Exported so the Optimized AI path
 * can turn its winning layout into a finished (blank-slot-free) result.
 */
export function buildResultFromCrossword(
  crossword: CrosswordResult,
  placedMust: DirectionalWord[],
  placedCan: DirectionalWord[],
  failedMust: PlacementFailure[],
  mustTotalCount: number,
  canTotalCount: number,
): SkeletonResult {
  const slots = buildSlotsFromWordLocations(crossword.wordLocations, new Set());
  return {
    grid: crossword.grid,
    slots,
    width: crossword.width,
    height: crossword.height,
    mustPlacedCount: placedMust.length,
    mustTotalCount,
    canPlacedCount: placedCan.length,
    canTotalCount,
    failures: failedMust,
  };
}

/**
 * Build a SkeletonResult from a full crossword, stripping word bank words
 * to create blank skeleton slots.
 */
function buildSkeletonFromFullResult(
  crossword: CrosswordResult,
  bankWords: Set<string>,
  failedMust: PlacementFailure[],
  mustTotalCount: number,
  canTotalCount: number,
  mustPlacedCount: number,
  canPlacedCount: number,
): SkeletonResult {
  // Strip bank words from the grid
  const grid = deepCopyGrid(crossword.grid);

  for (const loc of crossword.wordLocations) {
    if (!bankWords.has(loc.word)) {
      continue; // Keep user words in the grid
    }

    // Remove bank word's letters — but only cells not shared with user words
    for (let i = 0; i < loc.word.length; i++) {
      const x = loc.isHorizontal ? loc.x + i : loc.x;
      const y = loc.isHorizontal ? loc.y : loc.y + i;

      // Check if this cell is shared with a user word
      if (!isCellSharedWithUserWord(crossword, x, y, bankWords)) {
        grid[y][x] = EMPTY_CELL;
      }
    }
  }

  // Filter out bank words that have no remaining blank cells in the grid.
  // These are bank words whose every cell was shared with a user word —
  // they were fully absorbed and shouldn't produce skeleton slots.
  const relevantLocations = crossword.wordLocations.filter(loc => {
    if (!bankWords.has(loc.word)) return true; // always keep user words

    // Check if this bank word has at least one blank cell in the stripped grid
    for (let i = 0; i < loc.word.length; i++) {
      const x = loc.isHorizontal ? loc.x + i : loc.x;
      const y = loc.isHorizontal ? loc.y : loc.y + i;
      if (grid[y][x] === EMPTY_CELL) return true; // has a blank cell — keep it
    }
    return false; // entirely covered by user words — drop it
  });

  const slots = buildSlotsFromWordLocations(relevantLocations, bankWords);

  return {
    grid,
    slots,
    width: crossword.width,
    height: crossword.height,
    mustPlacedCount,
    mustTotalCount,
    canPlacedCount,
    canTotalCount,
    failures: failedMust,
  };
}

/**
 * Check if a cell at (x, y) is shared with a non-bank (user) word.
 * A cell is shared if it's part of two words and at least one is a user word.
 */
function isCellSharedWithUserWord(
  crossword: CrosswordResult,
  x: number,
  y: number,
  bankWords: Set<string>,
): boolean {
  let userWordTouchesCell = false;

  for (const loc of crossword.wordLocations) {
    if (bankWords.has(loc.word)) {
      continue; // Skip bank words
    }

    // Check if this user word occupies cell (x, y)
    for (let i = 0; i < loc.word.length; i++) {
      const wx = loc.isHorizontal ? loc.x + i : loc.x;
      const wy = loc.isHorizontal ? loc.y : loc.y + i;

      if (wx === x && wy === y) {
        userWordTouchesCell = true;
        break;
      }
    }

    if (userWordTouchesCell) break;
  }

  return userWordTouchesCell;
}

/**
 * Build SkeletonSlots from word locations.
 * Bank words become empty slots (no word/clue), user words become filled slots.
 */
function buildSlotsFromWordLocations(
  wordLocations: DirectionalWord[],
  bankWords: Set<string>,
): SkeletonSlot[] {
  // First pass: build all slots
  const slots: SkeletonSlot[] = [];

  for (let i = 0; i < wordLocations.length; i++) {
    const loc = wordLocations[i];
    const isBank = bankWords.has(loc.word);

    // For reversed words, the grid contains the reversed letters but
    // wordLocations stores the original spelling. The slot must use the
    // reversed text so that letter positions match the grid exactly.
    const gridWord = loc.isReversed
      ? loc.word.split('').reverse().join('')
      : loc.word;

    slots.push({
      id: i + 1,
      direction: loc.isHorizontal ? 'across' : 'down',
      startX: loc.x,
      startY: loc.y,
      length: loc.word.length,
      constraints: new Map(), // Filled in second pass
      word: isBank ? undefined : gridWord,
      clue: isBank ? undefined : loc.clue,
      isUserWord: !isBank,
    });
  }

  // Second pass: compute constraints (locked letters from crossing words)
  // A constraint exists when an empty slot shares a cell with a filled slot.
  for (const slot of slots) {
    if (slot.word !== undefined) {
      continue; // Filled slots don't need constraints displayed
    }

    for (let pos = 0; pos < slot.length; pos++) {
      const x = slot.direction === 'across' ? slot.startX + pos : slot.startX;
      const y = slot.direction === 'across' ? slot.startY : slot.startY + pos;

      // Check if any filled slot occupies this cell
      for (const other of slots) {
        if (other.word === undefined) continue; // Both empty — no constraint

        for (let otherPos = 0; otherPos < other.length; otherPos++) {
          const ox = other.direction === 'across' ? other.startX + otherPos : other.startX;
          const oy = other.direction === 'across' ? other.startY : other.startY + otherPos;

          if (ox === x && oy === y) {
            // This cell is shared — lock the letter
            slot.constraints.set(pos, other.word[otherPos]);
          }
        }
      }
    }
  }

  return slots;
}

/** Deep-copy a 2D grid array. */
function deepCopyGrid(grid: string[][]): string[][] {
  return grid.map(row => [...row]);
}
