/**
 * AI fill prompt + parser for the skeleton-first ("build your own grid") and
 * BYOG flows.
 *
 * THE DESIGN (Variant J — see Obsidian "Phase 17 - Session 14 Prompt Experiment
 * (A-J)"): the user has drawn the grid, but we do NOT ask the AI to interlock
 * words into it. A 10-variant × 5-model × 5-topic experiment was conclusive on
 * two points:
 *   1. Telling a model the crossing geometry (per-slot length / pattern /
 *      "crosses X at letter N") does not help — weak models can't do the
 *      interlock, and on a dense grid our solver fills from the word bank
 *      regardless. Prompt FORMAT was a negative result.
 *   2. Asking a model to satisfy a POSITION constraint is the very thing that
 *      TRIGGERS fabrication — a fake/misspelled/truncated/concatenated word that
 *      passes our (dictionary-less) parser and can land in a student's puzzle.
 *
 * So this prompt instead asks for a flat POOL of real words bucketed by the
 * DISTINCT lengths of the empty slots, and our local solver
 * (solveSkeletonFill) places them + completes the rest from the word bank. That
 * plays to the model's one reliable strength (topical word recall) and attacks
 * fabrication at its root (the "completion drive"): a headline anti-fabrication
 * rule, the exact observed failure modes named with real examples + "OMIT,
 * never reshape it to fit", "COUNT IS NOT A GOAL", a "broader subject is OK"
 * release valve, and a final "re-read and silently delete" pass.
 *
 * Like the rest of the AI helpers this is pure copy-paste: it builds a prompt
 * the teacher pastes into any AI assistant, and parses what comes back. Zero
 * network calls. Pure TypeScript — no DOM, no React.
 *
 * Prompt ↔ parser contract: the prompt demands a fenced block where words are
 * grouped under "# N letters" headers as unlabeled "WORD | Clue" lines, ended by
 * a machine-readable "# NOTES" footer ("SHORT_LENGTHS:" / "COMMENT:"). The
 * parser routes the word lines into a flat `pool`, skips the headers, mines the
 * NOTES, and drops the "omission cruft" real models emit — while still
 * tolerating legacy labeled "{id}-{DIR}: WORD | clue" lines and the usual AI
 * deviations (numbering, bullets, bold, missing fences). Shared building blocks
 * (charset wording, fence finder, word cleaner, list-marker regex) are reused
 * from wordListPrompt.ts so the two stay in lockstep.
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
import {
  charsetLines,
  findBestFencedBlock,
  cleanWord,
  LIST_MARKER,
  type ParseIssue,
} from './wordListPrompt';
import { solveSkeletonFill, gridFromPlacedSlots } from '../logic/skeletonAiFill';

const EMPTY_CELL = '-';

/* ── Prompt builder ───────────────────────────────────────────────────── */

export function buildSkeletonFillPrompt(options: {
  slots: SkeletonSlot[];
  intersections: SlotIntersection[];
  width: number;
  height: number;
  /**
   * '-' = empty cell; a letter = locked (a crossing) or kept (already placed).
   * Kept in the signature so callers can pass the live grid uniformly; the
   * flat-pool prompt only reads slot lengths, not the grid contents.
   */
  grid: string[][];
  context: string;
  language?: PuzzleLanguage;
  allowTwoWords?: boolean;
  allowProperNouns?: boolean;
}): string {
  const { slots, context } = options;
  const language = options.language ?? DEFAULT_LANGUAGE;
  const allowTwoWords = options.allowTwoWords ?? false;
  const allowProperNouns = options.allowProperNouns ?? false;
  const languageLabel = getLanguageInfo(language).label;

  // We ask only for the lengths the grid still NEEDS — the distinct lengths of
  // its empty (no-word) slots. A slot's word can be set even if its cells aren't
  // all written into the grid yet, so split on slot.word, not on grid contents.
  const emptySlots = slots.filter(slot => !slot.word);
  const lengths = distinctSlotLengths(emptySlots);

  const lines: string[] = [];

  // 1 — The reframe: the model recalls words; OUR software places them. This is
  // the core of Variant J — it removes the position constraint that triggers
  // fabrication on weaker models.
  lines.push('I am building a crossword and need a pool of words to fill it. My software places the words and fills any gaps — you do NOT need to arrange them, order them, or make them cross.');
  lines.push('');

  // 2 — The headline anti-fabrication rule. The app has no dictionary, so a fake
  // word passes straight through; FEWER real words always beats one fake.
  lines.push(`THE RULE THAT MATTERS MOST: every word must be a real, correctly-spelled ${languageLabel} word. It is always better to give FEWER words than to include even one that is invented, misspelled, truncated, or two words stuck together.`);
  lines.push('');

  // 3 — Requirements. The REAL-WORDS-ONLY list names the EXACT failure modes the
  // experiment observed (referee→REFERE, glacier→GLACER, free kick→FREEKKICK,
  // OFFSTRIKE), each with "omit, never reshape".
  lines.push('REQUIREMENTS');
  lines.push(`- ${languageLabel} words and clues.`);
  // Charset rule reused verbatim from the flat-list builder so the two prompts
  // stay in lockstep (and so non-English accents are spelled out correctly).
  lines.push(...charsetLines(language));
  lines.push('- REAL WORDS ONLY. Do NOT:');
  lines.push('   - truncate a longer word to fit ("referee" -> "REFERE" is wrong),');
  lines.push('   - misspell a word to fit ("glacier" -> "GLACER" is wrong),');
  if (allowTwoWords) {
    // Two-word setting: the app's underscore convention is the ONLY legal way to
    // write a phrase; bare concatenation is still a fabrication.
    lines.push('   - run two words together with no underscore ("free kick" -> "FREEKKICK", "guinea pig" -> "GUINEAPIG", "ice cream" -> "ICECREAM" are wrong — see the two-word rule below),');
  } else {
    lines.push('   - run two words together ("free kick" -> "FREEKKICK", "guinea pig" -> "GUINEAPIG", "ice cream" -> "ICECREAM" are wrong),');
  }
  lines.push('   - invent a plausible-sounding word ("OFFSTRIKE" is wrong).');
  lines.push('  If you catch yourself about to do any of these, OMIT that word — never reshape it to fit.');
  if (allowTwoWords) {
    // The two-word branch REPLACES "SINGLE WORDS ONLY" with the underscore
    // convention (mirrors wordListPrompt.ts), still forbidding bare merges.
    lines.push('- Prefer single words. A two-word phrase is allowed when it is the natural term — for at most a third of the entries.');
    lines.push('- Write a two-word phrase with one underscore joining the words: "EXTRA_TIME". No spaces, no hyphens, no other join symbols. The underscore is not a letter — EXTRA_TIME fills the grid as EXTRATIME (9 letters).');
    lines.push('- A two-word phrase MUST keep the underscore: write CARBON_DIOXIDE, never CARBONDIOXIDE. Two words run together with no underscore read as one word and get mislabeled — never merge two words without it.');
  } else {
    lines.push('- SINGLE WORDS ONLY (a true one-word compound like "sunflower" is fine).');
  }
  if (!allowProperNouns) {
    lines.push('- No proper nouns (specific people, places, brands, teams).');
  }
  // COUNT IS NOT A GOAL — fixed quotas on constrained lengths were the proven
  // fabrication trigger (Variant D). Listing few/zero for a length is correct.
  lines.push('- COUNT IS NOT A GOAL. Do not try to fill each length to any number. Some lengths will have many real words for this topic; others will have few or none — both outcomes are correct. List only words you are sure of.');
  // Broader-subject release valve: real-and-related beats narrow-but-fake.
  lines.push('- You MAY use words from the BROADER subject, not only the narrowest sense of the topic (for "World Cup": general football and sport words; for a science topic: related general terms). Real-and-related beats narrow-but-fake.');
  lines.push('- Each clue: one sentence, at most 12 words, classroom-appropriate, not containing the answer word.');
  // The final completion-drive defense: re-read and silently delete.
  lines.push('- BEFORE FINISHING: re-read every word and silently delete any you are not fully certain is a real, correctly-spelled single word of the right length. Output only the survivors.');
  lines.push('');

  // 4 — The lengths the grid needs (distinct empty-slot lengths, ascending).
  lines.push(`LENGTHS NEEDED: ${formatLengthsNeeded(lengths)}`);
  lines.push('');

  // 5 — Topic context (verbatim, fenced) — mirrors wordListPrompt.ts.
  lines.push('===BEGIN TOPIC CONTEXT===');
  lines.push(context.trim() || '(no specific topic — choose useful general-vocabulary words)');
  lines.push('===END TOPIC CONTEXT===');
  lines.push('');

  // 6 — Output format: a fenced block, grouped by "# N letters", unlabeled
  // "WORD | clue" lines, NO inline notes (the Sonnet cruft hazard), then a
  // machine-readable "# NOTES" footer the parser mines.
  const caps = language === 'spanish'
    ? 'ALL CAPS using only A-Z, Á É Í Ó Ú Ü Ñ, and digits'
    : 'ALL CAPS';
  lines.push('OUTPUT FORMAT — parsed literally by software; follow exactly.');
  lines.push('Respond with ONLY a fenced code block.');
  lines.push('Group words by length, each group preceded by a header line exactly like "# 5 letters".');
  lines.push('Inside a group, each line is ONLY a word and its clue, nothing else:');
  lines.push('WORD | Clue text');
  lines.push(`(${caps}, exactly the group's length, one pipe, sentence-case clue.)`);
  lines.push('Never write a note, count, or "removed"/"moved" remark on any line — if a word is the wrong length, just place it correctly or omit it.');
  lines.push('End with a section that begins with the line "# NOTES" followed by EXACTLY these two lines:');
  lines.push('SHORT_LENGTHS: <comma-separated lengths where you had few or no real words — listing a length here is HELPFUL, not a failure; or the single word none>');
  lines.push('COMMENT: <one short plain sentence, or the single word none>');
  lines.push('Nothing outside the code block.');

  return lines.join('\n');
}

/**
 * Format the "LENGTHS NEEDED" value as a human sentence fragment ending in
 * "letters.":
 *   - []        -> "(none — every slot is already filled)."
 *   - [5]       -> "5 letters."
 *   - [3,4]     -> "3 and 4 letters."
 *   - [3,4,5,7] -> "3, 4, 5, and 7 letters."
 */
function formatLengthsNeeded(lengths: number[]): string {
  if (lengths.length === 0) return '(none — every slot is already filled).';
  if (lengths.length === 1) return `${lengths[0]} letters.`;
  if (lengths.length === 2) return `${lengths[0]} and ${lengths[1]} letters.`;
  const head = lengths.slice(0, -1).join(', ');
  const last = lengths[lengths.length - 1];
  return `${head}, and ${last} letters.`;
}

/** Distinct slot lengths, ascending — drives the "LENGTHS NEEDED" header. */
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
  // Anchored markers: every observed cruft clue STARTS with its marker, so a
  // real descriptive sentence (which starts with the actual clue text) is safe.
  if (c === 'none') return true; // exactly "none"
  if (c.startsWith('none')) return true; // "none — ...", "none-...", "none ..."
  if (c.startsWith('not a real word')) return true;
  if (/^not \d+ letters/.test(c)) return true; // "not 7 letters ..."
  if (c.startsWith('too long') || c.startsWith('too short')) return true;
  // The bare substrings "omitted" / "removed" / "moved below" / "crossed out"
  // are discard signals ONLY in a SHORT meta line ("None — omitted", "removed").
  // A full descriptive sentence (e.g. "A fish often removed from nets.") merely
  // CONTAINS the word and is a real clue — never dropped. The length gate is the
  // whole false-positive fix: with no dictionary, dropping a real word loses
  // content, but admitting a fake word is worse, so we drop only when the line
  // is too short to be a genuine clue AND carries a discard word.
  if (c.length <= 24 && /\b(?:omitted|removed|crossed out|moved below)\b/.test(c)) {
    return true;
  }
  return false;
}

/**
 * Mine a single NOTES-block line for `SHORT_LENGTHS:` / `COMMENT:` and write it
 * into the result. The key match is case-insensitive; the COMMENT value keeps
 * its ORIGINAL case (only an exact `none` collapses to ''). Used both inside
 * NOTES mode and for header-less metadata lines. Pure; never throws.
 */
function mineNotesLine(line: string, result: SkeletonFillParse): void {
  const colon = line.indexOf(':');
  if (colon === -1) return;
  const key = line.slice(0, colon).trim().toLowerCase();
  const value = line.slice(colon + 1).trim();
  if (key === 'short_lengths') {
    result.shortLengths = parseShortLengths(value);
  } else if (key === 'comment') {
    result.comment = /^none$/i.test(value) ? '' : value;
  }
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

/**
 * Leading list markers / enumerators a model may prepend, BEYOND the shared
 * LIST_MARKER (`- * • 1. 2)`). Stripping is FAIL-SAFE only when the marker is
 * clearly separated from the content, so a real word is never eaten:
 *   - a bullet glyph (`+ – — ‣ ▪ ◦ →`) must be followed by whitespace;
 *   - an enumerator (`a) a. (1) i.`) must be followed by whitespace.
 * Only a LEADING run is removed; the word itself is untouched. Anchored, applied
 * AFTER LIST_MARKER, and idempotent via the loop in stripLeadingMarkers.
 */
const EXTRA_MARKER = /^\s*(?:[+–—‣▪◦→]|\([0-9a-z]{1,3}\)|[0-9a-z]{1,3}[.)])\s+/i;

/**
 * Strip every leading list marker / bullet / enumerator from a line, leaving the
 * real content. Applies the shared LIST_MARKER and the extended EXTRA_MARKER
 * repeatedly (a model may stack "- •" etc.), but stops the moment nothing more
 * is stripped, so it can never loop or consume the word. Pure; no throw.
 *
 * IMPORTANT: a slot label like "(2) ACROSS:" / "1) 2-DOWN:" looks like an
 * enumerator bullet, so before each extended-strip pass we check whether the
 * CURRENT remainder is already a slot label — if so we stop, never eating the
 * label's own number. (LIST_MARKER alone is safe: it can't match "(2)".)
 */
function stripLeadingMarkers(line: string): string {
  let out = line;
  // Bounded: each pass strips ≥ 1 char or we break; cap defends against any
  // pathological no-progress case (cannot happen, but cheap insurance).
  for (let i = 0; i < 8; i++) {
    // Light markers (-, *, •, 1., 2)) never collide with a slot label, so strip
    // them first; then only strip an extended marker (bullet glyph / paren /
    // enumerator) if what remains is NOT itself a slot label.
    let next = out.replace(LIST_MARKER, '');
    if (!SLOT_LABEL.test(next)) next = next.replace(EXTRA_MARKER, '');
    if (next === out) break;
    out = next;
  }
  return out;
}

/**
 * The "core" of a line for metadata/header classification: leading markers, a
 * leading `#`/`*`/`=` run, and surrounding whitespace removed, then lowercased.
 * Used to recognize `short_lengths:` / `comment:` and `notes` / length-group
 * headers WHEREVER they appear (a model may drop or reformat the `# NOTES`
 * header), without those classifications depending on the exact decoration.
 */
function metadataCore(line: string): string {
  return stripLeadingMarkers(line)
    .replace(/^[#*=\s]+/, '')
    .replace(/[*=\s]+$/, '')
    .trim()
    .toLowerCase();
}

/** A NOTES-section header in any decoration: bare `notes` / `notes:`. */
function isNotesHeader(line: string): boolean {
  return /^notes\b\s*:?\s*$/.test(metadataCore(line));
}

/**
 * A length-group header — the flat-pool format's "N letters" divider in any
 * shape: `# 5 letters`, `## 5 letters`, `**5 letters**`, `5 letters:`,
 * `5 LETTERS`, `[5 letters]`. These never carry an answer. Anchored on the core
 * so it can't match a real `WORD | clue` line (which has a separator + clue).
 */
function isLengthGroupHeader(line: string): boolean {
  const core = metadataCore(line).replace(/^\[|\]$/g, '').trim();
  return /^\d{1,3}\s*letters?\s*:?$/.test(core);
}

/**
 * A placeholder / punctuation-only clue means the model had NO real clue, so its
 * word is suspect → drop. Matches (case-insensitive, trimmed) an exact
 * placeholder token, OR a clue with no alphabetic character at all. A real
 * descriptive clue always has letters and is never one of these tokens.
 */
const PLACEHOLDER_CLUES = new Set([
  '-', '—', '–', '.', '..', '...', '…', '?', '??', '???',
  'n/a', 'na', 'tbd', 'todo', 'skip', 'x', 'none.',
]);
function isPlaceholderClue(clue: string): boolean {
  const c = clue.trim().toLowerCase();
  if (c.length === 0) return true;
  if (PLACEHOLDER_CLUES.has(c)) return true;
  if (!/[a-zÀ-ɏ]/i.test(c)) return true; // wholly non-alphabetic
  return false;
}

/**
 * Does a cleaned word token carry at least one letter? A token of only digits /
 * symbols (`123`, `***`, `###`, empty) is not a real answer → drop. The charset
 * alone admits an all-digit token, so this is the explicit guard. Covers the
 * language's extra letters (accents, Ñ) via the broad Unicode-letter class.
 */
function hasLetter(word: string): boolean {
  return /[a-zÀ-ɏñ]/i.test(word);
}

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
    // Exception safety: a single malformed line must never abort the whole
    // parse. Any unexpected throw inside one iteration is swallowed; the line is
    // dropped (fail safe) and parsing continues with the next line.
    try {
    // Strip leading list markers / bullets / enumerators (shared LIST_MARKER +
    // the extended set) so the word itself starts the remainder.
    const line = stripLeadingMarkers(rawLine).trim();
    if (line.length === 0) continue;

    // NOTES mode (flat-pool footer): never a word. Pull SHORT_LENGTHS / COMMENT;
    // ignore everything else (including a stray `WORD | clue` after the footer).
    // Strip any leading `#`/`*` decoration off the key while keeping value case.
    if (notesMode) {
      mineNotesLine(line.replace(/^[#*=\s]+/, ''), result);
      continue;
    }

    // Metadata WHEREVER it appears (a model may drop/reformat the `# NOTES`
    // header): a `short_lengths:` / `comment:` line is ALWAYS metadata, never a
    // word. Parse it in place and move on — this eliminates the leak where
    // header-less `COMMENT: ...` became the word "COMMENT" and `SHORT_LENGTHS: 3`
    // became "SHORTLENGTHS". Mine from a decoration-stripped (but case-PRESERVING)
    // form so a mixed-case COMMENT value survives.
    if (/^(?:short_lengths|comment)\s*:/.test(metadataCore(line))) {
      mineNotesLine(line.replace(/^[#*=\s]+/, ''), result);
      continue;
    }

    // Section / length-group headers in any decoration — never a word. The
    // NOTES header (any spelling) also switches us into NOTES mode.
    if (isNotesHeader(line)) {
      notesMode = true;
      continue;
    }
    if (line.startsWith('#') && NOTES_HEADER.test(line)) {
      notesMode = true;
      continue;
    }
    if (line.startsWith('#') || isLengthGroupHeader(line)) {
      // Any other `#`-prefixed line (e.g. `# 5 letters`) or a bare length-group
      // header (`5 letters:`, `**5 letters**`, `[5 letters]`) is skipped.
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
      // Omission cruft / placeholder: the model marked this word as discarded
      // (empty clue, "None — omitted.", "Not 7 letters", etc.) or gave a
      // placeholder clue ("-", "tbd", "...", a non-alphabetic clue) — meaning it
      // had no real clue, so the word is suspect. Drop silently — an intentional
      // omission, not a usable word and not a parse error.
      if (isDiscardedClue(rawClue) || isPlaceholderClue(rawClue)) continue;
      const word = cleanWord(stripLengthHint(line.slice(0, pipeIndex)), allowTwoWords);
      const clue = cleanClue(rawClue);
      // Empty / non-letter word token (`| clue`, `123 | clue`, `*** | clue`): no
      // real answer here. Drop silently — never an issue, never a throw.
      if (!hasLetter(word)) continue;
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

    // Fail-safe drops (BEFORE the validation chain, silent — these are suspect
    // content, not parse errors): an empty / non-letter word token (`| clue`,
    // `### | clue`), a discard annotation, or a placeholder clue ("-", "tbd",
    // "...", a non-alphabetic clue) all mean "no real answer here" — drop the
    // line and do not record it as a candidate or an issue.
    if (!hasLetter(word)) continue;
    if (isDiscardedClue(split.clue) || isPlaceholderClue(split.clue)) continue;

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
    } catch {
      // A malformed line threw unexpectedly — drop it (fail safe) and keep
      // going. The parser must NEVER throw on any input; a bad line costs at
      // most that one line, never the whole paste.
      continue;
    }
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
    // Scrub the AI pool + bank filler against the appropriateness blocklist in
    // the puzzle's language (exact-word) so no inappropriate word is placed.
    language,
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
