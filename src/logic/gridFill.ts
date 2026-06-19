/**
 * Fixed-grid fill solver for the skeleton-first ("build your own grid") flow.
 *
 * The classic generator GENERATES a layout: it decides where words go. Here the
 * grid GEOMETRY is already fixed (the user drew it; deriveSlotsFromBlockMask read
 * the slots back out). fillGrid solves the inverse problem: given fixed slots and
 * their crossings, fill them from a candidate word pool so that every crossing
 * holds the SAME letter in both words.
 *
 * It is a best-effort backtracking constraint solver, not an all-or-nothing one:
 * a user grid may be unsatisfiable from a given pool, so a slot that cannot be
 * filled is left blank (reported in unfilledSlotIds) instead of failing the whole
 * grid. A complete fill is always preferred when one is reachable within budget.
 *
 * Pure TypeScript - no DOM, no React, no Math.random/Date. Determinism: the same
 * (slots, intersections, pool, locked, includeWordBank, seed) always yields the
 * same result. The seed only breaks ties reproducibly (it perturbs candidate
 * order per slot); it never reaches for real randomness.
 */

import type { SkeletonSlot, WordCluePair } from './types';
import type { SlotIntersection } from './gridSkeleton';
import { getWordBankByExactLength } from './wordBank';
import { SeededRandom } from './seedRandom';

/**
 * Backtracking node budget. Each attempt to place one word into one slot counts
 * as a node. A pathological grid can have an enormous search space, so once the
 * budget is spent we stop and return the best (most-filled) partial assignment
 * found so far. 200k nodes is far more than a normal teacher grid needs (a full
 * 15x15 fills in a few thousand) yet caps worst-case work well under a second.
 */
const MAX_NODES = 200000;

/** A word placed into a slot, with the clue to show for it. */
type Assignment = { word: string; clue: string };

/** A candidate word plus the clue to carry if it is placed ('' for word-bank). */
interface Candidate {
  word: string;
  clue: string;
}

export function fillGrid(options: {
  /** Fixed slot geometry, e.g. from deriveSlotsFromBlockMask. */
  slots: SkeletonSlot[];
  /** Crossings between slots, e.g. from computeIntersections(slots). */
  intersections: SlotIntersection[];
  /** Candidate words (+clues) to draw from, best-first (earlier = preferred). */
  pool: WordCluePair[];
  /** Slots that MUST keep a given word (kept / placed user word). Locked always wins. */
  locked?: Map<number, { word: string; clue: string }>;
  /**
   * Preferred per-slot candidates (e.g. the AI's picks), best-first. Unlike
   * `locked`, these are SOFT: for each slot the solver tries its candidates
   * first, but may fall back to a later candidate (or the pool/bank) when an
   * earlier one cannot cross cleanly. This lets a single wrong AI pick be
   * replaced by an alternate instead of poisoning its crossings.
   */
  slotCandidates?: Map<number, WordCluePair[]>;
  /** Append the curated word bank as clue-less fallback fill when true. */
  includeWordBank?: boolean;
  /** Determinism seed; only breaks ties (perturbs per-slot candidate order). */
  seed?: number;
}): {
  /** slotId -> placed word (includes every locked word). */
  assignments: Map<number, Assignment>;
  /** Slots left blank because the pool/bank could not satisfy their crossings. */
  unfilledSlotIds: number[];
} {
  const { slots, pool, locked, includeWordBank = false, seed = 0 } = options;
  // intersections is part of the contract; crossings are enforced cell-by-cell
  // through the shared virtual grid below, so we do not need to index it here.
  void options.intersections;

  // Preferred per-slot candidates (AI picks), normalized once: lowercased,
  // deduped within a slot, clue preserved. Tried first by matchingCandidates.
  const prefsBySlot = new Map<number, Candidate[]>();
  if (options.slotCandidates) {
    for (const [slotId, list] of options.slotCandidates) {
      const seenPref = new Set<string>();
      const out: Candidate[] = [];
      for (const { word, clue } of list) {
        const w = word.toLowerCase();
        if (seenPref.has(w)) continue;
        seenPref.add(w);
        out.push({ word: w, clue });
      }
      if (out.length > 0) prefsBySlot.set(slotId, out);
    }
  }

  const assignments = new Map<number, Assignment>();
  if (slots.length === 0) return { assignments, unfilledSlotIds: [] };

  // --- Build candidate lists grouped by length -----------------------------
  // Pool words come first (best-first order preserved), then word-bank words as
  // clue-less fallback. Case-insensitive dedupe across BOTH sources: the first
  // occurrence of a word wins (so a pool word with a real clue beats the same
  // word from the bank). Words are stored lowercase - slots match lowercase.
  const candidatesByLength = new Map<number, Candidate[]>();
  const seenWords = new Set<string>();
  const addCandidate = (rawWord: string, clue: string) => {
    const word = rawWord.toLowerCase();
    if (seenWords.has(word)) return;
    seenWords.add(word);
    const list = candidatesByLength.get(word.length);
    if (list) list.push({ word, clue });
    else candidatesByLength.set(word.length, [{ word, clue }]);
  };
  for (const entry of pool) addCandidate(entry.word, entry.clue);
  if (includeWordBank) {
    // Only the lengths we actually need; bank words carry no clue (filled later).
    const neededLengths = new Set(slots.map(s => s.length));
    for (const length of neededLengths) {
      for (const word of getWordBankByExactLength(length)) addCandidate(word, '');
    }
  }

  // --- Virtual letter grid -------------------------------------------------
  // "x,y" -> the letter currently committed at that cell. A slot reads its
  // pattern from this grid (constrained positions) and writes its letters here
  // on placement; crossing slots therefore see each other through shared cells,
  // which is exactly what enforces every intersection without a separate index.
  const letters = new Map<string, string>();
  const cellKey = (slot: SkeletonSlot, i: number): string => {
    const x = slot.direction === 'across' ? slot.startX + i : slot.startX;
    const y = slot.direction === 'across' ? slot.startY : slot.startY + i;
    return x + ',' + y;
  };
  const usedWords = new Set<string>();

  // --- 1. Place locked words ----------------------------------------------
  // Locked words always appear in the result, verbatim. We also paint their
  // letters into the virtual grid so pool fills cross them correctly. On a
  // locked-vs-locked disagreement at a shared cell the first writer wins (slots
  // iterated in id order for determinism); the conflicting locked word stays in
  // assignments regardless - locked always wins - and any pool slot crossing
  // that cell simply works around whatever letter is committed there.
  const lockedSlotIds = new Set<number>();
  if (locked && locked.size > 0) {
    const lockedSlots = slots
      .filter(s => locked.has(s.id))
      .sort((a, b) => a.id - b.id);
    for (const slot of lockedSlots) {
      const placed = locked.get(slot.id)!;
      assignments.set(slot.id, { word: placed.word, clue: placed.clue });
      lockedSlotIds.add(slot.id);
      usedWords.add(placed.word.toLowerCase());
      const w = placed.word.toLowerCase();
      for (let i = 0; i < w.length && i < slot.length; i++) {
        const key = cellKey(slot, i);
        if (!letters.has(key)) letters.set(key, w[i]);
      }
    }
  }

  // --- Pattern matching helpers -------------------------------------------
  // A candidate fits a slot when its length matches AND every already-committed
  // cell in the virtual grid agrees with the candidate letter at that position.
  const candidateFits = (slot: SkeletonSlot, word: string): boolean => {
    if (word.length !== slot.length) return false;
    for (let i = 0; i < slot.length; i++) {
      const committed = letters.get(cellKey(slot, i));
      if (committed !== undefined && committed !== word[i]) return false;
    }
    return true;
  };

  // Candidates of the right length that fit the slot now and are unused. The
  // base list keeps best-first pool order; a per-slot seeded shuffle then breaks
  // ties reproducibly so fills do not all cluster on the same early words while
  // staying deterministic for a given seed.
  const matchingCandidates = (slot: SkeletonSlot): Candidate[] => {
    const base = candidatesByLength.get(slot.length) ?? [];
    const prefs = prefsBySlot.get(slot.id);

    if (!prefs || prefs.length === 0) {
      // No per-slot preferences: original behavior, unchanged (seeded shuffle).
      const fitting = base.filter(c => !usedWords.has(c.word) && candidateFits(slot, c.word));
      if (seed !== 0 && fitting.length > 1) {
        // Stable, slot-scoped perturbation: same seed + slot id => same order.
        const rng = new SeededRandom((seed * 2654435761 + slot.id) | 0);
        rng.shuffle(fitting);
      }
      return fitting;
    }

    // Preferences first, IN ORDER (best-first, never shuffled), then the rest of
    // the fitting pool/bank words with a stable seeded shuffle. A pref word that
    // also appears in the base list is kept only once (the pref carries its clue).
    const chosen = new Set<string>();
    const front: Candidate[] = [];
    for (const c of prefs) {
      if (!usedWords.has(c.word) && !chosen.has(c.word) && candidateFits(slot, c.word)) {
        chosen.add(c.word);
        front.push(c);
      }
    }
    const rest = base.filter(
      c => !usedWords.has(c.word) && !chosen.has(c.word) && candidateFits(slot, c.word),
    );
    if (seed !== 0 && rest.length > 1) {
      const rng = new SeededRandom((seed * 2654435761 + slot.id) | 0);
      rng.shuffle(rest);
    }
    return [...front, ...rest];
  };

  // How constrained a slot is right now: fewer fitting candidates = fill sooner.
  const candidateCount = (slot: SkeletonSlot): number => matchingCandidates(slot).length;
  const lockedPositionCount = (slot: SkeletonSlot): number => {
    let n = 0;
    for (let i = 0; i < slot.length; i++) if (letters.has(cellKey(slot, i))) n++;
    return n;
  };

  // --- 2/3/4. Backtracking fill over the non-locked slots -----------------
  // We search depth-first, always expanding the MOST-CONSTRAINED unassigned slot
  // (fewest fitting candidates; ties: more locked positions, then longer, then
  // smaller id). At each slot we try its fitting candidates in order, committing
  // letters and recursing, undoing on backtrack. If a slot has no candidate it
  // is left blank (best-effort) and the search proceeds to the rest - an empty
  // slot never blocks its crossings. We remember the best (most-filled) leaf and
  // stop early on a full fill or when the node budget is spent.
  const fillable = slots.filter(s => !lockedSlotIds.has(s.id));
  const chosen = new Map<number, Candidate>(); // current path: slotId -> candidate
  let bestChosen = new Map<number, Candidate>(); // best leaf so far
  let nodes = 0;

  const writeWord = (slot: SkeletonSlot, word: string) => {
    for (let i = 0; i < slot.length; i++) letters.set(cellKey(slot, i), word[i]);
  };
  const eraseWord = (slot: SkeletonSlot, restore: (string | undefined)[]) => {
    for (let i = 0; i < slot.length; i++) {
      const key = cellKey(slot, i);
      const prev = restore[i];
      if (prev === undefined) letters.delete(key);
      else letters.set(key, prev);
    }
  };

  const decided = new Set<number>(); // slots that are chosen OR deliberately skipped

  // Pick the most-constrained still-undecided fillable slot, or null if none.
  const pickNextSlot = (): SkeletonSlot | null => {
    let best: SkeletonSlot | null = null;
    let bestKey: [number, number, number, number] | null = null;
    for (const slot of fillable) {
      if (decided.has(slot.id)) continue;
      // Sort key: fewer candidates, then MORE locked positions, then LONGER,
      // then smaller id. All comparisons are deterministic.
      const key: [number, number, number, number] = [
        candidateCount(slot),
        -lockedPositionCount(slot),
        -slot.length,
        slot.id,
      ];
      if (bestKey === null || lexLess(key, bestKey)) {
        best = slot;
        bestKey = key;
      }
    }
    return best;
  };

  const search = (): boolean => {
    // Record the best (most-filled) leaf seen on any path.
    if (chosen.size > bestChosen.size) bestChosen = new Map(chosen);
    if (chosen.size === fillable.length) return true; // everything filled - done
    if (nodes >= MAX_NODES) return false; // budget spent - keep best partial

    const slot = pickNextSlot();
    if (!slot) return chosen.size === fillable.length;

    // Branch 1: try each fitting candidate, best-first.
    for (const cand of matchingCandidates(slot)) {
      nodes++;
      const restore = Array.from({ length: slot.length }, (_, i) => letters.get(cellKey(slot, i)));
      writeWord(slot, cand.word);
      chosen.set(slot.id, cand);
      usedWords.add(cand.word);
      decided.add(slot.id);
      if (search()) return true;
      // backtrack
      decided.delete(slot.id);
      usedWords.delete(cand.word);
      chosen.delete(slot.id);
      eraseWord(slot, restore);
      if (nodes >= MAX_NODES) break;
    }

    // Branch 2: leave this slot blank and continue (best-effort partial fill).
    decided.add(slot.id);
    const done = search();
    decided.delete(slot.id);
    return done;
  };

  search();

  // --- 5. Assemble result --------------------------------------------------
  // Locked words are already in assignments; add the best fill found. Any
  // fillable slot still without a word is reported unfilled (sorted, unique).
  for (const [slotId, cand] of bestChosen) {
    assignments.set(slotId, { word: cand.word, clue: cand.clue });
  }
  const unfilledSlotIds = slots
    .map(s => s.id)
    .filter(id => !assignments.has(id))
    .sort((a, b) => a - b);

  return { assignments, unfilledSlotIds };
}

/** Lexicographic less-than over equal-length numeric tuples (for slot ordering). */
function lexLess(a: readonly number[], b: readonly number[]): boolean {
  for (let i = 0; i < a.length; i++) {
    if (a[i] < b[i]) return true;
    if (a[i] > b[i]) return false;
  }
  return false;
}
