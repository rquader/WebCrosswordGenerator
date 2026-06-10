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
}

export function createDefaultGenerationSettings(): GenerationSettings {
  return {
    width: 8,
    height: 8,
    seedText: '',
    puzzleMode: 'crossword',
    wordSearchDirections: { ...DEFAULT_WORD_SEARCH_DIRECTIONS },
    autoGridSize: true,
  };
}
