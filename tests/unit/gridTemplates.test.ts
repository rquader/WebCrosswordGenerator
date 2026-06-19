/**
 * Every starter template must be a well-formed crossword grid. This is the
 * guard that lets us hand-author templates safely: a pattern that breaks
 * symmetry, leaves a stray cell, makes a 1-2 letter word, or splits into
 * disconnected islands fails here and never ships.
 */

import { describe, it, expect } from 'vitest';
import {
  GRID_TEMPLATES,
  maskFromTemplateRows,
  generateCrosswordMaskRows,
  generatedTemplate,
} from '../../src/logic/gridTemplates';
import { deriveSlotsFromBlockMask } from '../../src/logic/gridSkeleton';

/** Count connected components of open cells (4-neighbour flood fill). */
function openComponentCount(mask: boolean[][], width: number, height: number): number {
  const seen = new Set<string>();
  const open = (x: number, y: number) =>
    x >= 0 && x < width && y >= 0 && y < height && !mask[y][x];
  let components = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!open(x, y) || seen.has(`${x},${y}`)) continue;
      components++;
      const stack: [number, number][] = [[x, y]];
      seen.add(`${x},${y}`);
      while (stack.length) {
        const [cx, cy] = stack.pop()!;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (open(nx, ny) && !seen.has(`${nx},${ny}`)) {
            seen.add(`${nx},${ny}`);
            stack.push([nx, ny]);
          }
        }
      }
    }
  }
  return components;
}

describe('GRID_TEMPLATES', () => {
  it('have unique ids and well-formed rows', () => {
    const ids = new Set<string>();
    for (const t of GRID_TEMPLATES) {
      expect(ids.has(t.id), `duplicate id ${t.id}`).toBe(false);
      ids.add(t.id);
      expect(t.rows.length, `${t.id} height`).toBe(t.height);
      for (const row of t.rows) {
        expect(row.length, `${t.id} row width`).toBe(t.width);
        expect(/^[.#]+$/.test(row), `${t.id} row chars: "${row}"`).toBe(true);
      }
    }
  });

  for (const t of GRID_TEMPLATES) {
    describe(t.id, () => {
      it('is 180-degree rotationally symmetric', () => {
        for (let y = 0; y < t.height; y++) {
          for (let x = 0; x < t.width; x++) {
            expect(
              t.rows[y][x],
              `asymmetry at (${x},${y})`,
            ).toBe(t.rows[t.height - 1 - y][t.width - 1 - x]);
          }
        }
      });

      it('has no stray cells and no word shorter than 3 letters', () => {
        const mask = maskFromTemplateRows(t.rows);
        const { slots } = deriveSlotsFromBlockMask(mask, t.width, t.height);

        for (const s of slots) {
          expect(
            s.length,
            `${t.id}: slot ${s.id}-${s.direction} is only ${s.length} long`,
          ).toBeGreaterThanOrEqual(3);
        }

        const covered = new Set<string>();
        for (const s of slots) {
          for (let i = 0; i < s.length; i++) {
            const x = s.direction === 'across' ? s.startX + i : s.startX;
            const y = s.direction === 'across' ? s.startY : s.startY + i;
            covered.add(`${x},${y}`);
          }
        }
        const stray: string[] = [];
        for (let y = 0; y < t.height; y++) {
          for (let x = 0; x < t.width; x++) {
            if (!mask[y][x] && !covered.has(`${x},${y}`)) stray.push(`${x},${y}`);
          }
        }
        expect(stray, `${t.id}: open cells in no word`).toEqual([]);
      });

      it('is a single connected region of open cells', () => {
        const mask = maskFromTemplateRows(t.rows);
        expect(openComponentCount(mask, t.width, t.height)).toBe(1);
      });

      it('has at least four slots to fill', () => {
        const mask = maskFromTemplateRows(t.rows);
        const { slots } = deriveSlotsFromBlockMask(mask, t.width, t.height);
        expect(slots.length).toBeGreaterThanOrEqual(4);
      });
    });
  }
});

describe('generateCrosswordMaskRows', () => {
  /** Assert a generated pattern meets the full template contract. */
  function checkValid(rows: string[], width: number, height: number, label: string) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        expect(rows[y][x], `${label}: asymmetry at (${x},${y})`).toBe(
          rows[height - 1 - y][width - 1 - x],
        );
      }
    }
    const mask = maskFromTemplateRows(rows);
    const { slots } = deriveSlotsFromBlockMask(mask, width, height);
    for (const s of slots) {
      expect(
        s.length,
        `${label}: slot ${s.id}-${s.direction} is only ${s.length} long`,
      ).toBeGreaterThanOrEqual(3);
    }
    const covered = new Set<string>();
    for (const s of slots) {
      for (let i = 0; i < s.length; i++) {
        const x = s.direction === 'across' ? s.startX + i : s.startX;
        const y = s.direction === 'across' ? s.startY : s.startY + i;
        covered.add(`${x},${y}`);
      }
    }
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!mask[y][x]) {
          expect(covered.has(`${x},${y}`), `${label}: stray cell (${x},${y})`).toBe(true);
        }
      }
    }
    expect(openComponentCount(mask, width, height), `${label}: components`).toBe(1);
  }

  for (const size of [7, 9, 11, 13, 15, 21]) {
    for (const seed of [1, 2, 3, 7, 42, 100]) {
      it(`produces a valid grid at ${size}x${size} (seed ${seed})`, () => {
        const rows = generateCrosswordMaskRows(size, size, seed);
        expect(rows.length).toBe(size);
        checkValid(rows, size, size, `${size}x${size}#${seed}`);
      });
    }
  }

  it('handles non-square dimensions', () => {
    const rows = generateCrosswordMaskRows(13, 9, 4);
    expect(rows.length).toBe(9);
    expect(rows[0].length).toBe(13);
    checkValid(rows, 13, 9, '13x9#4');
  });

  it('is deterministic for a seed and varies across seeds', () => {
    expect(generateCrosswordMaskRows(15, 15, 5)).toEqual(generateCrosswordMaskRows(15, 15, 5));
    expect(generateCrosswordMaskRows(15, 15, 5)).not.toEqual(generateCrosswordMaskRows(15, 15, 6));
  });

  it('places black squares at a standard size', () => {
    const blacks = generateCrosswordMaskRows(15, 15, 3).join('').split('').filter(c => c === '#').length;
    expect(blacks).toBeGreaterThan(0);
  });
});

describe('generatedTemplate', () => {
  for (const size of [9, 11, 13, 15, 17, 19, 21]) {
    for (const seed of [1, 2, 3, 4]) {
      it(`wraps a valid template at ${size}x${size} (seed ${seed})`, () => {
        const t = generatedTemplate(size, size, seed);
        expect(t.width).toBe(size);
        expect(t.height).toBe(size);
        expect(t.rows.length).toBe(size);
        expect(t.id).toBe(`gen-${size}x${size}-${seed}`);

        const mask = maskFromTemplateRows(t.rows);
        const { slots } = deriveSlotsFromBlockMask(mask, size, size);
        for (const s of slots) {
          expect(s.length, `slot ${s.id}-${s.direction}`).toBeGreaterThanOrEqual(3);
        }
        expect(slots.length).toBeGreaterThanOrEqual(4);
        expect(openComponentCount(mask, size, size)).toBe(1);
      });
    }
  }

  it('is deterministic for a given seed', () => {
    expect(generatedTemplate(15, 15, 2).rows).toEqual(generatedTemplate(15, 15, 2).rows);
  });
});
