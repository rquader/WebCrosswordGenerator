import type { PuzzleMode, WordSearchDirectionSettings } from '../../logic/types';
import { DEFAULT_WORD_SEARCH_DIRECTIONS } from '../../logic/wordSearchGenerator';

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
  };
}
