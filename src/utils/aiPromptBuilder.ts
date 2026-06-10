/**
 * AI prompt builder — clipboard-only LLM assistance.
 *
 * The app never talks to any AI service. These helpers produce a well-formed
 * prompt the teacher pastes into ChatGPT/Gemini/Claude themselves; the answer
 * comes back through their clipboard. Zero network calls.
 */

import type { SkeletonSlot } from '../logic/types';

/**
 * Render a slot's constraint pattern like "_ A _ _ E _".
 * Underscores are free letters; uppercase letters are locked by crossings.
 */
export function slotPattern(slot: SkeletonSlot, constraints: Map<number, string>): string {
  const parts: string[] = [];
  for (let i = 0; i < slot.length; i++) {
    const locked = constraints.get(i);
    parts.push(locked ? locked.toUpperCase() : '_');
  }
  return parts.join(' ');
}

export interface SlotPromptInfo {
  /** Display label, e.g. "4-Down". */
  label: string;
  length: number;
  /** Live constraints for the slot (locked letters by position). */
  constraints: Map<number, string>;
}

/**
 * Build a prompt asking an AI for words + clues that fit the blank slots.
 *
 * Includes each slot's exact length and locked-letter pattern, the puzzle's
 * theme words for context, and strict output-format instructions so the
 * answer is easy to copy back in.
 */
export function buildSlotFillPrompt(options: {
  themeWords: string[];
  slots: SlotPromptInfo[];
}): string {
  const { themeWords, slots } = options;

  const lines: string[] = [];
  lines.push('I am building a crossword puzzle and need words that fit specific letter patterns.');
  if (themeWords.length > 0) {
    lines.push(`The puzzle's theme words so far: ${themeWords.map(w => w.toUpperCase()).join(', ')}.`);
    lines.push('Suggested words should fit the same general theme or difficulty when possible, but fitting the pattern matters most.');
  }
  lines.push('');
  lines.push('For each slot below, suggest ONE word that matches the pattern exactly, plus a short clue.');
  lines.push('Patterns show one position per symbol: an underscore is any letter; a capital letter is fixed and must appear at exactly that position.');
  lines.push('');

  for (const slot of slots) {
    lines.push(`${slot.label}: ${slot.length} letters, pattern: ${slotPattern({ length: slot.length } as SkeletonSlot, slot.constraints)}`);
  }

  lines.push('');
  lines.push('Rules:');
  lines.push('- Single English words only (no spaces, hyphens, or proper nouns)');
  lines.push('- Common words a student would know');
  lines.push('- Clues under 80 characters, no clue may contain its answer');
  lines.push('- Answer in exactly this format, one line per slot, nothing else:');
  lines.push('');
  lines.push('4-DOWN: WORD | clue text here');

  return lines.join('\n');
}

/**
 * Build a prompt asking an AI to write missing clues for filled words.
 */
export function buildCluePrompt(options: {
  words: { label: string; word: string }[];
  themeWords: string[];
}): string {
  const { words, themeWords } = options;

  const lines: string[] = [];
  lines.push('Write crossword clues for these answers.');
  if (themeWords.length > 0) {
    lines.push(`The puzzle's theme: related to ${themeWords.map(w => w.toUpperCase()).join(', ')}.`);
  }
  lines.push('Keep each clue under 80 characters, suitable for students, and never include the answer word in its clue.');
  lines.push('Answer in exactly this format, one line per word, nothing else:');
  lines.push('');
  for (const entry of words) {
    lines.push(`${entry.label.toUpperCase()}: ${entry.word.toUpperCase()} | (your clue here)`);
  }

  return lines.join('\n');
}
