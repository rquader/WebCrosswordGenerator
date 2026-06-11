/**
 * Circled-word overlay for word search grids.
 *
 * Draws one elongated rounded outline (a "marker circle") around each
 * word's run of cells, in whichever of the 8 directions the word goes —
 * the visual every printed word search answer key uses. One SVG sits on
 * top of the grid; coordinates are in cell units scaled by a viewBox, so
 * the same overlay works at any rendered grid size (interactive play
 * grid, print preview, print page).
 *
 * The host element must be position: relative and exactly enclose the
 * cell area (width = cols x cell, height = rows x cell).
 */

import type { DirectionalWord } from '../../logic/types';
import { getWordVector } from '../../logic/wordSearchGenerator';
import { WORD_CIRCLE_COLORS } from '../../utils/wordCircleColors';

export { WORD_CIRCLE_COLORS };

/** viewBox units per grid cell. */
const U = 100;

/** Capsule outline geometry, relative to the cell size. */
const CAPSULE_HEIGHT = 0.78 * U;   // fits within a row with breathing room
const CAPSULE_END_PAD = 0.42 * U;  // how far past the first/last cell centers the outline extends
const STROKE_WIDTH = 0.055 * U;

interface WordCircleOverlayProps {
  /** Words to circle, each with its grid position + direction vector. */
  words: DirectionalWord[];
  gridWidth: number;
  gridHeight: number;
  /**
   * Color index per word (defaults to the word's array index). Play mode
   * passes the order words were FOUND in so colors match the word list.
   */
  colorIndexFor?: (word: DirectionalWord, index: number) => number;
  /** Faint fill inside each outline (play mode); print keeps outlines only. */
  withFill?: boolean;
}

export function WordCircleOverlay({
  words,
  gridWidth,
  gridHeight,
  colorIndexFor,
  withFill = false,
}: WordCircleOverlayProps) {
  return (
    <svg
      viewBox={`0 0 ${gridWidth * U} ${gridHeight * U}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    >
      {words.map((word, index) => {
        const colorIndex = colorIndexFor ? colorIndexFor(word, index) : index;
        const color = WORD_CIRCLE_COLORS[colorIndex % WORD_CIRCLE_COLORS.length];
        const { dx, dy } = getWordVector(word);

        // Centers of the first and last cells, in viewBox units
        const x0 = (word.x + 0.5) * U;
        const y0 = (word.y + 0.5) * U;
        const x1 = (word.x + (word.word.length - 1) * dx + 0.5) * U;
        const y1 = (word.y + (word.word.length - 1) * dy + 0.5) * U;

        const length = Math.hypot(x1 - x0, y1 - y0) + CAPSULE_END_PAD * 2;
        const midX = (x0 + x1) / 2;
        const midY = (y0 + y1) / 2;
        const angle = (Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI;

        return (
          <rect
            key={`${word.word}-${word.x}-${word.y}`}
            x={midX - length / 2}
            y={midY - CAPSULE_HEIGHT / 2}
            width={length}
            height={CAPSULE_HEIGHT}
            rx={CAPSULE_HEIGHT / 2}
            ry={CAPSULE_HEIGHT / 2}
            transform={`rotate(${angle} ${midX} ${midY})`}
            fill={withFill ? color : 'none'}
            fillOpacity={withFill ? 0.1 : 0}
            stroke={color}
            strokeWidth={STROKE_WIDTH}
            strokeOpacity={0.9}
          />
        );
      })}
    </svg>
  );
}
