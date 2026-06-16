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
  /**
   * Crossword flagship "Optimized" generation mode. Set in the AI Words tab,
   * read by Generate. When on (crossword only), the AI prompt asks for a
   * larger best-first pool and Generate builds the densest/highest-quality
   * subset on a pinned canvas (createOptimizedPuzzleFromEntries). Off = the
   * standard words-to-puzzle path, unchanged.
   */
  optimizedMode: boolean;
  /**
   * Optimized mode's quality bias: 'grid' favors a denser puzzle, 'words'
   * favors the most interesting words, 'balanced' sits between. Mapped to a
   * numeric weight via {@link OPTIMIZED_BIAS} before it reaches the engine.
   * Also passed to the AI prompt builder so the AI's pool leans the same way.
   */
  qualityBias: 'grid' | 'balanced' | 'words';
  /**
   * Optimized mode's target puzzle word count — the pinned canvas is sized
   * for this (canvasForCount). The AI is asked for a multiple of it.
   */
  optimizedTargetCount: number;
}

/**
 * Quality-vs-fit weights passed to the optimized selector for each bias.
 * 'grid' leans toward density (lower weight); 'words' toward word quality;
 * 'balanced' is the measured midpoint (β=0.33 — a near-free fill cost for a
 * real quality gain, Phase 16 ADR-10 F1). Shared so the AI tab's bias choice
 * and Generate's engine call stay in sync.
 */
export const OPTIMIZED_BIAS = { grid: 0.2, balanced: 0.33, words: 0.45 } as const;

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
    optimizedMode: true,
    qualityBias: 'grid',
    optimizedTargetCount: 13,
  };
}
