/**
 * Slot-aware AI fill prompt + parser for the skeleton-first ("build your own
 * grid") flow.
 *
 * The AI Words tab (src/utils/wordListPrompt.ts) asks for a FLAT list of words
 * — the generator then decides where they go. This flow is the opposite: the
 * user already drew the grid, so the geometry is FIXED. Every answer must fit
 * one specific slot exactly (right length, agreeing with any locked cells and
 * with the letters its crossings impose). So this prompt addresses each empty
 * slot by its crossword number + direction ("4-DOWN: ...") and the parser maps
 * labeled answer lines back onto those slots, validating the fit.
 *
 * Like the rest of the AI helpers this is pure copy-paste: it builds a prompt
 * the teacher pastes into any AI assistant, and parses what comes back. Zero
 * network calls. Pure TypeScript — no DOM, no React.
 *
 * The prompt and parser are two halves of one contract (mirroring the
 * wordListPrompt design): the prompt demands a fenced block of
 * "{id}-{ACROSS|DOWN}: WORD | Clue" lines; the parser targets exactly that
 * while tolerating the usual AI deviations (numbering, bullets, bold, missing
 * fences). Shared building blocks (charset wording, fence finder, word
 * cleaner, list-marker regex) are reused from wordListPrompt.ts so the two
 * stay in lockstep; rules that live inline inside buildWordListPrompt are
 * replicated verbatim here with `// mirrors wordListPrompt.ts:NN` markers.
 *
 * Letter-index convention: crossings are described to the human with 1-based
 * letter positions ("at letter 3" = the third letter). Internally SkeletonSlot
 * constraints and SlotIntersection positions are 0-based; the +1 happens only
 * in the emitted text.
 */

import type { SkeletonSlot, WordCluePair } from '../logic/types';
import type { SlotIntersection } from '../logic/gridSkeleton';
import {
  DEFAULT_LANGUAGE,
  getLanguageInfo,
  toGridWord,
  wordCharsetRegex,
  type PuzzleLanguage,
} from '../logic/language';
import { slotPattern } from './aiPromptBuilder';
import {
  charsetLines,
  findBestFencedBlock,
  cleanWord,
  LIST_MARKER,
  type ParseIssue,
} from './wordListPrompt';
import { solveSkeletonFill, gridFromPlacedSlots } from '../logic/skeletonAiFill';

const EMPTY_CELL = '-';

/** ACROSS / DOWN as it appears in labels, from a slot direction. */
function dirLabel(direction: 'across' | 'down'): 'ACROSS' | 'DOWN' {
  return direction === 'across' ? 'ACROSS' : 'DOWN';
}

/** Build a slot's locked-letter constraint map by reading the grid cells. */
function constraintsFromGrid(slot: SkeletonSlot, grid: string[][]): Map<number, string> {
  const constraints = new Map<number, string>();
  for (let pos = 0; pos < slot.length; pos++) {
    const x = slot.direction === 'across' ? slot.startX + pos : slot.startX;
    const y = slot.direction === 'across' ? slot.startY : slot.startY + pos;
    const cell = grid[y]?.[x];
    if (cell && cell !== EMPTY_CELL) {
      constraints.set(pos, cell.toLowerCase());
    }
  }
  return constraints;
}

/* ── Prompt builder ───────────────────────────────────────────────────── */

export function buildSkeletonFillPrompt(options: {
  slots: SkeletonSlot[];
  intersections: SlotIntersection[];
  width: number;
  height: number;
  /** '-' = empty cell; a letter = locked (a crossing) or kept (already placed). */
  grid: string[][];
  context: string;
  language?: PuzzleLanguage;
  allowTwoWords?: boolean;
  allowProperNouns?: boolean;
  /** Append the optional spare-pool tail so the human/solver has fallbacks. */
  solverAssist?: boolean;
}): string {
  const {
    slots,
    intersections,
    width,
    height,
    grid,
    context,
  } = options;
  const language = options.language ?? DEFAULT_LANGUAGE;
  const allowTwoWords = options.allowTwoWords ?? false;
  const allowProperNouns = options.allowProperNouns ?? false;
  const solverAssist = options.solverAssist ?? false;
  const languageLabel = getLanguageInfo(language).label;

  // An empty slot is one with no placed word — these are what we ask for.
  // A slot's word can be set even if its cells aren't all written into the
  // grid yet, so split on slot.word, not on grid contents.
  const emptySlots = slots.filter(slot => !slot.word);
  const filledSlots = slots.filter(slot => slot.word);

  const lines: string[] = [];

  // 1 — Parameters / requirements block
  lines.push('I am building a crossword from a grid I already laid out. Fill the blank slots below with words and clues that fit the grid exactly.');
  lines.push('');
  lines.push('REQUIREMENTS');
  lines.push(`- Language: ${languageLabel}. Every word and every clue must be written in ${languageLabel}.`);
  // The two fit rules are the whole point of slot-aware fill: exact length
  // (including pre-filled locked letters) and correct crossings.
  lines.push('- Each word must fit its slot EXACTLY: the right number of letters, and every locked letter (a capital letter already shown in the pattern) must stay in place.');
  lines.push('- Where two slots cross, the shared cell is ONE letter — your across word and your down word must use the SAME letter there. Crossings are listed per slot below.');
  lines.push(...charsetLines(language));
  if (allowTwoWords) {
    // mirrors the two-word block in wordListPrompt.ts
    lines.push('- Prefer single words. A two-word phrase is allowed when it is the natural term — for at most a third of the entries.');
    lines.push('- Write a two-word phrase with one underscore joining the words: "EXTRA_TIME". No spaces, no hyphens, no other join symbols. The underscore is not a letter — EXTRA_TIME must fit the grid as EXTRATIME (9 letters).');
    lines.push('- A two-word phrase MUST keep the underscore: write CARBON_DIOXIDE, never CARBONDIOXIDE. Two words run together with no underscore read as one word and get mislabeled — never merge two words without it.');
  } else {
    // mirrors the single-word block in wordListPrompt.ts
    lines.push('- Each entry must be a single word — no spaces, no hyphens, no underscores, no multi-word phrases. "goalkeeper" is correct; "goal keeper", "goal-keeper", and "goal_keeper" are not.');
    lines.push('- Never combine two separate words into one entry — not with a symbol and not by running them together. "carbon dioxide" must not become CARBONDIOXIDE, "ice cream" must not become ICECREAM, "gas giant" must not become GASGIANT. If a term only works as a phrase, choose a different single-word term instead. (A genuine single-word compound like "sunflower" or "rainbow" is still fine.)');
  }
  if (!allowProperNouns) {
    // mirrors wordListPrompt.ts:204
    lines.push('- No proper nouns unless they are directly relevant to the topic.');
  }
  // mirrors wordListPrompt.ts:207
  lines.push('- Each clue: one sentence, at most 12 words, classroom-appropriate, and it must not contain the answer word or any form of it.');
  lines.push('');

  // 2 — Topic context (verbatim, fenced) — mirrors wordListPrompt.ts:214-216
  lines.push('===BEGIN TOPIC CONTEXT===');
  lines.push(context.trim() || '(no specific topic — choose useful general-vocabulary words)');
  lines.push('===END TOPIC CONTEXT===');
  lines.push('');

  // 3 — The grid as ASCII: '#' = block (a cell in no slot), '.' = empty slot
  // cell, a letter = locked/kept. Lets the AI see the shape at a glance.
  lines.push('THE GRID');
  lines.push('Legend: # = blocked square (not part of any word), . = empty cell to fill, a letter = already fixed.');
  lines.push('');
  for (const row of asciiGrid(slots, grid, width, height)) {
    lines.push(row);
  }
  lines.push('');

  // 4 — Slots to fill. One line per empty slot, with its pattern and every
  // crossing it makes (1-based letter index, for a human).
  lines.push('SLOTS TO FILL');
  lines.push('Patterns: each symbol is one cell — an underscore is any letter, a capital letter is already fixed and must stay. Positions are counted from the start, so letter 1 is the first cell.');
  lines.push('');
  for (const slot of emptySlots) {
    const constraints = constraintsFromGrid(slot, grid);
    let line = `${slot.id}-${dirLabel(slot.direction)}: ${slot.length} letters, pattern ${slotPattern(slot, constraints)}`;
    const crossings = crossingsForSlot(slot, slots, intersections);
    for (const c of crossings) {
      // 1-based letter index for the human (myPos is 0-based).
      line += ` — crosses ${c.otherId}-${c.otherDir} at letter ${c.myPos + 1}`;
    }
    lines.push(line);
  }
  lines.push('');

  // 5 — Already placed slots (do not change). Only emitted when some exist.
  if (filledSlots.length > 0) {
    lines.push('ALREADY PLACED');
    lines.push('These slots are already filled — do not change them; just make your words cross them correctly.');
    lines.push('');
    for (const slot of filledSlots) {
      const display = (slot.displayWord ?? slot.word ?? '').toUpperCase();
      lines.push(`${slot.id}-${dirLabel(slot.direction)}: ${display}`);
    }
    lines.push('');
  }

  // 6 — Output format (the parser targets this exactly).
  const caps = language === 'spanish'
    ? 'ALL CAPS using only the letters A-Z, Á É Í Ó Ú Ü Ñ, and digits'
    : 'ALL CAPS using only the letters A-Z and digits';
  lines.push('OUTPUT FORMAT');
  lines.push('Respond with ONLY a fenced code block. Each line is:');
  lines.push('');
  lines.push('{id}-{ACROSS or DOWN}: WORD | Clue text');
  lines.push('');
  lines.push(`Rules: the label must match a slot above, WORD in ${caps}, a single pipe (|) before the clue, clue in sentence case.`);
  // Multiple candidates per slot: the parser collects every valid labeled line,
  // and a fallback solver picks whichever set crosses cleanly — so a single bad
  // pick can be swapped for an alternate instead of breaking its crossings.
  lines.push(`Give 2 or 3 DIFFERENT options for EACH blank slot, best first — one option per line, all reusing that slot's label (same id and direction). Every option must be the right length and respect the slot's locked letters and crossings. List a slot's options together (best first), then move to the next slot. Cover all ${emptySlots.length} blank slots. No blank lines, no numbering, no text outside the code block.`);

  if (solverAssist) {
    // Optional spare pool: a few extra unlabeled words of the lengths that
    // appear in the grid, so a fallback solver has alternatives if a labeled
    // pick conflicts. Listed AFTER the labeled lines, with no slot label.
    const lengths = distinctSlotLengths(emptySlots);
    lines.push(`Then you MAY add up to 12 EXTRA spare words (no slot label, just WORD | Clue) with lengths among {${lengths.join(', ')}}, in case one of the picks above does not cross cleanly.`);
  }
  lines.push('');

  // 7 — Worked example: two options per slot (same label), best first.
  lines.push('Example format (do not copy these words):');
  lines.push('```');
  lines.push('3-ACROSS: PLANET | A world that orbits a star.');
  lines.push('3-ACROSS: PLASMA | A hot, charged state of matter.');
  lines.push('5-DOWN: ORBIT | The path one body takes around another.');
  lines.push('5-DOWN: COMET | An icy body with a glowing tail.');
  if (allowTwoWords) {
    lines.push('7-ACROSS: SOLAR_FLARE | A burst of energy from the sun.');
  }
  if (solverAssist) {
    lines.push('NEBULA | A vast cloud of gas and dust.');
  }
  lines.push('```');
  lines.push('');

  // 8 — Closing — mirrors wordListPrompt.ts:286
  lines.push('Respond with the code block only. Nothing else.');

  return lines.join('\n');
}

/**
 * Render the grid as ASCII rows. A cell is:
 *  - a letter, if the grid holds one (locked crossing / already-placed word);
 *  - '.', if it's an empty cell that belongs to at least one slot;
 *  - '#', otherwise (a block / stray — not part of any word).
 */
function asciiGrid(
  slots: SkeletonSlot[],
  grid: string[][],
  width: number,
  height: number,
): string[] {
  // Mark every cell that any slot covers, so non-slot cells render as blocks.
  const inSlot: boolean[][] = Array.from({ length: height }, () =>
    new Array<boolean>(width).fill(false),
  );
  for (const slot of slots) {
    for (let pos = 0; pos < slot.length; pos++) {
      const x = slot.direction === 'across' ? slot.startX + pos : slot.startX;
      const y = slot.direction === 'across' ? slot.startY : slot.startY + pos;
      if (y >= 0 && y < height && x >= 0 && x < width) inSlot[y][x] = true;
    }
  }

  const rows: string[] = [];
  for (let y = 0; y < height; y++) {
    let row = '';
    for (let x = 0; x < width; x++) {
      const cell = grid[y]?.[x];
      if (cell && cell !== EMPTY_CELL) {
        row += cell.toUpperCase();
      } else if (inSlot[y][x]) {
        row += '.';
      } else {
        row += '#';
      }
    }
    rows.push(row);
  }
  return rows;
}

/**
 * For a slot, the crossings it participates in, described from ITS point of
 * view: the partner slot's id + direction, this slot's 0-based letter position
 * at the shared cell, and the partner's 0-based position there.
 */
interface SlotCrossing {
  otherId: number;
  otherDir: 'ACROSS' | 'DOWN';
  myPos: number;
  otherPos: number;
}

function crossingsForSlot(
  slot: SkeletonSlot,
  slots: SkeletonSlot[],
  intersections: SlotIntersection[],
): SlotCrossing[] {
  const out: SlotCrossing[] = [];
  for (const cross of intersections) {
    if (slot.direction === 'across' && cross.acrossSlotId === slot.id) {
      out.push({
        otherId: cross.downSlotId,
        otherDir: 'DOWN',
        myPos: cross.acrossPos,
        otherPos: cross.downPos,
      });
    } else if (slot.direction === 'down' && cross.downSlotId === slot.id) {
      out.push({
        otherId: cross.acrossSlotId,
        otherDir: 'ACROSS',
        myPos: cross.downPos,
        otherPos: cross.acrossPos,
      });
    }
  }
  // `slots` is accepted for symmetry / future per-partner detail; not needed
  // beyond the ids the intersection already carries.
  void slots;
  return out;
}

/** Distinct slot lengths, ascending — used by the solver-assist tail. */
function distinctSlotLengths(slots: SkeletonSlot[]): number[] {
  return [...new Set(slots.map(s => s.length))].sort((a, b) => a - b);
}

/* ── Response parser ──────────────────────────────────────────────────── */

export interface SkeletonFillParse {
  /** slot id -> the word + clue accepted for it (the FIRST valid pick per slot). */
  assignments: Map<number, { word: string; clue: string }>;
  /**
   * slot id -> ALL valid words the AI offered for that slot, best-first
   * (length / locked-letter / charset valid). The first entry mirrors
   * `assignments`; later entries are alternates the solver can fall back to
   * when the first does not cross cleanly. Multiple labeled lines with the same
   * slot label populate this (alternates never raise a parse issue).
   */
  slotCandidates: Map<number, WordCluePair[]>;
  /** Unlabeled "WORD | clue" lines — spare suggestions, not tied to a slot. */
  pool: WordCluePair[];
  issues: ParseIssue[];
  /**
   * Lengths the model flagged as scarce in the flat-pool format's `# NOTES`
   * block (`SHORT_LENGTHS: 3, 8`). Empty when there is no NOTES block or the
   * value is `none`. Surfaced so a future view can warn about under-supplied
   * slot lengths. Does not affect parsing of the words themselves.
   */
  shortLengths: number[];
  /**
   * The free-text `COMMENT:` from the flat-pool `# NOTES` block, trimmed. Empty
   * string when absent or when the value is exactly `none`.
   */
  comment: string;
}

/**
 * Does this clue mark its word as an INTENTIONAL omission by the model, rather
 * than a real answer? Real models (Claude Sonnet especially) emit "omission
 * cruft" — `WORD | None — misspelled, omitted.`, `WORD | ` (empty), `WORD |
 * Not 7 letters — omitted.`, etc. — for words they decided to discard. Such a
 * line must be DROPPED silently (no pool entry, no parse issue): it is the
 * model telling us "skip this", not a usable word.
 *
 * Patterns are deliberately TIGHT so a normal descriptive clue never matches —
 * real clues are ordinary sentences ("A desert mammal with humps."). Pure
 * helper, exported so it can be unit-tested in isolation if needed.
 */
export function isDiscardedClue(clue: string): boolean {
  const c = clue.trim().toLowerCase();
  if (c.length === 0) return true; // empty / whitespace-only clue
  if (c === 'none') return true; // exactly "none"
  if (c.startsWith('none')) return true; // "none — ...", "none-...", "none ..."
  if (c.startsWith('not a real word')) return true;
  if (/^not \d+ letters/.test(c)) return true; // "not 7 letters ..."
  if (c.startsWith('too long') || c.startsWith('too short')) return true;
  // Discard markers anywhere in the clue.
  if (c.includes('omitted') || c.includes('removed') || c.includes('moved below')) return true;
  return false;
}

/**
 * Parse a `SHORT_LENGTHS:` value (the text after the colon) into integers.
 * Tokens are split on commas/whitespace; non-numeric tokens are ignored. The
 * literal `none` (any case, even with surrounding text) yields an empty list.
 */
function parseShortLengths(value: string): number[] {
  if (/\bnone\b/i.test(value)) return [];
  const out: number[] = [];
  for (const token of value.split(/[\s,]+/)) {
    if (/^\d+$/.test(token)) out.push(parseInt(token, 10));
  }
  return out;
}

/**
 * A line that begins with a slot label, e.g. "4-DOWN: WORD | clue".
 *
 * The canonical form is "{id}-{ACROSS|DOWN}:" but models drift, so this
 * tolerates the common variants. The id and direction land in named groups
 * (n1/d1 for number-first, n2/d2 for direction-first); readSlotLabel coalesces
 * whichever ordering matched. Accepted drift:
 *   - either order: "2-ACROSS:" / "ACROSS 2:" / "2 ACROSS:" / "Across 2:"
 *   - the number optionally wrapped: "{2}-ACROSS:" / "(2) ACROSS:"
 *   - "-" OR whitespace between number and direction (or just the wrap)
 *   - any case for ACROSS / DOWN (the `i` flag)
 * The label always ends in a colon, so the FIRST colon terminates it; the
 * word/clue separator is found in the remainder after this is stripped.
 */
const SLOT_LABEL = new RegExp(
  '^\\**\\s*(?:' +
    // number first: "2-ACROSS", "2 ACROSS", "{2}-ACROSS", "(2) ACROSS"
    '[{(]?\\s*(?<n1>\\d{1,4})\\s*[)}]?\\s*[-\\s]\\s*(?<d1>across|down)' +
    '|' +
    // direction first: "ACROSS 2", "Across 2"
    '(?<d2>across|down)\\s*[-\\s]\\s*[{(]?\\s*(?<n2>\\d{1,4})\\s*[)}]?' +
    ')\\**\\s*:\\s*',
  'i',
);

/**
 * The flat-pool format's machine-readable footer header. Once a line matching
 * this is seen, the parser is in NOTES MODE: no further line may become a word,
 * and `SHORT_LENGTHS:` / `COMMENT:` are extracted instead. Matches `# NOTES`,
 * `#NOTES`, `# notes` (any case). A line starting with `#` that is NOT this is
 * an ordinary section header (e.g. `# 5 letters`) and is simply skipped.
 */
const NOTES_HEADER = /^#\s*notes\b/i;

/** Pull the slot id + direction out of a SLOT_LABEL match (either ordering). */
function readSlotLabel(match: RegExpMatchArray): { id: number; direction: 'across' | 'down' } {
  const groups = match.groups ?? {};
  const id = parseInt(groups.n1 ?? groups.n2 ?? '', 10);
  const dirWord = (groups.d1 ?? groups.d2 ?? '').toLowerCase();
  return { id, direction: dirWord === 'across' ? 'across' : 'down' };
}

/**
 * The characters/strings a model may use as the word↔clue separator. The prompt
 * still asks for "|"; this is purely additive tolerance. We split on the FIRST
 * separator that appears AFTER the first whitespace-delimited word token, so a
 * dash/colon LATER inside the clue is never mistaken for the separator. (Words
 * here are single tokens with no internal spaces, so "first separator after the
 * first token" is safe.)
 *
 * Returns { word, clue } — clue is everything after that first separator — or
 * null when no separator is found (the caller reports "missing clue").
 */
function splitWordClue(rest: string): { word: string; clue: string } | null {
  // Skip the leading word token, then look for the first separator at or after
  // its end (a spaced hyphen is " - "). The token is the leading run of chars
  // that are neither whitespace nor a single-char separator, so a separator
  // glued to the word with no space (e.g. "PLANT:") is still found.
  const wordTokenMatch = rest.match(/^\s*[^\s|—–:]+/);
  const searchFrom = wordTokenMatch ? wordTokenMatch[0].length : 0;

  let bestIndex = -1;
  let sepLength = 1;
  // Single-char separators: pipe, em-dash, en-dash, colon.
  for (const sep of ['|', '—', '–', ':']) {
    const idx = rest.indexOf(sep, searchFrom);
    if (idx !== -1 && (bestIndex === -1 || idx < bestIndex)) {
      bestIndex = idx;
      sepLength = 1;
    }
  }
  // Spaced hyphen " - " (a bare "-" is left alone so hyphenated words survive).
  const spacedHyphen = rest.indexOf(' - ', searchFrom);
  if (spacedHyphen !== -1 && (bestIndex === -1 || spacedHyphen < bestIndex)) {
    bestIndex = spacedHyphen;
    sepLength = 3;
  }

  if (bestIndex === -1) return null;
  return {
    word: rest.slice(0, bestIndex),
    clue: rest.slice(bestIndex + sepLength),
  };
}

/**
 * Strip a trailing length hint — "(5)" or "[5]" — that crossword-trained models
 * append to the answer, e.g. "PLANT (5)" -> "PLANT". Only a PURELY numeric
 * parenthetical at the very END of the word token is removed; parentheses
 * elsewhere are left intact.
 */
function stripLengthHint(wordToken: string): string {
  return wordToken.replace(/\s*[([]\d+[)\]]\s*$/, '').trim();
}

export function parseSkeletonFillResponse(
  text: string,
  options: {
    slots: SkeletonSlot[];
    intersections: SlotIntersection[];
    /** '-' = empty; a letter locks that cell (a crossing / kept word). */
    grid?: string[][];
    language?: PuzzleLanguage;
    allowTwoWords?: boolean;
  },
): SkeletonFillParse {
  const result: SkeletonFillParse = {
    assignments: new Map(),
    slotCandidates: new Map(),
    pool: [],
    issues: [],
    shortLengths: [],
    comment: '',
  };
  if (!text.trim()) return result;

  const { slots } = options;
  const language = options.language ?? DEFAULT_LANGUAGE;
  const allowTwoWords = options.allowTwoWords ?? false;
  const grid = options.grid;
  const charset = wordCharsetRegex({ language, allowTwoWords });

  const slotsById = new Map<number, SkeletonSlot>();
  for (const slot of slots) slotsById.set(slot.id, slot);

  // Find the densest fenced block (a labeled or pipe line counts); fall back
  // to lenient whole-text scanning when the AI omitted the fence.
  const looksLikeEntry = (line: string): boolean =>
    SLOT_LABEL.test(line.replace(LIST_MARKER, '')) || line.includes('|');
  const block = findBestFencedBlock(text, looksLikeEntry);
  const lenient = block === null;
  const body = block?.content ?? text;
  const lineOffset = block?.startLine ?? 0;

  // Case-insensitive dedupe across everything we accept (assignments + pool),
  // keeping the first occurrence — same policy as the word-list parser.
  const seen = new Set<string>();
  // Letters we've committed at each cell, so a later crossing answer can be
  // checked against an earlier accepted one. Keyed "x,y".
  const committed = new Map<string, string>();

  // Flat-pool format: once the `# NOTES` header is seen, NO further line may
  // become a word — we only mine SHORT_LENGTHS / COMMENT out of the tail.
  let notesMode = false;

  const linesArr = body.split('\n');
  for (let i = 0; i < linesArr.length; i++) {
    const lineNumber = lineOffset + i + 1;
    const rawLine = linesArr[i];
    const line = rawLine.replace(LIST_MARKER, '').trim();
    if (line.length === 0) continue;

    // NOTES mode (flat-pool footer): never a word. Pull SHORT_LENGTHS / COMMENT;
    // ignore everything else (including a stray `WORD | clue` after the footer).
    if (notesMode) {
      const colon = line.indexOf(':');
      if (colon !== -1) {
        const key = line.slice(0, colon).trim().toLowerCase();
        const value = line.slice(colon + 1).trim();
        if (key === 'short_lengths') {
          result.shortLengths = parseShortLengths(value);
        } else if (key === 'comment') {
          result.comment = /^none$/i.test(value) ? '' : value;
        }
      }
      continue;
    }

    // A `#`-prefixed line is a section header, not a word. The NOTES header
    // switches us into NOTES mode; any other header (e.g. `# 5 letters`) is
    // skipped. (LIST_MARKER never strips `#`, so this `#` is the real lead.)
    if (line.startsWith('#')) {
      if (NOTES_HEADER.test(line)) notesMode = true;
      continue;
    }

    const labelMatch = line.match(SLOT_LABEL);

    if (!labelMatch) {
      // Unlabeled line. If it has a pipe it's a spare-pool entry; otherwise
      // it's prose — skip silently when lenient, report inside a real fence.
      const pipeIndex = line.indexOf('|');
      if (pipeIndex === -1) {
        if (!lenient) {
          result.issues.push({
            line: lineNumber,
            text: truncate(rawLine),
            message: `Line ${lineNumber} couldn't be read — expected: {id}-ACROSS or {id}-DOWN: WORD | Clue`,
          });
        }
        continue;
      }
      const rawClue = line.slice(pipeIndex + 1);
      // Omission cruft: the model marked this word as discarded (empty clue,
      // "None — omitted.", "Not 7 letters", etc.). Drop it silently — it is an
      // intentional omission, not a usable word and not a parse error.
      if (isDiscardedClue(rawClue)) continue;
      const word = cleanWord(stripLengthHint(line.slice(0, pipeIndex)), allowTwoWords);
      const clue = cleanClue(rawClue);
      if (!charset.test(word) || toGridWord(word).length < 2) {
        if (!lenient) {
          result.issues.push({
            line: lineNumber,
            text: truncate(rawLine),
            message: `Line ${lineNumber}: "${truncate(word) || '(empty)'}" isn't a usable word — letters and digits only, no symbols`,
          });
        }
        continue;
      }
      if (seen.has(word.toLowerCase())) continue; // dup spare: drop quietly
      seen.add(word.toLowerCase());
      result.pool.push({ word, clue });
      continue;
    }

    // Labeled line: parse id + direction (tolerating label drift).
    const { id, direction } = readSlotLabel(labelMatch);
    const rest = line.slice(labelMatch[0].length);

    const slot = slotsById.get(id);
    if (!slot || slot.direction !== direction) {
      result.issues.push({
        line: lineNumber,
        text: truncate(rawLine),
        message: `Line ${lineNumber}: ${id}-${direction.toUpperCase()} is not a blank slot in this grid`,
      });
      continue;
    }

    // Split WORD from clue on the first separator after the word token. The
    // prompt asks for "|"; we also accept em/en-dash, a spaced hyphen, and a
    // colon (the label's own colon was already consumed above).
    const split = splitWordClue(rest);
    if (split === null) {
      result.issues.push({
        line: lineNumber,
        text: truncate(rawLine),
        message: `Line ${lineNumber}: ${id}-${direction.toUpperCase()} is missing its clue after the pipe`,
      });
      continue;
    }
    const word = cleanWord(stripLengthHint(split.word), allowTwoWords);
    const clue = cleanClue(split.clue);
    const gridForm = toGridWord(word);

    // Validation order (per design §8): length -> locked grid letters ->
    // charset -> two-word -> cross-agreement with already-accepted slots.

    // 1 — length
    if (gridForm.length !== slot.length) {
      result.issues.push({
        line: lineNumber,
        text: truncate(rawLine),
        message: `Line ${lineNumber}: "${word}" is the wrong length — ${gridForm.length} letters, but ${id}-${direction.toUpperCase()} needs exactly ${slot.length}`,
      });
      continue;
    }

    // 2 — locked grid letters (pre-filled cells must match)
    const lockedConflict = grid ? findLockedConflict(slot, gridForm, grid) : null;
    if (lockedConflict !== null) {
      result.issues.push({
        line: lineNumber,
        text: truncate(rawLine),
        message: `Line ${lineNumber}: "${word}" does not match a locked letter at position ${lockedConflict + 1} of ${id}-${direction.toUpperCase()}`,
      });
      continue;
    }

    // 3 — charset (and the underscore/symbol gate for the two-word setting)
    if (!charset.test(word)) {
      result.issues.push({
        line: lineNumber,
        text: truncate(rawLine),
        message: `Line ${lineNumber}: "${word}" isn't a usable word — letters and digits only, no symbols`,
      });
      continue;
    }

    // 4 — two-word: more than two words is never allowed
    if (allowTwoWords && word.split(' ').length > 2) {
      result.issues.push({
        line: lineNumber,
        text: truncate(rawLine),
        message: `Line ${lineNumber}: "${word}" has more than two words — phrases are limited to two`,
      });
      continue;
    }

    // 4b — clue present
    if (clue.length === 0) {
      result.issues.push({
        line: lineNumber,
        text: truncate(rawLine),
        message: `Line ${lineNumber}: ${id}-${direction.toUpperCase()} is missing its clue after the pipe`,
      });
      continue;
    }

    // 4b2 — record this as a per-slot candidate (the word has already passed
    // length / locked-letter / charset / two-word / clue checks, so it is a
    // legal answer for this slot). Multiple lines for one slot collect here as
    // best-first alternates; the solver tries them in order. Dedupe within the
    // slot by word. Once a slot has its FIRST candidate (the primary), further
    // lines for it are alternates only: skip the global-dedupe + cross-agreement
    // + assignment steps below so an alternate never raises a parse issue.
    const slotCands = result.slotCandidates.get(id) ?? [];
    if (!slotCands.some(c => c.word.toLowerCase() === word.toLowerCase())) {
      slotCands.push({ word, clue });
      result.slotCandidates.set(id, slotCands);
    }
    if (result.assignments.has(id)) continue;

    // 4c — case-insensitive dedupe (keep the first occurrence)
    if (seen.has(word.toLowerCase())) {
      result.issues.push({
        line: lineNumber,
        text: truncate(rawLine),
        message: `Line ${lineNumber}: "${word}" is already used by another slot — skipped`,
      });
      continue;
    }

    // 5 — cross-agreement vs already-accepted PRIMARY assignments: keep the
    // primary set (one word per slot) internally consistent by not letting a
    // later primary pick contradict an earlier one at a shared cell. This is NOT
    // an error, though — the word is already saved as a per-slot candidate, and
    // the solver resolves crossings by choosing a consistent set of candidates,
    // so we drop it from `assignments` silently (no misleading issue).
    const conflict = crossingConflict(slot, gridForm, committed);
    if (conflict !== null) {
      continue;
    }

    // Accept: record the word, commit its letters, mark it seen.
    commitLetters(slot, gridForm, committed);
    seen.add(word.toLowerCase());
    result.assignments.set(id, { word, clue });
  }

  return result;
}

/**
 * Position (0-based) where a candidate's letter disagrees with a locked grid
 * cell for this slot, or null if every locked cell matches. Comparison is
 * case-insensitive.
 */
function findLockedConflict(slot: SkeletonSlot, gridForm: string, grid: string[][]): number | null {
  for (let pos = 0; pos < slot.length; pos++) {
    const x = slot.direction === 'across' ? slot.startX + pos : slot.startX;
    const y = slot.direction === 'across' ? slot.startY : slot.startY + pos;
    const cell = grid[y]?.[x];
    if (cell && cell !== EMPTY_CELL) {
      if (cell.toLowerCase() !== gridForm[pos]?.toLowerCase()) return pos;
    }
  }
  return null;
}

/**
 * Position (0-based) where placing this word would clash with a letter an
 * earlier-accepted word already committed at the same cell, or null if it
 * agrees everywhere. Comparison is case-insensitive.
 */
function crossingConflict(
  slot: SkeletonSlot,
  gridForm: string,
  committed: Map<string, string>,
): number | null {
  for (let pos = 0; pos < slot.length; pos++) {
    const x = slot.direction === 'across' ? slot.startX + pos : slot.startX;
    const y = slot.direction === 'across' ? slot.startY : slot.startY + pos;
    const prior = committed.get(`${x},${y}`);
    if (prior && prior !== gridForm[pos]?.toLowerCase()) return pos;
  }
  return null;
}

/** Commit a placed word's letters into the per-cell map (lowercase). */
function commitLetters(slot: SkeletonSlot, gridForm: string, committed: Map<string, string>): void {
  for (let pos = 0; pos < slot.length; pos++) {
    const x = slot.direction === 'across' ? slot.startX + pos : slot.startX;
    const y = slot.direction === 'across' ? slot.startY : slot.startY + pos;
    committed.set(`${x},${y}`, gridForm[pos]?.toLowerCase());
  }
}

/** Trim the clue and strip stray wrapping quotes — mirrors wordListPrompt.ts:500-502. */
function cleanClue(s: string): string {
  return s.trim().replace(/^["']|["']$/g, '').trim();
}

function truncate(s: string): string {
  const t = s.trim();
  return t.length > 60 ? `${t.slice(0, 57)}...` : t;
}

/* ── Combined fill pipeline (shared by both AI-fill entry points) ─────────── */

export interface SkeletonFillResult {
  /** slot id -> placed word + clue (includes locked AI picks and placed words). */
  assignments: Map<number, { word: string; clue: string }>;
  /** Slots left blank because nothing satisfied their crossings. */
  unfilledSlotIds: number[];
  /** How many of the AI's labeled per-slot picks the parser accepted. */
  lockedCount: number;
  /** Human-readable parser issues, one per unusable line. */
  issues: string[];
  /**
   * Lengths the model flagged as scarce in the flat-pool `# NOTES` block
   * (`SHORT_LENGTHS:`); empty when absent. Passed straight through from the
   * parse so a future view can surface it. Does not affect the fill.
   */
  shortLengths: number[];
  /** The flat-pool `# NOTES` `COMMENT:` text; empty string when absent. */
  comment: string;
}

/**
 * The full "paste -> placed grid" pipeline, shared by both AI-fill entry points:
 * BYOG's SkeletonAiFillView and skeleton-first's in-editor "Fill with AI" panel.
 *
 * Parses the AI reply, then locks BOTH the AI's per-slot picks AND any words
 * already placed in the grid (must-include user words, or blanks the user
 * already typed in full — any slot carrying a `.word`). Placed words always win
 * over a stray AI line for the same slot. The AI's spare pool + the curated word
 * bank then complete the remaining slots with valid crossings; a slot that still
 * can't be satisfied is reported in unfilledSlotIds and left blank.
 *
 * BYOG passes all-blank slots, so this reduces to "lock the AI's picks, fill the
 * rest from pool + bank" — its original behavior, unchanged.
 *
 * Pure: same (response, slots, intersections, seed) -> same result.
 */
export function fillSkeletonFromResponse(options: {
  response: string;
  slots: SkeletonSlot[];
  intersections: SlotIntersection[];
  width: number;
  height: number;
  language?: PuzzleLanguage;
  allowTwoWords?: boolean;
  /**
   * Topic-relevant words to prefer when the bank fills a slot (soft bias). Pass
   * `topicPreferredWords(topic, placedWords)` to steer generic filler toward the
   * puzzle's theme; omit for the original (unbiased) fill.
   */
  preferredWords?: Set<string>;
  /** Determinism seed; only breaks ties inside the solver. */
  seed?: number;
}): SkeletonFillResult {
  const { response, slots, intersections, width, height, language, allowTwoWords, preferredWords, seed = 0 } = options;

  // The grid the parser and solver share: placed words written in, the rest
  // empty. (BYOG: every slot blank -> all-empty grid, same as emptyFillGrid.)
  const grid = gridFromPlacedSlots(slots, width, height);

  const parse = parseSkeletonFillResponse(response, {
    slots,
    intersections,
    grid,
    language,
    allowTwoWords,
  });

  // Hard-locked = only genuinely placed words (must-include user words, or a
  // blank the user already typed in full — any slot carrying a `.word`). These
  // must never change. The AI's per-slot picks are NOT hard-locked: they are
  // passed as SOFT candidates the solver tries first, so a pick that cannot
  // cross cleanly falls back to one of its alternates (or the pool/bank)
  // instead of forcing a bad letter onto its crossings.
  const locked = new Map<number, { word: string; clue: string }>();
  for (const slot of slots) {
    if (slot.word) locked.set(slot.id, { word: slot.word, clue: slot.clue ?? '' });
  }

  const { assignments, unfilledSlotIds } = solveSkeletonFill({
    slots,
    intersections,
    locked,
    pool: parse.pool,
    slotCandidates: parse.slotCandidates,
    preferredWords,
    seed,
  });

  // "From the AI" = blank slots whose final word is one of the AI's candidates
  // for that slot (placed user words don't count — they were already there).
  let lockedCount = 0;
  for (const [slotId, placedWord] of assignments) {
    if (locked.has(slotId)) continue;
    const cands = parse.slotCandidates.get(slotId);
    if (cands && cands.some(c => c.word.toLowerCase() === placedWord.word.toLowerCase())) {
      lockedCount++;
    }
  }

  return {
    assignments,
    unfilledSlotIds,
    lockedCount,
    issues: parse.issues.map(issue => issue.message),
    shortLengths: parse.shortLengths,
    comment: parse.comment,
  };
}
