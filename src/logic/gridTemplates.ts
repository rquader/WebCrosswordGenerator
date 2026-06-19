/**
 * Starter crossword grid templates for "Build your own grid".
 *
 * HAND-AUTHORED — not sourced from any external dataset, so there is no
 * third-party license to honor. They follow standard American-crossword
 * *conventions* (a convention, not a copyrightable artifact): 180° rotational
 * symmetry, every open cell part of at least one word, no word shorter than 3
 * letters, and a single connected region of white cells. The whole set is
 * verified by tests/unit/gridTemplates.test.ts, so a malformed pattern can
 * never ship — add new templates there and the test will keep them honest.
 *
 * Pure data + a single helper. '#' = black square, '.' = open cell; indexed
 * [y][x] to match the rest of the grid code.
 */

import type { BlockMask } from './gridSkeleton';

export interface GridTemplate {
  /** Stable id (used as the React key + selection identity). */
  id: string;
  /** Short display name shown above the preview. */
  name: string;
  /** One-line description shown under the preview. */
  blurb: string;
  width: number;
  height: number;
  /** One string per row; '#' = block, '.' = open cell. */
  rows: string[];
}

export const GRID_TEMPLATES: GridTemplate[] = [
  {
    id: 'mini-5',
    name: 'Mini',
    blurb: '5×5 · six five-letter words',
    width: 5,
    height: 5,
    rows: [
      '.....',
      '.#.#.',
      '.....',
      '.#.#.',
      '.....',
    ],
  },
  {
    id: 'compact-7',
    name: 'Compact',
    blurb: '7×7 · short words, quick to fill',
    width: 7,
    height: 7,
    rows: [
      '...#...',
      '...#...',
      '.......',
      '###.###',
      '.......',
      '...#...',
      '...#...',
    ],
  },
  {
    id: 'diamond-11',
    name: 'Diamond',
    blurb: '11×11 · open, with a few longer answers',
    width: 11,
    height: 11,
    rows: [
      '...........',
      '...........',
      '...........',
      '.....#.....',
      '...........',
      '...#...#...',
      '...........',
      '.....#.....',
      '...........',
      '...........',
      '...........',
    ],
  },
  {
    id: 'classic-13',
    name: 'Classic',
    blurb: '13×13 · roomy, fits plenty of words',
    width: 13,
    height: 13,
    rows: [
      '.............',
      '.............',
      '.............',
      '.............',
      '....#...#....',
      '.............',
      '.............',
      '.............',
      '....#...#....',
      '.............',
      '.............',
      '.............',
      '.............',
    ],
  },
];

/**
 * Convert a template's rows ('#' = block, '.' = open) to a BlockMask
 * (true = block), the shape GridDesigner / deriveSlotsFromBlockMask expect.
 */
export function maskFromTemplateRows(rows: string[]): BlockMask {
  return rows.map(row => row.split('').map(ch => ch === '#'));
}
