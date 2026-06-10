/**
 * Crossword puzzle generator engine.
 *
 * Originally a port of Generator.java by Armaan Saini; the placement rules
 * were rebuilt in Phase 15 to enforce real crossword structure:
 *
 *   1. Pair words with clues, shuffle (seeded), sort by length descending
 *   2. Place the longest word centered in the grid
 *   3. For each remaining word, find grid cells where characters match
 *   4. Try to place at each intersection, respecting direction balancing
 *   5. Words that fail get a rescue pass with no direction forcing
 *
 * A placement is only valid under classic crossword rules: every covered
 * cell is empty or matches the word's letter, the word crosses at least one
 * existing word, nothing touches it head-to-tail, and no side-by-side
 * letter pairs are created. Every maximal run of letters in the final grid
 * is exactly one placed word — nothing is glued together.
 */

import type { DirectionalWord, Intersection, WordCluePair, CrosswordResult, GeneratorConfig } from './types';
import { SeededRandom } from './seedRandom';

// Empty cell marker (matches Java's '-' character)
const EMPTY_CELL = '-';

/** Clamp a value into [min, max]. */
function clampToRange(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Generate a crossword puzzle from the given configuration.
 * This is the main entry point — replaces `new Generator(...)` from Java.
 */
export function generateCrossword(config: GeneratorConfig): CrosswordResult {
  const generator = new CrosswordGenerator(config);
  return generator.getResult();
}

/**
 * Internal generator class. Encapsulates all state during generation.
 * Not exported — use generateCrossword() instead.
 */
class CrosswordGenerator {
  private grid: string[][];
  private readonly width: number;
  private readonly height: number;
  private words: string[];
  private clues: string[];
  private random: SeededRandom;
  private reverseBlacklist: Set<string>;
  private allowReverseWords: boolean;
  private wordLocations: DirectionalWord[];
  private reversedWordsMap: Map<string, string>;
  private debug: boolean;
  private presorted: boolean;
  private firstWordOffset: number;
  private priorityWordCount: number;
  private horizontalCount = 0;
  private verticalCount = 0;

  constructor(config: GeneratorConfig) {
    this.width = config.width;
    this.height = config.height;
    this.words = [...config.words];
    this.clues = [...config.clues];
    this.random = new SeededRandom(config.seed);
    this.allowReverseWords = config.allowReverseWords;
    this.reverseBlacklist = new Set();
    this.wordLocations = [];
    this.reversedWordsMap = new Map();
    this.debug = config.debug ?? false;
    this.presorted = config.presorted ?? false;
    this.firstWordOffset = config.firstWordOffset ?? 0;
    this.priorityWordCount = config.priorityWordCount ?? 0;

    // Initialize grid with empty cells
    this.grid = [];
    for (let y = 0; y < this.height; y++) {
      const row: string[] = [];
      for (let x = 0; x < this.width; x++) {
        row.push(EMPTY_CELL);
      }
      this.grid.push(row);
    }

    this.generate();
  }

  /**
   * Returns the completed crossword result.
   */
  getResult(): CrosswordResult {
    return {
      grid: this.grid,
      wordLocations: this.wordLocations,
      width: this.width,
      height: this.height,
    };
  }

  // --- Bounds checking ---

  /** Check if a word of given length fits horizontally starting at (x, y). */
  private checkFitsInRow(x: number, y: number, length: number): boolean {
    return (x + length <= this.width) && (y < this.height);
  }

  /** Check if a word of given length fits vertically starting at (x, y). */
  private checkFitsInColumn(x: number, y: number, length: number): boolean {
    return (x < this.width) && (y + length <= this.height);
  }

  // --- Debug utilities ---

  private debugPrint(message: string): void {
    if (this.debug) {
      console.log('[DBG] ' + message);
    }
  }

  private printGrid(): void {
    for (const row of this.grid) {
      console.log(row.join(' '));
    }
  }

  // --- Cell inspection ---

  /** Check if a grid cell is occupied (not empty). Out-of-bounds counts as empty. */
  private isOccupied(x: number, y: number): boolean {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return false;
    }
    return this.grid[y][x] !== EMPTY_CELL;
  }

  // --- Word placement ---

  /**
   * Place a word on the grid at (x, y) in the given direction.
   * Records the placement in wordLocations.
   */
  private placeWord(word: string, clue: string, x: number, y: number, horizontal: boolean): void {
    if (horizontal) {
      for (let i = 0; i < word.length; i++) {
        this.grid[y][x + i] = word.charAt(i);
      }
    } else {
      for (let i = 0; i < word.length; i++) {
        this.grid[y + i][x] = word.charAt(i);
      }
    }

    // Check if this word is a reversed version of another
    const originalWord = this.reversedWordsMap.get(word);
    const isReversed = originalWord !== undefined;
    const actualWord = isReversed ? originalWord : word;

    this.wordLocations.push({
      word: actualWord,
      isHorizontal: horizontal,
      isReversed: isReversed,
      clue: clue,
      x: x,
      y: y,
    });
  }

  // --- Intersection detection ---

  /**
   * Find all grid positions where a character in the word matches
   * an already-placed character on the grid.
   */
  private findAllIntersections(word: string): Intersection[] {
    const result: Intersection[] = [];
    this.debugPrint('Current word: ' + word);

    for (let charIndex = 0; charIndex < word.length; charIndex++) {
      const c = word.charAt(charIndex);
      for (let x = 0; x < this.width; x++) {
        for (let y = 0; y < this.height; y++) {
          if (this.grid[y][x] === c) {
            result.push({ x, y, charIndex });
          }
        }
      }
    }

    return result;
  }

  // --- Placement validation (classic crossword rules) ---

  /**
   * Check whether a word may be placed at (startX, startY) in the given
   * direction. All of these must hold:
   *
   *   1. The word stays inside the grid.
   *   2. The cells immediately before and after the word are empty —
   *      otherwise the word would glue onto another word end-to-end.
   *   3. Every covered cell is either empty or already holds the same
   *      letter (a crossing with a perpendicular word).
   *   4. No two adjacent covered cells are both occupied — that would mean
   *      running on top of (or along) a word going the same direction.
   *   5. Every EMPTY covered cell has empty perpendicular neighbors —
   *      writing a letter next to an existing word would create an
   *      accidental unclued two-letter word.
   *   6. At least one covered cell is a real crossing. (Combined with
   *      rule 4 this also guarantees the word adds at least one new letter.)
   *
   * @returns The number of crossings (>= 1) if the placement is legal,
   *          or -1 if it is not.
   */
  private evaluatePlacement(word: string, startX: number, startY: number, horizontal: boolean): number {
    const length = word.length;

    // Rule 1: bounds
    if (horizontal) {
      if (!this.checkFitsInRow(startX, startY, length) || startX < 0 || startY < 0) {
        return -1;
      }
    } else {
      if (!this.checkFitsInColumn(startX, startY, length) || startX < 0 || startY < 0) {
        return -1;
      }
    }

    // Rule 2: no letters butting up against the head or tail
    const beforeX = horizontal ? startX - 1 : startX;
    const beforeY = horizontal ? startY : startY - 1;
    const afterX = horizontal ? startX + length : startX;
    const afterY = horizontal ? startY : startY + length;
    if (this.isOccupied(beforeX, beforeY) || this.isOccupied(afterX, afterY)) {
      return -1;
    }

    let crossings = 0;
    let previousOccupied = false;

    for (let i = 0; i < length; i++) {
      const x = horizontal ? startX + i : startX;
      const y = horizontal ? startY : startY + i;
      const occupied = this.isOccupied(x, y);

      if (occupied) {
        // Rule 3: an occupied cell must match the word's letter
        if (this.grid[y][x] !== word.charAt(i)) {
          return -1;
        }
        // Rule 4: two occupied cells in a row means a same-direction overlap
        if (previousOccupied) {
          return -1;
        }
        crossings++;
      } else {
        // Rule 5: a new letter must not touch a parallel word sideways
        const sideAX = horizontal ? x : x - 1;
        const sideAY = horizontal ? y - 1 : y;
        const sideBX = horizontal ? x : x + 1;
        const sideBY = horizontal ? y + 1 : y;
        if (this.isOccupied(sideAX, sideAY) || this.isOccupied(sideBX, sideBY)) {
          return -1;
        }
      }

      previousOccupied = occupied;
    }

    // Rule 6: must actually cross something
    return crossings >= 1 ? crossings : -1;
  }

  /**
   * Find every legal placement for a word, ranked best-first:
   *   1. More crossings (better interlock — and frees up future anchors)
   *   2. Preferred direction (from the balancing logic), if any
   *   3. Closer to the grid center (keeps layouts compact and centered)
   *   4. Stable enumeration order (keeps results deterministic)
   *
   * @param direction 'horizontal' | 'vertical' to restrict, or null for both
   * @param preferHorizontal soft preference used as a tiebreaker (null = none)
   */
  private findBestPlacement(
    word: string,
    direction: 'horizontal' | 'vertical' | null,
    preferHorizontal: boolean | null,
  ): { x: number; y: number; horizontal: boolean } | null {
    const centerX = (this.width - 1) / 2;
    const centerY = (this.height - 1) / 2;

    // The same placement is reachable through each of its crossing anchors,
    // so remember evaluated starts to avoid ranking duplicates.
    const seen = new Set<string>();

    let best: { x: number; y: number; horizontal: boolean } | null = null;
    let bestCrossings = 0;
    let bestPreferred = false;
    let bestCenterDist = Infinity;

    for (const loc of this.findAllIntersections(word)) {
      const tries: { x: number; y: number; horizontal: boolean }[] = [];
      if (direction !== 'vertical') {
        tries.push({ x: loc.x - loc.charIndex, y: loc.y, horizontal: true });
      }
      if (direction !== 'horizontal') {
        tries.push({ x: loc.x, y: loc.y - loc.charIndex, horizontal: false });
      }

      for (const t of tries) {
        const key = `${t.x},${t.y},${t.horizontal}`;
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);

        const crossings = this.evaluatePlacement(word, t.x, t.y, t.horizontal);
        if (crossings < 0) {
          continue;
        }

        const midX = t.horizontal ? t.x + (word.length - 1) / 2 : t.x;
        const midY = t.horizontal ? t.y : t.y + (word.length - 1) / 2;
        const centerDist = (midX - centerX) ** 2 + (midY - centerY) ** 2;
        const preferred = preferHorizontal !== null && t.horizontal === preferHorizontal;

        const better =
          crossings > bestCrossings
          || (crossings === bestCrossings && !bestPreferred && preferred)
          || (crossings === bestCrossings && preferred === bestPreferred && centerDist < bestCenterDist);

        if (best === null || better) {
          best = t;
          bestCrossings = crossings;
          bestPreferred = preferred;
          bestCenterDist = centerDist;
        }
      }
    }

    return best;
  }

  // --- Main generation algorithm ---

  /**
   * The core generation loop — faithful port of Generator.java's generate().
   *
   * Algorithm:
   *   1. Pair words with clues
   *   2. Shuffle pairs (seeded for reproducibility)
   *   3. Sort by word length descending (longer words placed first)
   *   4. Place first word at origin
   *   5. For each remaining word, find intersections and attempt placement
   *   6. Direction balancing ensures a mix of horizontal/vertical words
   *   7. Failed words can be retried reversed (if allowed)
   */
  private generate(): void {
    this.debugPrint('Words: ' + this.words.join(', '));

    // Step 1: Combine words and clues into pairs
    const pairs: WordCluePair[] = [];
    for (let i = 0; i < this.words.length; i++) {
      pairs.push({ word: this.words[i], clue: this.clues[i] });
    }

    // Step 2-3: Shuffle and sort — unless the caller pre-sorted the words
    // (used by the priority generator to control placement order).
    if (!this.presorted) {
      this.random.shuffle(pairs);
      this.debugPrint('Shuffled: ' + pairs.map(p => p.word).join(', '));

      pairs.sort((a, b) => b.word.length - a.word.length);
      this.debugPrint('Sorted: ' + pairs.map(p => p.word).join(', '));
    } else {
      this.debugPrint('Pre-sorted (skipping shuffle/sort): ' + pairs.map(p => p.word).join(', '));
    }

    // Unpack back to separate arrays
    this.words = pairs.map(p => p.word);
    this.clues = pairs.map(p => p.clue);

    // Step 4: Place the first (longest) word centered in the grid.
    // Words are pre-filtered by databaseProcessor to fit within max(width, height),
    // so the first word is guaranteed to fit in at least one direction.
    //
    // Centering (instead of the old top-left corner) leaves room on every
    // side for crossing words — placing at row 0 made any intersection that
    // needed letters above the first word impossible (see the must-include
    // placement bug: ORANGE at row 0 blocked LOVE entirely).
    // firstWordOffset shifts off-center along the perpendicular axis so the
    // priority generator can diversify candidate layouts.
    const firstWord = this.words.shift()!;
    const firstClue = this.clues.shift()!;
    const firstHorizontal = firstWord.length <= this.width;

    let firstX: number;
    let firstY: number;
    if (firstHorizontal) {
      firstX = Math.floor((this.width - firstWord.length) / 2);
      firstY = clampToRange(
        Math.floor((this.height - 1) / 2) + this.firstWordOffset, 0, this.height - 1);
    } else {
      firstX = clampToRange(
        Math.floor((this.width - 1) / 2) + this.firstWordOffset, 0, this.width - 1);
      firstY = Math.floor((this.height - firstWord.length) / 2);
    }
    this.placeWord(firstWord, firstClue, firstX, firstY, firstHorizontal);

    // Track direction counts for balancing
    this.horizontalCount = firstHorizontal ? 1 : 0;
    this.verticalCount = firstHorizontal ? 0 : 1;

    // Step 5: Place remaining words using intersections, in two phases.
    //
    // The first (priorityWordCount - 1) remaining words are the caller's
    // high-priority words (the first one is already on the grid). Any that
    // fail get rescued IMMEDIATELY — before lower-priority words can crowd
    // the grid. The rest are placed after, with a final rescue sweep for
    // everything still unplaced.
    const remaining: WordCluePair[] = [];
    while (this.words.length > 0) {
      remaining.push({ word: this.words.shift()!, clue: this.clues.shift()! });
    }

    const prioritySplit = Math.min(
      Math.max((this.priorityWordCount ?? 0) - 1, 0),
      remaining.length,
    );
    const priorityQueue = remaining.slice(0, prioritySplit);
    const regularQueue = remaining.slice(prioritySplit);

    // Swap rescue is reserved for priority words: they are guaranteed to
    // the user, and the escalation is too expensive to spend on hundreds
    // of best-effort filler words.
    const priorityWords = new Set(priorityQueue.map(p => p.word));

    let stillUnplaced = this.processQueue(priorityQueue);
    if (stillUnplaced.length > 0) {
      stillUnplaced = this.rescuePass(stillUnplaced, word => priorityWords.has(word));
    }

    stillUnplaced.push(...this.processQueue(regularQueue));
    const failed = this.rescuePass(stillUnplaced, word => priorityWords.has(word));

    if (failed.length > 0) {
      this.debugPrint('Unplaced after rescue: ' + failed.map(p => p.word).join(', '));
    }

    this.debugPrint('Final grid:');
    if (this.debug) {
      this.printGrid();
    }
  }

  /**
   * Place each queued word at its best available spot, honoring direction
   * balancing. Words that fail are returned (in their original spelling)
   * for a rescue pass. Failed words are retried reversed when allowed.
   */
  private processQueue(queue: WordCluePair[]): WordCluePair[] {
    const unplaced: WordCluePair[] = [];

    while (queue.length > 0) {
      const { word, clue } = queue.shift()!;

      if (this.tryPlaceBalanced(word, clue)) {
        continue;
      }

      if (this.allowReverseWords && !this.reverseBlacklist.has(word)) {
        const reversed = word.split('').reverse().join('');
        queue.unshift({ word: reversed, clue });
        this.reverseBlacklist.add(reversed);
        this.reversedWordsMap.set(reversed, word);
      } else {
        const original = this.reversedWordsMap.get(word) ?? word;
        unplaced.push({ word: original, clue });
      }
    }

    return unplaced;
  }

  /**
   * Step 6: Direction balancing. Decides the direction constraint for one
   * word, then places it at the best-ranked legal spot.
   */
  private tryPlaceBalanced(word: string, clue: string): boolean {
    let direction: 'horizontal' | 'vertical' | null = null;
    let preferHorizontal: boolean | null = null;
    const gap = this.horizontalCount - this.verticalCount;

    if (this.horizontalCount === 0) {
      // No horizontal words yet — force horizontal
      direction = 'horizontal';
    } else if (this.verticalCount === 0) {
      // No vertical words yet — force vertical
      direction = 'vertical';
    } else if (gap <= -3) {
      // 3+ more verticals than horizontals — force horizontal
      direction = 'horizontal';
    } else if (gap >= 3) {
      // 3+ more horizontals than verticals — force vertical
      direction = 'vertical';
    } else if (this.horizontalCount < 2) {
      // Only 1 horizontal — prefer horizontal, other direction allowed
      preferHorizontal = true;
    } else if (this.verticalCount < 2) {
      // Only 1 vertical — prefer vertical, other direction allowed
      preferHorizontal = false;
    } else if (this.horizontalCount <= this.verticalCount) {
      // Fewer horizontals — 2-in-3 chance to prefer horizontal
      preferHorizontal = this.random.nextInt(3) < 2;
    } else {
      // Fewer verticals — 1-in-3 chance horizontal (2-in-3 vertical)
      preferHorizontal = this.random.nextInt(3) < 1;
    }

    return this.placeAtBest(word, clue, direction, preferHorizontal);
  }

  /**
   * Rescue pass: retry unplaced words with no direction forcing — any
   * intersection, either direction. Placing one word can open intersections
   * for another, so the pass repeats until a full sweep places nothing.
   *
   * When plain retries stall, escalates to swap rescue: temporarily remove
   * one placed word to unblock the stuck word, and only commit when both
   * end up on the grid. This handles layouts where a word's usable letters
   * all got walled in — a failure no amount of extra grid space fixes.
   *
   * Returns the words that still couldn't be placed.
   *
   * @param swapEligible Which words may use the (expensive) swap escalation.
   */
  private rescuePass(
    unplaced: WordCluePair[],
    swapEligible: (word: string) => boolean,
  ): WordCluePair[] {
    let progress = true;

    while (progress && unplaced.length > 0) {
      progress = false;

      for (let i = 0; i < unplaced.length; ) {
        if (this.rescueWord(unplaced[i].word, unplaced[i].clue)) {
          unplaced.splice(i, 1);
          progress = true;
        } else {
          i++;
        }
      }

      if (!progress) {
        for (let i = 0; i < unplaced.length; ) {
          if (swapEligible(unplaced[i].word)
              && this.rescueWordWithSwap(unplaced[i].word, unplaced[i].clue)) {
            unplaced.splice(i, 1);
            progress = true;
          } else {
            i++;
          }
        }
      }
    }

    return unplaced;
  }

  /** Most removal candidates a swap rescue may try per stuck word. */
  private static readonly SWAP_RESCUE_ATTEMPTS = 60;

  /**
   * Swap rescue for one stuck word: walk placed words newest-first, and for
   * each that shares a letter with the stuck word, lift it off the grid,
   * try to place the stuck word, then put the lifted word back at its best
   * available spot. Both must succeed or everything is restored exactly.
   */
  private rescueWordWithSwap(word: string, clue: string): boolean {
    const letters = new Set(word.split(''));
    let attempts = 0;

    for (let i = this.wordLocations.length - 1; i >= 0; i--) {
      const candidate = this.wordLocations[i];
      if (!candidate.word.split('').some(c => letters.has(c))) {
        continue; // Removing it can't give the stuck word an anchor
      }
      if (attempts++ >= CrosswordGenerator.SWAP_RESCUE_ATTEMPTS) {
        return false;
      }

      const lifted = this.liftWord(i);

      if (this.placeAtBest(word, clue, null, null)) {
        // The lifted word goes back wherever fits best now.
        const gridForm = lifted.isReversed
          ? lifted.word.split('').reverse().join('')
          : lifted.word;
        if (this.placeAtBest(gridForm, lifted.clue, null, null)) {
          return true;
        }
        // Could not re-place the lifted word — undo the stuck word too
        this.liftWord(this.wordLocations.length - 1);
      }

      this.restoreWord(lifted);
    }

    return false;
  }

  /**
   * Remove a placed word from the grid and bookkeeping. Cells shared with
   * other placed words keep their letters. Returns the removed location so
   * it can be restored exactly.
   */
  private liftWord(index: number): DirectionalWord {
    const loc = this.wordLocations[index];
    this.wordLocations.splice(index, 1);

    for (let i = 0; i < loc.word.length; i++) {
      const x = loc.isHorizontal ? loc.x + i : loc.x;
      const y = loc.isHorizontal ? loc.y : loc.y + i;
      if (!this.isCellCoveredByPlacedWord(x, y)) {
        this.grid[y][x] = EMPTY_CELL;
      }
    }

    if (loc.isHorizontal) {
      this.horizontalCount--;
    } else {
      this.verticalCount--;
    }
    return loc;
  }

  /** Put a lifted word back exactly where it was. */
  private restoreWord(loc: DirectionalWord): void {
    const gridForm = loc.isReversed
      ? loc.word.split('').reverse().join('')
      : loc.word;

    for (let i = 0; i < gridForm.length; i++) {
      const x = loc.isHorizontal ? loc.x + i : loc.x;
      const y = loc.isHorizontal ? loc.y : loc.y + i;
      this.grid[y][x] = gridForm.charAt(i);
    }

    this.wordLocations.push(loc);
    if (loc.isHorizontal) {
      this.horizontalCount++;
    } else {
      this.verticalCount++;
    }
  }

  /** Whether any placed word covers the cell (x, y). */
  private isCellCoveredByPlacedWord(x: number, y: number): boolean {
    for (const loc of this.wordLocations) {
      if (loc.isHorizontal) {
        if (loc.y === y && x >= loc.x && x < loc.x + loc.word.length) {
          return true;
        }
      } else {
        if (loc.x === x && y >= loc.y && y < loc.y + loc.word.length) {
          return true;
        }
      }
    }
    return false;
  }

  /** Rescue one word: any direction, lean toward the less-used one. */
  private rescueWord(word: string, clue: string): boolean {
    const forms = [word];
    if (this.allowReverseWords) {
      const reversed = word.split('').reverse().join('');
      this.reversedWordsMap.set(reversed, word);
      forms.push(reversed);
    }

    const preferHorizontal = this.horizontalCount <= this.verticalCount;
    for (const form of forms) {
      if (this.placeAtBest(form, clue, null, preferHorizontal)) {
        return true;
      }
    }
    return false;
  }

  /** Place a word at its best-ranked legal spot. Returns false if none exists. */
  private placeAtBest(
    word: string,
    clue: string,
    direction: 'horizontal' | 'vertical' | null,
    preferHorizontal: boolean | null,
  ): boolean {
    const spot = this.findBestPlacement(word, direction, preferHorizontal);
    if (spot === null) {
      return false;
    }

    this.placeWord(word, clue, spot.x, spot.y, spot.horizontal);
    if (spot.horizontal) {
      this.horizontalCount++;
    } else {
      this.verticalCount++;
    }
    return true;
  }
}
