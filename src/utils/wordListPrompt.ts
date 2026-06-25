/**
 * AI word-list prompt builder and response parser.
 *
 * The AI Words tab assembles a ready-to-paste prompt for any AI assistant
 * (ChatGPT, Gemini, Claude, ...) and parses the response back into
 * word-clue entries. Pure copy-paste — no API calls, no network.
 *
 * The prompt and the parser are two halves of one contract: the prompt
 * demands a fenced code block of "WORD | Clue" lines, and the parser
 * targets exactly that, while tolerating the most common AI deviations
 * (numbering, bullets, bold words, missing fences).
 *
 * Both halves honor the puzzle's language (charset, clue language) and
 * the two-word answers option (phrases written WORD_WORD in responses,
 * stored with a space). See src/logic/language.ts.
 */

import type { WordCluePair, PuzzleMode } from '../logic/types';
import {
  DEFAULT_LANGUAGE,
  getLanguageInfo,
  toGridWord,
  wordCharsetRegex,
  type PuzzleLanguage,
} from '../logic/language';
import { recommendedWordCountRange } from '../logic/gridRecommendation';

/**
 * Power-user overrides for the prompt. All optional; when omitted, the
 * prompt stays in its default "optimized for this grid" form (the settings
 * that the factor study showed produce the densest, most reliable puzzles).
 * These loosen the engine-tuned constraints so the AI has MORE freedom in
 * its word choice — at some cost to grid density. Surfaced behind an
 * "Advanced options" disclosure in the AI Words tab (off by default).
 */
export interface AdvancedPromptOptions {
  /**
   * How the word count is requested:
   *  - 'optimized' (default): the grid-calibrated band (densest + fits).
   *  - 'exact': exactly `wordCount`.
   *  - 'unlimited': let the AI choose how many, sized to fill the grid.
   */
  countMode?: 'optimized' | 'exact' | 'unlimited';
  /**
   * Crossword flagship "Optimized" mode: ask the AI for a larger pool of its
   * BEST words listed strongest-first, then build the puzzle from the
   * best-fitting subset (response order conveys quality — the parser keeps
   * it). When on (crossword only), this supersedes `countMode` for the word
   * count. No effect in word search — the flagship is crossword-only.
   */
  optimized?: boolean;
  /** Optimized mode: pool ask = candidateMultiple × wordCount, capped. Default 4. */
  candidateMultiple?: number;
  /**
   * The quality bias that replaces the anyLength + anyLetters toggles in the
   * UI (crossword only):
   *  - undefined / 'grid' (default) / 'balanced': keep the engine-tuned length +
   *    crossing guidance — densest, most reliable grids. ('balanced' differs only
   *    in the selection weight, not the prompt text.)
   *  - 'words': drop BOTH so the AI picks the most interesting words
   *    regardless of length or letter mix.
   * The legacy anyLength/anyLetters fields still work and are OR-ed in.
   */
  qualityBias?: 'grid' | 'balanced' | 'words';
  /** Crossword: drop the 5-8 letters / avoid-short / no-outlier guidance. */
  anyLength?: boolean;
  /** Crossword: drop the vowel/common-letter crossing guidance. */
  anyLetters?: boolean;
  /** Drop the "no proper nouns" restriction. */
  allowProperNouns?: boolean;
  /** Verbatim extra instructions appended to the prompt (limitless control). */
  extraInstructions?: string;
}

export interface WordListPromptOptions {
  /** Freeform topic context — anything the teacher pastes in. */
  context: string;
  /** How many new words to request. */
  wordCount: number;
  /** Current word list — included so the AI avoids dupes and finds crossing-friendly words. */
  existingWords: string[];
  /** Grid dimensions (the hard cap on word length). */
  gridWidth: number;
  gridHeight: number;
  puzzleMode: PuzzleMode;
  /** Puzzle language — words AND clues. Default English. */
  language?: PuzzleLanguage;
  /** Permit two-word phrases (written WORD_WORD in the response). */
  allowTwoWords?: boolean;
  /** Power-user overrides (default: optimized prompt). */
  advanced?: AdvancedPromptOptions;
}

/**
 * The charset rule, phrased for the prompt, per language.
 *
 * Exported (no behavior change) so the skeleton-fill prompt builder can reuse
 * the exact same charset wording — see src/utils/skeletonFillPrompt.ts.
 */
export function charsetLines(language: PuzzleLanguage): string[] {
  if (language === 'spanish') {
    return [
      '- Use the letters A-Z, the Spanish letters Á É Í Ó Ú Ü Ñ where the correct spelling needs them, and digits 0-9. No punctuation, no abbreviations, no other symbols.',
    ];
  }
  if (language === 'german') {
    return [
      '- Use only the letters A-Z and digits 0-9: no punctuation, no abbreviations, no other symbols. Write umlauts as plain vowels and ß as SS ("GRUSSE", not "GRÜSSE").',
    ];
  }
  return [
    '- Use only the letters A-Z and digits 0-9: no punctuation, no abbreviations, no other symbols. Write accented letters in their plain form ("ELEVE", not "ÉLÈVE").',
  ];
}

/**
 * Classroom-appropriateness rule, shared by every AI prompt builder (word list,
 * skeleton/BYOG fill, clue writer) so the wording stays consistent. This is the
 * generation-side guard; the exact-word blocklist scrub (src/data/blocklist.ts)
 * is the reliable filter behind it.
 */
export const CLASSROOM_APPROPRIATE_RULE =
  'Every word and clue must be appropriate for a school classroom: no profanity, slurs, or crude, sexual, violent, or otherwise offensive terms. If a word is borderline, leave it out.';

/**
 * Build the full prompt text.
 *
 * Structure (deterministic, in order): parameters block, topic context
 * block, existing words block (optional), output format instruction,
 * word constraints, closing. Objective spec only — no role-casting.
 */
export function buildWordListPrompt(options: WordListPromptOptions): string {
  const { context, wordCount, existingWords, gridWidth, gridHeight, puzzleMode } = options;
  const language = options.language ?? DEFAULT_LANGUAGE;
  const allowTwoWords = options.allowTwoWords ?? false;
  const languageLabel = getLanguageInfo(language).label;
  const isCrossword = puzzleMode === 'crossword';
  const maxLen = Math.max(gridWidth, gridHeight);
  const puzzleName = isCrossword ? 'crossword puzzle' : 'word search puzzle';

  const lines: string[] = [];

  // Crossword counts are calibrated to the grid: when the requested count
  // sits inside the size's happy band, the prompt asks for the band (with
  // the request as the aim) instead of a hard integer — an AI told
  // "exactly N" with one weak candidate left pads with junk; a range lets
  // it stop at quality. A request outside the band is deliberate, so it
  // stays exact. Word searches keep exact counts (density isn't a
  // constraint there — filler letters surround the words regardless).
  const adv = options.advanced ?? {};
  const countMode = adv.countMode ?? 'optimized';
  const range = recommendedWordCountRange(gridWidth, gridHeight);
  const rangeLo = Math.max(2, range.lo - existingWords.length);
  const rangeHi = Math.max(rangeLo, range.hi - existingWords.length);

  // Flagship "Optimized" mode (crossword only): ask for a larger pool of the
  // AI's BEST words, strongest-first, and let the engine pick the best-fitting
  // subset. When on, this supersedes the count-mode logic for the word count.
  const POOL_CAP = 40;
  const optimized = isCrossword && adv.optimized === true;
  const poolAsk = optimized
    ? Math.min(POOL_CAP, Math.round((adv.candidateMultiple ?? 4) * wordCount))
    : 0;

  // The grid-calibrated band only applies in the default 'optimized' count
  // mode, and never when the flagship pool ask is in effect.
  const useCountRange = !optimized && countMode === 'optimized' && isCrossword
    && wordCount >= rangeLo && wordCount <= rangeHi;

  // 1 — Parameters block
  lines.push(`Generate a word list with clues for a ${puzzleName} on the topic described below.`);
  lines.push('');
  lines.push('REQUIREMENTS');
  lines.push(`- Language: ${languageLabel}. Every word and every clue must be written in ${languageLabel}.`);
  if (optimized) {
    lines.push(`- Number of words: about ${poolAsk} — give your BEST, most interesting on-topic words, and LIST THEM STRONGEST FIRST. Only the best-fitting subset is used to build the puzzle, so favor quality and variety over hitting an exact number.`);
  } else if (countMode === 'unlimited') {
    lines.push(`- Number of words: choose as many strong, on-topic words as the topic naturally supports — aim for a rich list that comfortably fills a ${gridWidth}x${gridHeight} grid (roughly ${rangeLo} or more). Quality over quantity; don't pad with weak words.`);
  } else if (useCountRange) {
    lines.push(`- Number of words: ${rangeLo} to ${rangeHi} — the right range for this grid size — aiming for about ${wordCount}. Return fewer rather than padding with weak or off-topic words.`);
  } else {
    lines.push(`- Number of words: exactly ${wordCount}.`);
  }
  lines.push(`- Grid size: ${gridWidth}x${gridHeight} — no word may be longer than ${maxLen} letters.`);
  if (isCrossword) {
    // Length + letter guidance below is calibrated to how this crossword
    // engine actually packs words (measured): 5-8 letter words fill the
    // grid densely and place reliably; 3-letter words barely cross and
    // often can't be placed; one outlier word forces an oversized, mostly
    // empty grid; and vowel/common-letter-rich words interlock far better
    // than rare-letter or vowel-poor ones (English letter frequency).
    // The "words" quality bias drops BOTH the length and crossing guidance so
    // the AI picks the most interesting words regardless of length/letters.
    // The legacy anyLength/anyLetters toggles are OR-ed in so they still work.
    const dropForWords = adv.qualityBias === 'words';
    if (!adv.anyLength && !dropForWords) {
      lines.push('- Word length: most words 5 to 8 letters. Avoid 3-letter words (they barely cross), and avoid making one word much longer than the rest (it forces an oversized, mostly empty grid).');
    }
    if (!adv.anyLetters && !dropForWords) {
      lines.push('- Crossing-friendly: favor words rich in vowels and common letters (E, A, R, I, O, T, N, S, L) so they interlock. Avoid words that lean on rare letters (J, Q, X, Z) or are vowel-poor (like "rhythm") — they are hard to cross.');
    }
  } else {
    // Word search places each word independently (overlap optional, filler
    // fills the rest), so none of the crossword interlock constraints apply:
    // any length is fine, variety is good, and letter mix is irrelevant.
    lines.push(`- Word length: anything from 4 letters up to ${maxLen}. A mix of short and long words makes the best word search, and longer words are fun to hunt — words do NOT need to share letters or interlock.`);
    lines.push('- Do not list a word that is contained inside another word on the list (for example, not both SUN and SUNFLOWER), so every word can be circled cleanly.');
  }
  lines.push(...charsetLines(language));
  if (allowTwoWords) {
    lines.push('- Prefer single words. A two-word phrase is allowed when it is the natural term — for at most a third of the entries.');
    lines.push('- Write a two-word phrase with one underscore joining the words: "EXTRA_TIME". No spaces, no hyphens, no other join symbols. The underscore is not a letter — EXTRA_TIME must fit the grid as EXTRATIME (9 letters).');
    lines.push('- A two-word phrase MUST keep the underscore: write CARBON_DIOXIDE, never CARBONDIOXIDE. Two words run together with no underscore read as one word and get mislabeled — never merge two words without it.');
  } else {
    lines.push('- Each entry must be a single word — no spaces, no hyphens, no underscores, no multi-word phrases. "goalkeeper" is correct; "goal keeper", "goal-keeper", and "goal_keeper" are not.');
    lines.push('- Never combine two separate words into one entry — not with a symbol and not by running them together. "carbon dioxide" must not become CARBONDIOXIDE, "ice cream" must not become ICECREAM, "gas giant" must not become GASGIANT. If a term only works as a phrase, choose a different single-word term instead. (A genuine single-word compound like "sunflower" or "rainbow" is still fine.)');
  }
  if (!adv.allowProperNouns) {
    lines.push('- No proper nouns unless they are directly relevant to the topic.');
  }
  if (isCrossword) {
    lines.push('- Each clue: one sentence, at most 12 words, classroom-appropriate, and it must not contain the answer word or any form of it.');
  } else {
    lines.push('- Words only — no clues or definitions. A word search needs just the words.');
  }
  lines.push(`- ${CLASSROOM_APPROPRIATE_RULE}`);
  lines.push('');

  // 2 — Topic context block (verbatim, fenced)
  lines.push('===BEGIN TOPIC CONTEXT===');
  lines.push(context.trim() || '(no specific topic — choose useful general-vocabulary words)');
  lines.push('===END TOPIC CONTEXT===');
  lines.push('');

  // 3 — Existing words block (optional)
  if (existingWords.length > 0) {
    lines.push('===BEGIN EXISTING WORDS===');
    lines.push(existingWords.map(w => w.toUpperCase()).join(', '));
    lines.push('===END EXISTING WORDS===');
    lines.push('');
    lines.push('- Do not repeat any word from EXISTING WORDS, or trivial variants of them.');
    if (isCrossword) {
      lines.push('- Prefer new words that share letters with the existing words, so they can cross in the grid.');
    }
    lines.push('');
  }

  // 3.5 — Extra instructions (advanced, verbatim). Placed last among the
  // guidance so the user's own words can refine or override anything above.
  const extra = adv.extraInstructions?.trim();
  if (extra) {
    lines.push('ADDITIONAL INSTRUCTIONS (apply these as well)');
    lines.push(extra);
    lines.push('');
  }

  // 4 — Output format instruction (the parser targets this exactly)
  const caps = language === 'spanish'
    ? 'ALL CAPS using only the letters A-Z, Á É Í Ó Ú Ü Ñ, and digits'
    : 'ALL CAPS using only the letters A-Z and digits';
  lines.push('OUTPUT FORMAT');
  if (isCrossword) {
    lines.push('Respond with ONLY a fenced code block. Inside it, one entry per line:');
    lines.push('');
    lines.push('WORD | Clue text');
    lines.push('');
    lines.push(`Rules: WORD in ${caps}, a single pipe (|) as the separator, clue in sentence case.`);
    if (optimized) {
      lines.push(`About ${poolAsk} lines, strongest word first. No blank lines, no numbering, no text outside the code block.`);
    } else if (useCountRange) {
      lines.push(`Between ${rangeLo} and ${rangeHi} lines. No blank lines, no numbering, no text outside the code block.`);
    } else {
      lines.push(`Exactly ${wordCount} lines. No blank lines, no numbering, no text outside the code block.`);
    }
    lines.push('');
    lines.push('Example format (do not copy these words):');
    lines.push('```');
    lines.push('EXAMPLE | A thing that shows what the format looks like.');
    if (allowTwoWords) {
      lines.push('TWO_WORDS | A phrase entry, two words joined by one underscore.');
    }
    lines.push('SAMPLE | A small part that represents the whole.');
    lines.push('```');
  } else {
    lines.push('Respond with ONLY a fenced code block. Inside it, one word per line — no clues, no numbering, no other text.');
    lines.push('');
    lines.push(`Rules: each line is one word in ${caps}.`);
    lines.push(`Exactly ${wordCount} lines. No blank lines, no text outside the code block.`);
    lines.push('');
    lines.push('Example format (do not copy these words):');
    lines.push('```');
    lines.push('EXAMPLE');
    if (allowTwoWords) {
      lines.push('TWO_WORDS');
    }
    lines.push('SAMPLE');
    lines.push('```');
  }
  lines.push('');

  // 5 — Closing
  lines.push('Respond with the code block only. Nothing else.');

  return lines.join('\n');
}

/* ── Response parsing ─────────────────────────────────────────────────── */

export interface ParseIssue {
  /** 1-based line number in the pasted text. */
  line: number;
  /** The raw line content (trimmed, for display). */
  text: string;
  message: string;
}

export interface ParsedWordList {
  /** Valid entries, deduped (case-insensitive) within the response and against existing words. */
  entries: WordCluePair[];
  issues: ParseIssue[];
  /** Words skipped because they already exist (or repeated in the response). */
  duplicatesSkipped: string[];
}

/** Options the parser shares with the prompt — language charset + phrases. */
export interface ParseWordListOptions {
  language?: PuzzleLanguage;
  allowTwoWords?: boolean;
  /**
   * Word search mode: the prompt asks for bare words (one per line, no
   * pipes), so a pipe-less line is a word with an empty clue. Lines that
   * don't look like words are prose — silently skipped outside a fence,
   * reported inside one.
   */
  wordsOnly?: boolean;
}

/**
 * Leading list markers AIs add despite instructions: "1.", "2)", "-", "*", "•".
 * Exported (no behavior change) so the skeleton-fill parser strips the same
 * markers — see src/utils/skeletonFillPrompt.ts.
 */
export const LIST_MARKER = /^\s*(?:[-*•]|\d{1,3}[.)])\s*/;

/**
 * Parse an AI response into word-clue entries.
 *
 * Finds the fenced code block and parses only its lines; everything
 * outside (preamble, postamble) is ignored. If the AI ignored the fence
 * instruction, falls back to scanning the whole text leniently: lines
 * without a pipe are treated as prose and skipped silently instead of
 * reported as errors.
 *
 * With allowTwoWords, "EXTRA_TIME" (the prompt's phrase format) and
 * "EXTRA TIME" both parse to the spaced display form "EXTRA TIME".
 */
export function parseWordListResponse(
  raw: string,
  existingWords: string[] = [],
  options: ParseWordListOptions = {}
): ParsedWordList {
  const result: ParsedWordList = { entries: [], issues: [], duplicatesSkipped: [] };
  if (!raw.trim()) {
    return result;
  }

  const language = options.language ?? DEFAULT_LANGUAGE;
  const allowTwoWords = options.allowTwoWords ?? false;
  const wordsOnly = options.wordsOnly ?? false;
  const charset = wordCharsetRegex({ language, allowTwoWords });

  // A line counts toward a block's score if it looks like an entry:
  // a pipe line always does; in words-only mode a bare valid word does too.
  const looksLikeEntry = (line: string): boolean => {
    if (line.includes('|')) return true;
    if (!wordsOnly) return false;
    const candidate = cleanWord(line.replace(LIST_MARKER, ''), allowTwoWords);
    return candidate.length > 0 && charset.test(candidate);
  };

  const block = findBestFencedBlock(raw, looksLikeEntry);
  const lenient = block === null;
  const text = block?.content ?? raw;
  const lineOffset = block?.startLine ?? 0;

  const seen = new Set(existingWords.map(w => w.trim().toLowerCase()).filter(Boolean));
  const lines = text.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const lineNumber = lineOffset + i + 1;
    const rawLine = lines[i];
    const line = rawLine.replace(LIST_MARKER, '').trim();

    if (line.length === 0) {
      continue; // blank lines: skip silently
    }

    const pipeIndex = line.indexOf('|');
    let wordRaw: string;
    let clue: string;

    if (pipeIndex === -1) {
      if (!wordsOnly) {
        if (!lenient) {
          result.issues.push({
            line: lineNumber,
            text: truncateForDisplay(rawLine),
            message: `Line ${lineNumber} couldn't be read — expected: WORD | Clue`,
          });
        }
        continue; // lenient mode: prose line, skip silently
      }
      // Words-only: the whole line is the word. Outside a fence, lines
      // that don't clean up into a valid word are prose — skip silently.
      wordRaw = line;
      clue = '';
      if (lenient) {
        const candidate = cleanWord(wordRaw, allowTwoWords);
        if (!charset.test(candidate) || toGridWord(candidate).length < 2) {
          continue;
        }
      }
    } else {
      wordRaw = line.slice(0, pipeIndex);
      clue = cleanClue(line.slice(pipeIndex + 1));
    }

    const word = cleanWord(wordRaw, allowTwoWords);

    if (!allowTwoWords && /\s/.test(word)) {
      result.issues.push({
        line: lineNumber,
        text: truncateForDisplay(rawLine),
        message: `Line ${lineNumber} skipped — "${truncateForDisplay(wordRaw.trim())}" has a space; puzzle entries must be single words`,
      });
      continue;
    }

    if (allowTwoWords && word.split(' ').length > 2) {
      result.issues.push({
        line: lineNumber,
        text: truncateForDisplay(rawLine),
        message: `Line ${lineNumber}: "${truncateForDisplay(wordRaw.trim())}" has more than two words — phrases are limited to two`,
      });
      continue;
    }

    if (!charset.test(word) || toGridWord(word).length < 2) {
      result.issues.push({
        line: lineNumber,
        text: truncateForDisplay(rawLine),
        message: `Line ${lineNumber}: "${truncateForDisplay(wordRaw.trim()) || '(empty)'}" isn't a usable entry — letters and digits only, no symbols`,
      });
      continue;
    }

    if (clue.length === 0 && !wordsOnly) {
      result.issues.push({
        line: lineNumber,
        text: truncateForDisplay(rawLine),
        message: `Line ${lineNumber}: "${word}" is missing its clue after the pipe`,
      });
      continue;
    }

    if (seen.has(word.toLowerCase())) {
      result.duplicatesSkipped.push(word);
      continue;
    }

    seen.add(word.toLowerCase());
    result.entries.push({ word, clue });
  }

  return result;
}

/**
 * Find the fenced code block with the most entry-looking lines (the AI
 * sometimes wraps a remark in its own small block). What counts as an
 * entry line is mode-dependent — the caller passes the test. Returns the
 * block's content and the 0-based line index where its content starts in
 * the raw text, so issue messages can reference absolute line numbers.
 *
 * Exported (no behavior change) so the skeleton-fill parser reuses the exact
 * same fence-finding logic — see src/utils/skeletonFillPrompt.ts.
 */
export function findBestFencedBlock(
  raw: string,
  looksLikeEntry: (line: string) => boolean
): { content: string; startLine: number } | null {
  const fence = /```[^\n]*\n([\s\S]*?)```/g;
  let best: { content: string; startLine: number; score: number } | null = null;

  for (let match = fence.exec(raw); match !== null; match = fence.exec(raw)) {
    const content = match[1];
    const score = content.split('\n').filter(looksLikeEntry).length;
    if (best === null || score > best.score) {
      const before = raw.slice(0, match.index);
      // content starts one line after the opening fence line
      const startLine = before.split('\n').length;
      best = { content, startLine, score };
    }
  }

  return best && best.score > 0 ? { content: best.content, startLine: best.startLine } : null;
}

/**
 * Strip markdown bold/quotes around the word and uppercase it.
 * With two-word phrases allowed, interior underscores are the prompt's
 * join character — they become spaces (and literal spaces collapse).
 *
 * Exported (no behavior change) so the skeleton-fill parser cleans words the
 * exact same way — see src/utils/skeletonFillPrompt.ts.
 */
export function cleanWord(s: string, allowTwoWords: boolean): string {
  let word = s.trim().replace(/^[*_"'`]+|[*_"'`]+$/g, '').trim();
  if (allowTwoWords) {
    word = word.replace(/_/g, ' ').replace(/ +/g, ' ').trim();
  }
  return word.toUpperCase();
}

/** Trim the clue and strip stray wrapping quotes. */
function cleanClue(s: string): string {
  return s.trim().replace(/^["']|["']$/g, '').trim();
}

function truncateForDisplay(s: string): string {
  const t = s.trim();
  return t.length > 60 ? `${t.slice(0, 57)}...` : t;
}
