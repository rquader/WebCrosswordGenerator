/**
 * Database processing utilities for filtering word-clue pairs.
 *
 * Ported from DatabaseProcessor.java by Kabir Khan.
 * These functions filter preset data by word length before
 * passing to the generator.
 */

import type { WordCluePair } from './types';

/**
 * Filter entries to only include words that fit within the given max length.
 * In the Java version, this filtered by word.length <= maxLength.
 */
export function filterByLength(entries: WordCluePair[], maxLength: number): WordCluePair[] {
  const result: WordCluePair[] = [];
  for (const entry of entries) {
    if (entry.word.length <= maxLength) {
      result.push(entry);
    }
  }
  return result;
}

/**
 * Extract just the words from a list of word-clue pairs.
 */
export function getWords(entries: WordCluePair[]): string[] {
  const words: string[] = [];
  for (const entry of entries) {
    words.push(entry.word);
  }
  return words;
}

/**
 * Extract just the clues from a list of word-clue pairs.
 */
export function getClues(entries: WordCluePair[]): string[] {
  const clues: string[] = [];
  for (const entry of entries) {
    clues.push(entry.clue);
  }
  return clues;
}

/**
 * Look up the clue for a specific word from the entries list.
 * Returns undefined if the word is not found.
 */
export function getClueForWord(entries: WordCluePair[], word: string): string | undefined {
  for (const entry of entries) {
    if (entry.word === word) {
      return entry.clue;
    }
  }
  return undefined;
}

/**
 * Filter and split entries into separate word and clue arrays,
 * ready to pass into the generator.
 * This combines filterByLength + getWords + getClues into one call.
 */
export function prepareForGenerator(
  entries: WordCluePair[],
  maxLength: number
): { words: string[]; clues: string[] } {
  const filtered = filterByLength(entries, maxLength);
  return {
    words: getWords(filtered),
    clues: getClues(filtered),
  };
}
