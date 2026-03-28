/**
 * Crossword numbering utility.
 *
 * Standard crossword numbering assigns a number to each cell that starts
 * a word (either across or down). Numbers are assigned left-to-right,
 * top-to-bottom, starting at 1.
 *
 * A cell gets a number if it's the start of any placed word.
 */

import type { DirectionalWord } from './types';

export interface NumberedCell {
  x: number;
  y: number;
  number: number;
}

export interface NumberedClue {
  number: number;
  word: string;
  clue: string;
  isHorizontal: boolean;
  isReversed: boolean;
  x: number;
  y: number;
}

/**
 * Assign crossword-standard numbers to cells that start words.
 * Returns both the cell numbers and the clues with their assigned numbers.
 */
export function assignNumbers(
  wordLocations: DirectionalWord[],
  width: number,
  height: number
): { cells: NumberedCell[]; acrossClues: NumberedClue[]; downClues: NumberedClue[] } {
  // Build a map of (x, y) -> list of words starting there
  const startMap = new Map<string, DirectionalWord[]>();
  for (const word of wordLocations) {
    const key = word.x + ',' + word.y;
    const existing = startMap.get(key);
    if (existing) {
      existing.push(word);
    } else {
      startMap.set(key, [word]);
    }
  }

  // Assign numbers scanning left-to-right, top-to-bottom
  const cells: NumberedCell[] = [];
  const acrossClues: NumberedClue[] = [];
  const downClues: NumberedClue[] = [];
  let currentNumber = 1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const key = x + ',' + y;
      const wordsHere = startMap.get(key);
      if (!wordsHere) continue;

      const number = currentNumber;
      cells.push({ x, y, number });
      currentNumber++;

      // Sort so horizontal (across) comes before vertical (down)
      for (const word of wordsHere) {
        const clue: NumberedClue = {
          number,
          word: word.word,
          clue: word.clue,
          isHorizontal: word.isHorizontal,
          isReversed: word.isReversed,
          x: word.x,
          y: word.y,
        };

        if (word.isHorizontal) {
          acrossClues.push(clue);
        } else {
          downClues.push(clue);
        }
      }
    }
  }

  return { cells, acrossClues, downClues };
}
