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
  /** Whether the generator may reverse words that don't fit. */
  allowReverseWords?: boolean;
  /** Emit debug logs. */
  debug?: boolean;
}

/**
 * Generate a skeleton crossword.
 *
 * Steps:
 *   1. Separate entries by priority tier (must / can / dont)
 *   2. Run priority generator with must + can words
 *   3. Check if the result needs a skeleton (are there structural gaps?)
 *   4. If yes: run again with word bank words as can-include to fill gaps
 *   5. Strip word bank words from the grid → blank skeleton slots
 *   6. Build SkeletonResult with pre-filled and empty slots
 */
export function generateSkeleton(config: SkeletonConfig): SkeletonResult {
  const { width, height, seed, entries } = config;
  const allowReverse = config.allowReverseWords ?? true;
  const debug = config.debug ?? false;

  // Step 1: Separate by tier
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
    // 'dont' entries are excluded entirely
  }

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
    debug,
  });

  const totalUserPlaced = userResult.placedMust.length + userResult.placedCan.length;

  // Step 3: Check if skeleton is needed
  // A skeleton is needed if fewer than ~70% of reasonable grid capacity is filled.
  // Rough capacity: for an NxN grid, expect about N*1.2 words at decent density.
  const estimatedCapacity = Math.floor(Math.max(width, height) * 1.2);
  const needsSkeleton = totalUserPlaced < estimatedCapacity * 0.7;

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

// ---------------------------------------------------------------------------
// Internal: build SkeletonResult from a completed crossword
// ---------------------------------------------------------------------------

/**
 * Build a SkeletonResult from a crossword where no skeleton slots are needed.
 * All placed words become pre-filled slots.
 */
function buildResultFromCrossword(
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
