/**
 * Every starter template must be a well-formed crossword grid. This is the
 * guard that lets us hand-author templates safely: a pattern that breaks
 * symmetry, leaves a stray cell, makes a 1-2 letter word, or splits into
 * disconnected islands fails here and never ships.
 */

import { describe, it, expect } from 'vitest';
import { GRID_TEMPLATES, maskFromTemplateRows } from '../../src/logic/gridTemplates';
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
