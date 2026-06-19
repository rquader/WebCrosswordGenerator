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

/**
 * The curated set — one clean, fully-interlocked starting grid per common size.
 *
 * The 5 × 5 mini is hand-drawn (minis can't be fully checked). The 7–15 grids
 * were built by generateCrosswordMaskRows() at a hand-picked (seed, density)
 * per size, then FROZEN here as literal rows so they're stable and independent
 * of any future generator change. Each is a real newspaper-style crossword:
 * 180° rotationally symmetric, evenly-distributed black squares, every open
 * cell part of BOTH an across and a down word (fully checked, zero unchecked
 * cells), no word shorter than 3, a single connected region of white cells.
 *
 * These show FIRST in the gallery for the selected size; the generator
 * (generateCrosswordMaskRows) supplies extra on-demand variety alongside them.
 *
 * Frozen seeds (size : seed @ density): 7:23@.20, 8:488@.18, 9:162@.18,
 * 10:435@.18, 11:41@.16, 12:479@.16, 13:417@.18, 14:217@.18, 15:10@.20.
 */
export const GRID_TEMPLATES: GridTemplate[] = [
  {
    id: 'mini-5',
    name: '5 × 5',
    blurb: 'Mini',
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
    id: 'curated-7',
    name: '7 × 7',
    blurb: 'Curated',
    width: 7,
    height: 7,
    rows: [
      '###....',
      '#......',
      '#......',
      '...#...',
      '......#',
      '......#',
      '....###',
    ],
  },
  {
    id: 'curated-8',
    name: '8 × 8',
    blurb: 'Curated',
    width: 8,
    height: 8,
    rows: [
      '...#....',
      '...#....',
      '...#....',
      '.....###',
      '###.....',
      '....#...',
      '....#...',
      '....#...',
    ],
  },
  {
    id: 'curated-9',
    name: '9 × 9',
    blurb: 'Curated',
    width: 9,
    height: 9,
    rows: [
      '###.....#',
      '#........',
      '#........',
      '...#.....',
      '....#....',
      '.....#...',
      '........#',
      '........#',
      '#.....###',
    ],
  },
  {
    id: 'curated-10',
    name: '10 × 10',
    blurb: 'Curated',
    width: 10,
    height: 10,
    rows: [
      '...#......',
      '...#......',
      '...#......',
      '.....#...#',
      '#......###',
      '###......#',
      '#...#.....',
      '......#...',
      '......#...',
      '......#...',
    ],
  },
  {
    id: 'curated-11',
    name: '11 × 11',
    blurb: 'Curated',
    width: 11,
    height: 11,
    rows: [
      '.....#....#',
      '.....#.....',
      '.....#.....',
      '###........',
      '#...#......',
      '...#...#...',
      '......#...#',
      '........###',
      '.....#.....',
      '.....#.....',
      '#....#.....',
    ],
  },
  {
    id: 'curated-12',
    name: '12 × 12',
    blurb: 'Curated',
    width: 12,
    height: 12,
    rows: [
      '.....#.....#',
      '.....#......',
      '.....#......',
      '......#.....',
      '#...#...#...',
      '###.....#...',
      '...#.....###',
      '...#...#...#',
      '.....#......',
      '......#.....',
      '......#.....',
      '#.....#.....',
    ],
  },
  {
    id: 'curated-13',
    name: '13 × 13',
    blurb: 'Curated',
    width: 13,
    height: 13,
    rows: [
      '...#....##...',
      '........#....',
      '........#....',
      '#....#.......',
      '#...##....###',
      '...##........',
      '......#......',
      '........##...',
      '###....##...#',
      '.......#....#',
      '....#........',
      '....#........',
      '...##....#...',
    ],
  },
  {
    id: 'curated-14',
    name: '14 × 14',
    blurb: 'Curated',
    width: 14,
    height: 14,
    rows: [
      '...##....#....',
      '.........#....',
      '.........#....',
      '.....#.....###',
      '...#...#...###',
      '....#.....#...',
      '....#...#.....',
      '.....#...#....',
      '...#.....#....',
      '###...#...#...',
      '###.....#.....',
      '....#.........',
      '....#.........',
      '....#....##...',
    ],
  },
  {
    id: 'curated-15',
    name: '15 × 15',
    blurb: 'Curated',
    width: 15,
    height: 15,
    rows: [
      '...#...##...###',
      '.......#.......',
      '.......#.......',
      '....##....##...',
      '........##....#',
      '###......#.....',
      '#.....#........',
      '...##.....##...',
      '........#.....#',
      '.....#......###',
      '#....##........',
      '...##....##....',
      '.......#.......',
      '.......#.......',
      '###...##...#...',
    ],
  },
];

/**
 * Wrap a freshly generated mask as a GridTemplate so the gallery can show
 * algorithmic variants as pickable tiles alongside the curated ones. Used for
 * on-demand "generate a grid" at any dimension (deterministic per seed).
 */
export function generatedTemplate(width: number, height: number, seed: number): GridTemplate {
  return {
    id: `gen-${width}x${height}-${seed}`,
    name: `${width} × ${height}`,
    blurb: 'Generated',
    width,
    height,
    rows: generateCrosswordMaskRows(width, height, seed),
  };
}

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
