import type { PuzzleMode, WordSearchDirectionSettings } from '../../logic/types';
import { DEFAULT_WORD_SEARCH_DIRECTIONS } from '../../logic/wordSearchGenerator';

export interface GenerationSettings {
  width: number;
  height: number;
  seedText: string;
  allowReverseWords: boolean;
  puzzleMode: PuzzleMode;
  wordSearchDirections: WordSearchDirectionSettings;
}

export function createDefaultGenerationSettings(): GenerationSettings {
  return {
    width: 8,
    height: 8,
    seedText: '',
    allowReverseWords: true,
    puzzleMode: 'crossword',
    wordSearchDirections: { ...DEFAULT_WORD_SEARCH_DIRECTIONS },
  };
}
