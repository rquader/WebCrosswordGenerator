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
 */

import type { WordCluePair, PuzzleMode } from '../logic/types';

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
}

/**
 * Build the full prompt text.
 *
 * Structure (deterministic, in order): parameters block, topic context
 * block, existing words block (optional), output format instruction,
 * word constraints, closing. Objective spec only — no role-casting.
 */
export function buildWordListPrompt(options: WordListPromptOptions): string {
  const { context, wordCount, existingWords, gridWidth, gridHeight, puzzleMode } = options;
  const isCrossword = puzzleMode === 'crossword';
  const maxLen = Math.max(gridWidth, gridHeight);
  const puzzleName = isCrossword ? 'crossword puzzle' : 'word search puzzle';

  const lines: string[] = [];

  // 1 — Parameters block
  lines.push(`Generate a word list with clues for a ${puzzleName} on the topic described below.`);
  lines.push('');
  lines.push('REQUIREMENTS');
  lines.push(`- Number of words: exactly ${wordCount}.`);
  lines.push(`- Grid size: ${gridWidth}x${gridHeight} — no word may be longer than ${maxLen} letters.`);
  if (isCrossword) {
    lines.push('- Word length: 4 to 12 letters preferred.');
    lines.push('- Favor words with good letter variety and common letters (A, E, R, S, T, N) — they must interlock with other words in a crossword grid.');
  } else {
    lines.push('- Word length: 4 letters or more. Longer words are fine — they do not need to interlock.');
  }
  lines.push('- Each entry must be a single word — no spaces, no hyphens, no multi-word phrases. "goalkeeper" is correct; "goal keeper" is not.');
  lines.push('- Letters A-Z only: no numerals or abbreviations.');
  lines.push('- No proper nouns unless they are directly relevant to the topic.');
  lines.push('- Each clue: one sentence, at most 12 words, classroom-appropriate, and it must not contain the answer word.');
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

  // 4 — Output format instruction (the parser targets this exactly)
  lines.push('OUTPUT FORMAT');
  lines.push('Respond with ONLY a fenced code block. Inside it, one entry per line:');
  lines.push('');
  lines.push('WORD | Clue text');
  lines.push('');
  lines.push('Rules: WORD in ALL CAPS, a single pipe (|) as the separator, clue in sentence case.');
  lines.push(`Exactly ${wordCount} lines. No blank lines, no numbering, no text outside the code block.`);
  lines.push('');
  lines.push('Example format (do not copy these words):');
  lines.push('```');
  lines.push('EXAMPLE | A thing that shows what the format looks like.');
  lines.push('SAMPLE | A small part that represents the whole.');
  lines.push('```');
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

/** Leading list markers AIs add despite instructions: "1.", "2)", "-", "*", "•". */
const LIST_MARKER = /^\s*(?:[-*•]|\d{1,3}[.)])\s*/;

/**
 * Parse an AI response into word-clue entries.
 *
 * Finds the fenced code block and parses only its lines; everything
 * outside (preamble, postamble) is ignored. If the AI ignored the fence
 * instruction, falls back to scanning the whole text leniently: lines
 * without a pipe are treated as prose and skipped silently instead of
 * reported as errors.
 */
export function parseWordListResponse(
  raw: string,
  existingWords: string[] = []
): ParsedWordList {
  const result: ParsedWordList = { entries: [], issues: [], duplicatesSkipped: [] };
  if (!raw.trim()) {
    return result;
  }

  const block = findBestFencedBlock(raw);
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
    if (pipeIndex === -1) {
      if (!lenient) {
        result.issues.push({
          line: lineNumber,
          text: truncateForDisplay(rawLine),
          message: `Line ${lineNumber} couldn't be read — expected: WORD | Clue`,
        });
      }
      continue; // lenient mode: prose line, skip silently
    }

    const word = cleanWord(line.slice(0, pipeIndex));
    const clue = cleanClue(line.slice(pipeIndex + 1));

    if (/\s/.test(word)) {
      result.issues.push({
        line: lineNumber,
        text: truncateForDisplay(rawLine),
        message: `Line ${lineNumber} skipped — "${truncateForDisplay(line.slice(0, pipeIndex).trim())}" has a space; puzzle entries must be single words`,
      });
      continue;
    }

    if (!/^[A-Z]+$/.test(word) || word.length < 2) {
      result.issues.push({
        line: lineNumber,
        text: truncateForDisplay(rawLine),
        message: `Line ${lineNumber}: "${truncateForDisplay(line.slice(0, pipeIndex).trim()) || '(empty)'}" isn't a single word — letters only, no spaces or symbols`,
      });
      continue;
    }

    if (clue.length === 0) {
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
 * Find the fenced code block with the most pipe-lines (the AI sometimes
 * wraps a remark in its own small block). Returns the block's content
 * and the 0-based line index where its content starts in the raw text,
 * so issue messages can reference absolute line numbers.
 */
function findBestFencedBlock(raw: string): { content: string; startLine: number } | null {
  const fence = /```[^\n]*\n([\s\S]*?)```/g;
  let best: { content: string; startLine: number; score: number } | null = null;

  for (let match = fence.exec(raw); match !== null; match = fence.exec(raw)) {
    const content = match[1];
    const score = content.split('\n').filter(l => l.includes('|')).length;
    if (best === null || score > best.score) {
      const before = raw.slice(0, match.index);
      // content starts one line after the opening fence line
      const startLine = before.split('\n').length;
      best = { content, startLine, score };
    }
  }

  return best && best.score > 0 ? { content: best.content, startLine: best.startLine } : null;
}

/** Strip markdown bold/quotes around the word, uppercase it. */
function cleanWord(s: string): string {
  return s.trim().replace(/^[*_"'`]+|[*_"'`]+$/g, '').trim().toUpperCase();
}

/** Trim the clue and strip stray wrapping quotes. */
function cleanClue(s: string): string {
  return s.trim().replace(/^["']|["']$/g, '').trim();
}

function truncateForDisplay(s: string): string {
  const t = s.trim();
  return t.length > 60 ? `${t.slice(0, 57)}...` : t;
}
