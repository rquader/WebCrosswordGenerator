/**
 * Puzzle language support.
 *
 * The app supports Latin-script languages only (for now). A puzzle's
 * language decides three things:
 *   1. Which letters a word may contain (Spanish keeps its accented
 *      letters and Ñ; every other language is written in plain A-Z,
 *      with diacritics dropped on input — the standard crossword
 *      convention in those languages).
 *   2. Which profanity blocklist scrubs word-search filler
 *      (see src/data/blocklist.ts).
 *   3. What the AI word-list prompt asks for (words and clues in the
 *      selected language, with the matching charset rules).
 *
 * Digits are valid in words in every language (CO2, H2O, MP3...).
 *
 * Words may also be two-word phrases ("extra time"). Manual entry always
 * accepts a phrase — the space exists only in the DISPLAY form of a word;
 * the engine places the grid form with the space stripped (see toGridWord).
 * The allowTwoWords option only controls the AI builder: whether the
 * prompt asks for phrases and the response parser accepts them.
 * Pure TS — no DOM, no React.
 */

export type PuzzleLanguage =
  | 'english'
  | 'spanish'
  | 'french'
  | 'german'
  | 'italian'
  | 'portuguese';

export interface LanguageInfo {
  id: PuzzleLanguage;
  /** Selector label. */
  label: string;
  /**
   * Lowercase letters beyond a-z that words in this language may contain.
   * Only Spanish keeps accents — see the module comment.
   */
  extraLetters: string;
}

export const LANGUAGES: LanguageInfo[] = [
  { id: 'english', label: 'English', extraLetters: '' },
  { id: 'spanish', label: 'Spanish', extraLetters: 'áéíóúüñ' },
  { id: 'french', label: 'French', extraLetters: '' },
  { id: 'german', label: 'German', extraLetters: '' },
  { id: 'italian', label: 'Italian', extraLetters: '' },
  { id: 'portuguese', label: 'Portuguese', extraLetters: '' },
];

export const DEFAULT_LANGUAGE: PuzzleLanguage = 'english';

export function isPuzzleLanguage(value: unknown): value is PuzzleLanguage {
  return typeof value === 'string' && LANGUAGES.some(l => l.id === value);
}

export function getLanguageInfo(id: PuzzleLanguage): LanguageInfo {
  return LANGUAGES.find(l => l.id === id) ?? LANGUAGES[0];
}

/** Options shared by word normalization and validation. */
export interface WordRules {
  language?: PuzzleLanguage;
  /**
   * Have the AI builder suggest two-word phrases ("extra time").
   * Only wordCharsetRegex (the AI response gate) reads this — typed and
   * uploaded words always accept a phrase regardless.
   */
  allowTwoWords?: boolean;
}

/**
 * Normalize a raw user-typed word to the app's internal display form:
 * lowercase, language charset only, digits kept, at most single spaces
 * between words.
 *
 * This is the strict batch form — leading/trailing whitespace is gone.
 * For live typing in a text field use normalizeWordWhileTyping, which
 * keeps one trailing space so a second word can be typed at all.
 */
export function normalizeWord(raw: string, rules: WordRules = {}): string {
  return normalizeKeepingTrailingSpace(raw, rules).trim();
}

/**
 * Live-typing variant of normalizeWord: identical except a single
 * trailing space survives, because stripping it on every keystroke
 * would make typing the second word of a phrase impossible.
 */
export function normalizeWordWhileTyping(raw: string, rules: WordRules = {}): string {
  return normalizeKeepingTrailingSpace(raw, rules);
}

function normalizeKeepingTrailingSpace(raw: string, rules: WordRules): string {
  const language = rules.language ?? DEFAULT_LANGUAGE;
  const info = getLanguageInfo(language);

  let text = raw.normalize('NFC').toLowerCase();

  // ß is always written out as ss (no language keeps it in the grid).
  text = text.replace(/ß/g, 'ss');

  if (info.extraLetters.length === 0) {
    // Plain A-Z language: drop diacritics (é → e, ü → u, ç → c).
    text = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  const allowed = `a-z0-9${info.extraLetters} `;
  text = text.replace(new RegExp(`[^${allowed}]`, 'g'), '');
  text = text.replace(/ +/g, ' ').replace(/^ +/, '');

  return text;
}

/**
 * The engine form of a word: the display form with spaces removed.
 * "extra time" places (and prints in the grid) as "extratime" — a
 * crossword can't hold an empty cell mid-word, so two-word answers
 * are written solid, and the clue carries a "(2 words)" marker.
 */
export function toGridWord(word: string): string {
  return word.replace(/ /g, '');
}

/** Whether a display-form word is a two-word phrase. */
export function isTwoWordPhrase(word: string): boolean {
  return word.includes(' ');
}

/**
 * Validate an already-normalized display-form word.
 * Returns null when valid, otherwise a short human-readable problem.
 */
export function validateWord(word: string): string | null {
  if (word.length === 0) {
    return 'Word is required';
  }

  const spaceCount = word.split(' ').length - 1;
  if (spaceCount > 1) {
    return 'Two words at most';
  }
  if (word.split(' ').some(part => part.length === 0)) {
    return 'Word is required';
  }
  if (toGridWord(word).length < 2) {
    return 'Words need at least 2 letters';
  }

  return null;
}

/**
 * Case-insensitive full-word test for the language's charset, used by
 * the AI response parser (which works in upper case). Digits always
 * allowed; a single internal space allowed only with allowTwoWords.
 */
export function wordCharsetRegex(rules: WordRules = {}): RegExp {
  const info = getLanguageInfo(rules.language ?? DEFAULT_LANGUAGE);
  const letters = `a-z0-9${info.extraLetters}`;
  return rules.allowTwoWords
    ? new RegExp(`^[${letters}]+( [${letters}]+)?$`, 'i')
    : new RegExp(`^[${letters}]+$`, 'i');
}

/**
 * Uppercase a display-form word for grid-adjacent UI (handles Ñ and
 * accented vowels via the built-in Unicode mapping).
 */
export function displayWordUpper(word: string): string {
  return word.toUpperCase();
}
