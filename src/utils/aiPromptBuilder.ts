/**
 * AI prompt builder — clipboard-only LLM assistance.
 *
 * The app never talks to any AI service. These helpers produce a well-formed
 * prompt the teacher pastes into ChatGPT/Gemini/Claude themselves; the answer
 * comes back through their clipboard. Zero network calls.
 */

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
  lines.push('Keep each clue under 80 characters and appropriate for a school classroom — no profanity, slurs, or crude, sexual, or violent content — and never include the answer word in its clue.');
  lines.push('Answer in exactly this format, one line per word, nothing else:');
  lines.push('');
  for (const entry of words) {
    lines.push(`${entry.label.toUpperCase()}: ${entry.word.toUpperCase()} | (your clue here)`);
  }

  return lines.join('\n');
}
