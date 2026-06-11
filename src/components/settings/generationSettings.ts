import type { PuzzleMode, WordSearchDirectionSettings } from '../../logic/types';
import { DEFAULT_WORD_SEARCH_DIRECTIONS } from '../../logic/wordSearchGenerator';
import { DEFAULT_LANGUAGE, type PuzzleLanguage } from '../../logic/language';

export interface GenerationSettings {
  width: number;
  height: number;
  seedText: string;
  puzzleMode: PuzzleMode;
  wordSearchDirections: WordSearchDirectionSettings;
  /**
   * When true, the grid size follows the recommendation computed from the
   * word list; manual size edits switch this off.
   */
  autoGridSize: boolean;
  /**
   * When true, generation honors the chosen dimensions exactly: the grid
   * never auto-grows, words that don't fit are reported instead of rescued
   * by a resize. Implies manual sizing (autoGridSize off).
   */
  forceDimensions: boolean;
  /**
   * Puzzle language. Decides the word charset (Spanish keeps accents and Ñ),
   * the AI prompt's language, and the word-search filler blocklist.
   */
  language: PuzzleLanguage;
  /**
   * Permit two-word phrases ("extra time") as entries. They place in the
   * grid without the space; clue lists mark them "(2 words)".
   */
  allowTwoWords: boolean;
}

export function createDefaultGenerationSettings(): GenerationSettings {
  return {
    width: 8,
    height: 8,
    seedText: '',
    puzzleMode: 'crossword',
    wordSearchDirections: { ...DEFAULT_WORD_SEARCH_DIRECTIONS },
    autoGridSize: true,
    forceDimensions: false,
    language: DEFAULT_LANGUAGE,
    allowTwoWords: false,
  };
}
