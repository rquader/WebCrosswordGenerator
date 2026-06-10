/**
 * Puzzle quality scoring.
 *
 * Scores a generated crossword so callers can produce several candidate
 * layouts and keep the best one. Higher is better.
 *
 * The score blends:
 *   - how many words were placed (dominant term)
 *   - intersection density (how interlocked the words are)
 *   - how centered the puzzle sits in the grid
 *   - direction balance (mix of across and down words)
 */

import type { CrosswordResult } from './types';

export interface PuzzleScore {
  /** Weighted total — higher is better. */
  total: number;
  /** Number of words placed. */
  wordCount: number;
  /** Cells shared by two words / total occupied cells (0 to ~0.5). */
  intersectionRatio: number;
  /** 1 = bounding box perfectly centered in the grid, 0 = pushed to a corner. */
  centering: number;
  /** 1 = equal across/down counts, 0 = all words in one direction. */
  directionBalance: number;
}

export function scoreCrossword(result: CrosswordResult): PuzzleScore {
  const { wordLocations, width, height } = result;

  if (wordLocations.length === 0) {
    return { total: 0, wordCount: 0, intersectionRatio: 0, centering: 0, directionBalance: 0 };
  }

  // Count how many words cover each cell; cells covered twice are intersections.
  const cellCover = new Map<string, number>();
  let minX = width;
  let maxX = -1;
  let minY = height;
  let maxY = -1;
  let acrossCount = 0;
  let downCount = 0;

  for (const loc of wordLocations) {
    if (loc.isHorizontal) acrossCount++;
    else downCount++;

    for (let i = 0; i < loc.word.length; i++) {
      const x = loc.isHorizontal ? loc.x + i : loc.x;
      const y = loc.isHorizontal ? loc.y : loc.y + i;
      const key = `${x},${y}`;
      cellCover.set(key, (cellCover.get(key) ?? 0) + 1);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  let occupiedCells = 0;
  let intersectionCells = 0;
  for (const count of cellCover.values()) {
    occupiedCells++;
    if (count > 1) intersectionCells++;
  }
  const intersectionRatio = intersectionCells / occupiedCells;

  // Centering: distance between the bounding-box center and the grid center,
  // normalized so a corner-crammed layout approaches 0.
  const boxCenterX = (minX + maxX) / 2;
  const boxCenterY = (minY + maxY) / 2;
  const offsetX = (boxCenterX - (width - 1) / 2) / Math.max(1, width / 2);
  const offsetY = (boxCenterY - (height - 1) / 2) / Math.max(1, height / 2);
  const centering = Math.max(0, 1 - Math.sqrt(offsetX * offsetX + offsetY * offsetY));

  const directionBalance = 1 - Math.abs(acrossCount - downCount) / wordLocations.length;

  // Word count dominates: a layout that places more words always beats one
  // that places fewer. The remaining terms break ties between equal coverage.
  const total =
    wordLocations.length * 10 +
    intersectionRatio * 5 +
    centering * 2 +
    directionBalance;

  return {
    total,
    wordCount: wordLocations.length,
    intersectionRatio,
    centering,
    directionBalance,
  };
}
