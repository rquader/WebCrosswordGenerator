/**
 * Starter crossword grid templates for "Build your own grid".
 *
 * OURS — not sourced from any external dataset, so there is no third-party
 * license to honor. The small ones are hand-drawn; the standard sizes are built
 * by generateCrosswordMaskRows() (below) at fixed, hand-picked seeds and frozen
 * as stable named presets. Either way every template follows standard
 * American-crossword *conventions* (a convention, not a copyrightable artifact):
 * 180° rotational symmetry, every open cell part of a word, no word shorter than
 * 3 letters, a single connected region of white cells. The whole set — and the
 * generator itself — is verified by tests/unit/gridTemplates.test.ts, so a
 * malformed pattern can never ship.
 *
 * '#' = black square, '.' = open cell; indexed [y][x] to match the grid code.
 */

import type { BlockMask } from './gridSkeleton';
import { SeededRandom } from './seedRandom';

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
  // Hand-drawn small patterns (distinct styles).
  {
    id: 'mini-5',
    name: '5 × 5',
    blurb: 'Mini — six five-letter words',
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
    name: '7 × 7',
    blurb: 'Compact — short words',
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
  // Standard, fully-interlocked grids across the common sizes — produced by the
  // generator below at fixed, hand-picked seeds (frozen here so they're stable
  // named presets; the test suite verifies every one).
  {
    id: 'std-8',
    name: '8 × 8',
    blurb: 'Fully interlocked',
    width: 8,
    height: 8,
    rows: generateCrosswordMaskRows(8, 8, 1),
  },
  {
    id: 'std-9',
    name: '9 × 9',
    blurb: 'Fully interlocked',
    width: 9,
    height: 9,
    rows: generateCrosswordMaskRows(9, 9, 1),
  },
  {
    id: 'std-10',
    name: '10 × 10',
    blurb: 'Fully interlocked',
    width: 10,
    height: 10,
    rows: generateCrosswordMaskRows(10, 10, 3),
  },
  // Hand-drawn open style (fewer blacks, some longer answers).
  {
    id: 'diamond-11',
    name: '11 × 11',
    blurb: 'Open — a few longer answers',
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
    id: 'std-12',
    name: '12 × 12',
    blurb: 'Fully interlocked',
    width: 12,
    height: 12,
    rows: generateCrosswordMaskRows(12, 12, 3),
  },
  {
    id: 'classic-13',
    name: '13 × 13',
    blurb: 'Open — roomy',
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
  {
    id: 'std-15',
    name: '15 × 15',
    blurb: 'A full-size crossword',
    width: 15,
    height: 15,
    rows: generateCrosswordMaskRows(15, 15, 3),
  },
];

/**
 * Convert a template's rows ('#' = block, '.' = open) to a BlockMask
 * (true = block), the shape GridDesigner / deriveSlotsFromBlockMask expect.
 */
export function maskFromTemplateRows(rows: string[]): BlockMask {
  return rows.map(row => row.split('').map(ch => ch === '#'));
}

/**
 * Generate a valid crossword black-square pattern for ANY size, seeded.
 *
 * Valid BY CONSTRUCTION: black squares are placed in 180°-symmetric pairs, and
 * a pair is kept only if every white run it touches (across AND down) stays
 * length 0 or >= 3 and the white cells remain a single connected region. That
 * invariant guarantees a fully-interlocked grid — no word shorter than 3, no
 * stray cell, symmetric, connected — the same contract GRID_TEMPLATES meet, at
 * any width/height. Deterministic: same (width, height, seed, density) yields
 * the same grid; bump the seed to reshuffle.
 *
 * `density` is the target fraction of black squares (~0.16 ≈ a standard
 * American crossword). Generation stops at the target, or when no further
 * symmetric pair can be placed without breaking the invariant.
 */
export function generateCrosswordMaskRows(
  width: number,
  height: number,
  seed: number,
  density = 0.16,
): string[] {
  const block: boolean[][] = Array.from(
    { length: height },
    () => new Array<boolean>(width).fill(false),
  );

  // Every maximal white run in a line must be length 0 or >= 3.
  const lineOk = (cells: boolean[]): boolean => {
    let run = 0;
    for (let i = 0; i <= cells.length; i++) {
      const white = i < cells.length && !cells[i];
      if (white) { run++; continue; }
      if (run > 0 && run < 3) return false;
      run = 0;
    }
    return true;
  };
  const column = (x: number): boolean[] => {
    const c = new Array<boolean>(height);
    for (let y = 0; y < height; y++) c[y] = block[y][x];
    return c;
  };
  // White cells form a single connected region (4-neighbour flood fill).
  const connected = (): boolean => {
    let start: [number, number] | null = null;
    let whites = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!block[y][x]) { whites++; if (!start) start = [x, y]; }
      }
    }
    if (!start) return false;
    const seen = new Set<string>([`${start[0]},${start[1]}`]);
    const stack: [number, number][] = [start];
    while (stack.length) {
      const [cx, cy] = stack.pop()!;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
        if (block[ny][nx] || seen.has(`${nx},${ny}`)) continue;
        seen.add(`${nx},${ny}`);
        stack.push([nx, ny]);
      }
    }
    return seen.size === whites;
  };

  // One cell per symmetric pair (the cell whose row-major index is <= its
  // partner's), so we never process a pair twice.
  const domain: [number, number][] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const partnerIndex = (height - 1 - y) * width + (width - 1 - x);
      if (y * width + x <= partnerIndex) domain.push([x, y]);
    }
  }
  const rng = new SeededRandom((seed * 2654435761) | 0 || 1);
  rng.shuffle(domain);

  const target = Math.round(density * width * height);
  let blacks = 0;

  for (const [x, y] of domain) {
    if (blacks >= target) break;
    if (block[y][x]) continue;
    const px = width - 1 - x;
    const py = height - 1 - y;
    const cells: [number, number][] = px === x && py === y ? [[x, y]] : [[x, y], [px, py]];

    for (const [cx, cy] of cells) block[cy][cx] = true;

    let ok = true;
    const rows = new Set(cells.map(c => c[1]));
    const cols = new Set(cells.map(c => c[0]));
    for (const ry of rows) if (!lineOk(block[ry])) { ok = false; break; }
    if (ok) for (const cx of cols) if (!lineOk(column(cx))) { ok = false; break; }
    if (ok) ok = connected();

    if (ok) blacks += cells.length;
    else for (const [cx, cy] of cells) block[cy][cx] = false; // revert
  }

  return block.map(row => row.map(b => (b ? '#' : '.')).join(''));
}
