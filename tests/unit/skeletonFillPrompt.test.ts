/**
 * Tests for the slot-aware AI fill prompt builder and response parser used by
 * the skeleton-first ("build your own grid") flow.
 *
 * Unlike the AI Words tab (a flat word list), this flow has FIXED geometry:
 * the user drew the grid, so every answer must fit an exact slot — right
 * length, agreeing with locked cells and with the letters its crossings
 * impose. The prompt addresses each empty slot by its crossword number and
 * direction; the parser maps labeled lines back to those slots and validates
 * length / locked letters / charset / cross-agreement.
 *
 * Fixtures are built from REAL geometry via deriveSlotsFromBlockMask +
 * computeIntersections (no hand-authored slot objects), so the tests exercise
 * the same SkeletonSlot / SlotIntersection shapes the app produces.
 */

import { describe, it, expect } from 'vitest';
import {
  deriveSlotsFromBlockMask,
  computeIntersections,
  type BlockMask,
} from '../../src/logic/gridSkeleton';
import {
  buildSkeletonFillPrompt,
  parseSkeletonFillResponse,
  fillSkeletonFromResponse,
} from '../../src/utils/skeletonFillPrompt';

/** '#' = block, anything else = open. One row per string. */
function maskFromRows(rows: string[]): { mask: BlockMask; width: number; height: number } {
  const mask = rows.map(row => row.split('').map(ch => ch === '#'));
  const height = mask.length;
  const width = height > 0 ? mask[0].length : 0;
  return { mask, width, height };
}

/** A 5x5 window-pane: rich crossings (every across meets every down). */
const PANE_ROWS = [
  '.....',
  '.#.#.',
  '.....',
  '.#.#.',
  '.....',
];

/** A 5x5 plus: one across slot, one down slot, one crossing at the center. */
const PLUS_ROWS = [
  '##.##',
  '##.##',
  '.....',
  '##.##',
  '##.##',
];

function paneFixture() {
  const { mask, width, height } = maskFromRows(PANE_ROWS);
  const { slots } = deriveSlotsFromBlockMask(mask, width, height);
  const intersections = computeIntersections(slots);
  return { slots, intersections, width, height };
}

function plusFixture() {
  const { mask, width, height } = maskFromRows(PLUS_ROWS);
  const { slots } = deriveSlotsFromBlockMask(mask, width, height);
  const intersections = computeIntersections(slots);
  return { slots, intersections, width, height };
}

/** An all-empty grid ('-' = empty cell) sized to a fixture. */
function emptyGrid(width: number, height: number): string[][] {
  return Array.from({ length: height }, () => new Array<string>(width).fill('-'));
}

const baseContext = 'Unit 3: photosynthesis and plant biology for 7th grade.';

describe('buildSkeletonFillPrompt', () => {
  it('emits a labeled line with length and pattern for every empty slot', () => {
    const { slots, intersections, width, height } = paneFixture();
    const prompt = buildSkeletonFillPrompt({
      slots,
      intersections,
      width,
      height,
      grid: emptyGrid(width, height),
      context: baseContext,
    });

    // Every empty slot (all of them here) must appear as "{id}-{DIR}: N letters".
    for (const slot of slots) {
      const dir = slot.direction === 'across' ? 'ACROSS' : 'DOWN';
      expect(prompt).toContain(`${slot.id}-${dir}: ${slot.length} letters`);
    }
    // Patterns use the slotPattern format (all underscores for a blank slot).
    expect(prompt).toContain('pattern _ _ _ _ _');
  });

  it('renders locked-letter patterns from the grid', () => {
    const { slots, intersections, width, height } = plusFixture();
    const grid = emptyGrid(width, height);
    // Lock the center cell (2,2) to E — shared by the across and down slot.
    grid[2][2] = 'E';

    const prompt = buildSkeletonFillPrompt({
      slots,
      intersections,
      width,
      height,
      grid,
      context: baseContext,
    });

    // The across slot spans cols 0-4 of row 2; locked at position 2 -> _ _ E _ _
    expect(prompt).toContain('pattern _ _ E _ _');
    // The grid ASCII must show the locked letter and use '.' for open slot cells.
    expect(prompt).toContain('THE GRID');
    expect(prompt).toContain('SLOTS TO FILL');
  });

  it('describes each crossing with a 1-based letter index and documents the convention', () => {
    const { slots, intersections, width, height } = plusFixture();
    const prompt = buildSkeletonFillPrompt({
      slots,
      intersections,
      width,
      height,
      grid: emptyGrid(width, height),
      context: baseContext,
    });

    // Plus: across id2 crosses down id1 at the center. acrossPos 2 / downPos 2
    // -> 1-based letter 3 on both sides.
    const across = slots.find(s => s.direction === 'across')!;
    const down = slots.find(s => s.direction === 'down')!;
    expect(prompt).toContain(`crosses ${down.id}-DOWN at letter 3`);
    expect(prompt).toContain(`crosses ${across.id}-ACROSS at letter 3`);
    // The convention (letters counted from 1) must be stated for the human.
    expect(prompt.toLowerCase()).toContain('letter 1');
  });

  it('includes the REQUIREMENTS rules, charset, topic context, and output format', () => {
    const { slots, intersections, width, height } = paneFixture();
    const prompt = buildSkeletonFillPrompt({
      slots,
      intersections,
      width,
      height,
      grid: emptyGrid(width, height),
      context: baseContext,
    });

    expect(prompt).toContain('REQUIREMENTS');
    expect(prompt).toContain('Language: English');
    expect(prompt).toContain('letters A-Z and digits 0-9'); // charsetLines reuse
    // The fit/cross rules (the whole point of slot-aware fill).
    expect(prompt.toLowerCase()).toContain('exactly');
    expect(prompt.toLowerCase()).toContain('cross');
    // Topic context, fenced verbatim.
    expect(prompt).toContain('===BEGIN TOPIC CONTEXT===');
    expect(prompt).toContain(baseContext);
    expect(prompt).toContain('===END TOPIC CONTEXT===');
    // Output format: labeled lines.
    expect(prompt).toContain('OUTPUT FORMAT');
    expect(prompt).toContain('| Clue');
    expect(prompt).toContain('Respond with the code block only.');
  });

  it('mirrors the single-word and no-proper-noun rules by default', () => {
    const { slots, intersections, width, height } = paneFixture();
    const prompt = buildSkeletonFillPrompt({
      slots,
      intersections,
      width,
      height,
      grid: emptyGrid(width, height),
      context: baseContext,
    });

    expect(prompt).toContain('must be a single word');
    expect(prompt).toContain('No proper nouns');
  });

  it('switches to two-word phrasing and drops the proper-noun ban when allowed', () => {
    const { slots, intersections, width, height } = paneFixture();
    const prompt = buildSkeletonFillPrompt({
      slots,
      intersections,
      width,
      height,
      grid: emptyGrid(width, height),
      context: baseContext,
      allowTwoWords: true,
      allowProperNouns: true,
    });

    expect(prompt).toContain('EXTRA_TIME');
    expect(prompt).not.toContain('No proper nouns');
  });

  it('forbids merging separate words by default and mandates the underscore when phrases are on', () => {
    const { slots, intersections, width, height } = paneFixture();
    const common = {
      slots,
      intersections,
      width,
      height,
      grid: emptyGrid(width, height),
      context: baseContext,
    };

    // Default (single-word): no symbol-less concatenation (CARBONDIOXIDE etc.).
    const single = buildSkeletonFillPrompt(common);
    expect(single).toContain('not by running them together');
    expect(single).toContain('CARBONDIOXIDE');

    // Two-word on: the underscore is mandatory so the boundary is detectable.
    const twoWord = buildSkeletonFillPrompt({ ...common, allowTwoWords: true });
    expect(twoWord).toContain('MUST keep the underscore');
  });

  it('appends the spare-pool tail only when solverAssist is on', () => {
    const { slots, intersections, width, height } = paneFixture();
    const common = {
      slots,
      intersections,
      width,
      height,
      grid: emptyGrid(width, height),
      context: baseContext,
    };

    const without = buildSkeletonFillPrompt({ ...common, solverAssist: false });
    const withTail = buildSkeletonFillPrompt({ ...common, solverAssist: true });

    expect(without).not.toContain('EXTRA');
    expect(withTail).toContain('EXTRA');
    // Tail lists the distinct slot lengths so spares are useful (all len 5 here).
    expect(withTail).toContain('5');
  });

  it('lists already-placed (filled) slots under a do-not-change heading', () => {
    const { slots, intersections, width, height } = plusFixture();
    const across = slots.find(s => s.direction === 'across')!;
    // Mark the across slot as already filled.
    const filled = slots.map(s =>
      s === across ? { ...s, word: 'apple', clue: 'A common fruit.', isUserWord: true } : s
    );

    const prompt = buildSkeletonFillPrompt({
      slots: filled,
      intersections,
      width,
      height,
      grid: emptyGrid(width, height),
      context: baseContext,
    });

    expect(prompt).toContain('ALREADY PLACED');
    expect(prompt).toContain('APPLE');
    // The filled slot must NOT appear in the SLOTS TO FILL list as an empty slot.
    const fillSection = prompt.slice(prompt.indexOf('SLOTS TO FILL'), prompt.indexOf('ALREADY PLACED'));
    const dir = across.direction === 'across' ? 'ACROSS' : 'DOWN';
    expect(fillSection).not.toContain(`${across.id}-${dir}: ${across.length} letters`);
  });

  it('honors the Spanish charset', () => {
    const { slots, intersections, width, height } = paneFixture();
    const prompt = buildSkeletonFillPrompt({
      slots,
      intersections,
      width,
      height,
      grid: emptyGrid(width, height),
      context: baseContext,
      language: 'spanish',
    });

    expect(prompt).toContain('Language: Spanish');
    expect(prompt).toContain('Á É Í Ó Ú Ü Ñ');
  });
});

describe('parseSkeletonFillResponse', () => {
  it('maps labeled lines back to their slots by id + direction', () => {
    const { slots, intersections } = plusFixture();
    const across = slots.find(s => s.direction === 'across')!;
    const down = slots.find(s => s.direction === 'down')!;

    const response = [
      'Here you go:',
      '```',
      `${across.id}-ACROSS: PLANT | A living green organism.`,
      `${down.id}-DOWN: LEAFY | Full of foliage.`,
      '```',
    ].join('\n');

    const result = parseSkeletonFillResponse(response, { slots, intersections });

    expect(result.assignments.get(across.id)?.word).toBe('PLANT');
    expect(result.assignments.get(across.id)?.clue).toBe('A living green organism.');
    expect(result.assignments.get(down.id)?.word).toBe('LEAFY');
    expect(result.issues).toHaveLength(0);
    expect(result.pool).toHaveLength(0);
  });

  it('rejects a word of the wrong length with an issue, not an assignment', () => {
    const { slots, intersections } = plusFixture();
    const across = slots.find(s => s.direction === 'across')!; // length 5

    const response = ['```', `${across.id}-ACROSS: SUN | The star at the center.`, '```'].join('\n');
    const result = parseSkeletonFillResponse(response, { slots, intersections });

    expect(result.assignments.has(across.id)).toBe(false);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].message.toLowerCase()).toContain('length');
  });

  it('rejects a word that disagrees with a locked grid letter', () => {
    const { slots, intersections, width, height } = plusFixture();
    const across = slots.find(s => s.direction === 'across')!;
    const grid = emptyGrid(width, height);
    grid[2][2] = 'Z'; // center locked to Z; PLANT has A there -> conflict.

    const response = ['```', `${across.id}-ACROSS: PLANT | A green organism.`, '```'].join('\n');
    const result = parseSkeletonFillResponse(response, { slots, intersections, grid });

    expect(result.assignments.has(across.id)).toBe(false);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].message.toLowerCase()).toContain('locked');
  });

  it('rejects a word with illegal characters via the charset', () => {
    const { slots, intersections } = plusFixture();
    const across = slots.find(s => s.direction === 'across')!; // length 5

    const response = ['```', `${across.id}-ACROSS: PL@NT | Has a symbol.`, '```'].join('\n');
    const result = parseSkeletonFillResponse(response, { slots, intersections });

    expect(result.assignments.has(across.id)).toBe(false);
    expect(result.issues).toHaveLength(1);
  });

  it('drops the later of two crossing answers that disagree on the shared letter', () => {
    const { slots, intersections } = plusFixture();
    const across = slots.find(s => s.direction === 'across')!; // crosses down at letter 3 (pos 2)
    const down = slots.find(s => s.direction === 'down')!;

    // PLANT has 'A' at position 2; GRAPE has 'A' at position 2 -> they AGREE.
    // Use a deliberate disagreement: across PLANT (pos2 'A'), down ZEBRA (pos2 'B').
    const response = [
      '```',
      `${across.id}-ACROSS: PLANT | A green organism.`,
      `${down.id}-DOWN: ZEBRA | A striped animal.`,
      '```',
    ].join('\n');

    const result = parseSkeletonFillResponse(response, { slots, intersections });

    // First accepted (PLANT) stays; the conflicting later one (ZEBRA) is dropped.
    expect(result.assignments.get(across.id)?.word).toBe('PLANT');
    expect(result.assignments.has(down.id)).toBe(false);
    expect(result.issues.some(i => i.message.toLowerCase().includes('cross'))).toBe(true);
  });

  it('keeps two crossing answers that agree on the shared letter', () => {
    const { slots, intersections } = plusFixture();
    const across = slots.find(s => s.direction === 'across')!;
    const down = slots.find(s => s.direction === 'down')!;

    // PLANT pos2 = 'A'; GRAPE pos2 = 'A' -> agree at the crossing.
    const response = [
      '```',
      `${across.id}-ACROSS: PLANT | A green organism.`,
      `${down.id}-DOWN: GRAPE | A small round fruit.`,
      '```',
    ].join('\n');

    const result = parseSkeletonFillResponse(response, { slots, intersections });

    expect(result.assignments.get(across.id)?.word).toBe('PLANT');
    expect(result.assignments.get(down.id)?.word).toBe('GRAPE');
    expect(result.issues).toHaveLength(0);
  });

  it('routes unlabeled WORD | clue lines to the spare pool', () => {
    const { slots, intersections } = plusFixture();
    const across = slots.find(s => s.direction === 'across')!;

    const response = [
      '```',
      `${across.id}-ACROSS: PLANT | A green organism.`,
      'EXTRA | A spare suggestion.',
      'BONUS | Another spare.',
      '```',
    ].join('\n');

    const result = parseSkeletonFillResponse(response, { slots, intersections });

    expect(result.assignments.get(across.id)?.word).toBe('PLANT');
    expect(result.pool.map(p => p.word)).toEqual(['EXTRA', 'BONUS']);
    expect(result.issues).toHaveLength(0);
  });

  it('reports an unknown slot label as an issue, never as pool', () => {
    const { slots, intersections } = plusFixture();
    // id 999 does not exist in the fixture.
    const response = ['```', '999-ACROSS: PLANT | A green organism.', '```'].join('\n');

    const result = parseSkeletonFillResponse(response, { slots, intersections });

    expect(result.assignments.size).toBe(0);
    expect(result.pool).toHaveLength(0);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].message.toLowerCase()).toContain('slot');
  });

  it('tolerates markdown, numbering, and missing fences', () => {
    const { slots, intersections } = plusFixture();
    const across = slots.find(s => s.direction === 'across')!;
    const down = slots.find(s => s.direction === 'down')!;

    // No fence, list markers, bold labels.
    const response = [
      'Sure!',
      `1. **${across.id}-ACROSS**: PLANT | A green organism.`,
      `2) ${down.id}-down: GRAPE | A small round fruit.`,
    ].join('\n');

    const result = parseSkeletonFillResponse(response, { slots, intersections });

    expect(result.assignments.get(across.id)?.word).toBe('PLANT');
    expect(result.assignments.get(down.id)?.word).toBe('GRAPE');
  });

  it('dedupes the same word across slots case-insensitively (keeps the first)', () => {
    const { slots, intersections } = paneFixture();
    const acrosses = slots.filter(s => s.direction === 'across');
    const a0 = acrosses[0];
    const a1 = acrosses[1];

    const response = [
      '```',
      `${a0.id}-ACROSS: PLANT | A green organism.`,
      `${a1.id}-ACROSS: plant | Same word, lower case.`,
      '```',
    ].join('\n');

    const result = parseSkeletonFillResponse(response, { slots, intersections });

    expect(result.assignments.get(a0.id)?.word).toBe('PLANT');
    expect(result.assignments.has(a1.id)).toBe(false);
    expect(result.issues).toHaveLength(1);
  });

  it('accepts a two-word phrase only when allowTwoWords is on', () => {
    const { slots, intersections } = paneFixture();
    // Find a length-5 across slot... actually all are 5. SOLAR is one word;
    // use a phrase that fits a length-7 grid would need a bigger fixture.
    // Here every slot is length 5, so test the phrase gate on a length match:
    // "EXTRA_TIME" -> EXTRATIME (9) won't fit len 5, so build a custom slot test
    // by using a 9-wide pane is overkill; instead assert the phrase is read at all.
    const across = slots.find(s => s.direction === 'across')!; // len 5

    // A 5-letter solid phrase joined by underscore: "AB_CDE" -> "ABCDE" (5).
    const response = ['```', `${across.id}-ACROSS: AB_CDE | A two-part term.`, '```'].join('\n');

    const off = parseSkeletonFillResponse(response, { slots, intersections, allowTwoWords: false });
    // With phrases off, the underscore is illegal -> issue, no assignment.
    expect(off.assignments.has(across.id)).toBe(false);
    expect(off.issues).toHaveLength(1);

    const on = parseSkeletonFillResponse(response, { slots, intersections, allowTwoWords: true });
    // With phrases on, "AB_CDE" -> "AB CDE" (display), grid form "ABCDE" len 5 fits.
    expect(on.assignments.get(across.id)?.word).toBe('AB CDE');
    expect(on.issues).toHaveLength(0);
  });

  it('returns empty structures for blank input', () => {
    const { slots, intersections } = plusFixture();
    const result = parseSkeletonFillResponse('   ', { slots, intersections });
    expect(result.assignments.size).toBe(0);
    expect(result.pool).toHaveLength(0);
    expect(result.issues).toHaveLength(0);
  });
});

describe('fillSkeletonFromResponse (shared paste -> placed pipeline)', () => {
  it('locks the AI picks and fills a fresh (BYOG) grid with no pre-placed words', () => {
    const { slots, intersections, width, height } = plusFixture();
    const across = slots.find(s => s.direction === 'across')!;
    const down = slots.find(s => s.direction === 'down')!;

    // PLANT (across) and GRAPE (down) agree on 'A' at the shared centre cell.
    const response = [
      '```',
      `${across.id}-ACROSS: PLANT | A green organism.`,
      `${down.id}-DOWN: GRAPE | A small round fruit.`,
      '```',
    ].join('\n');

    const result = fillSkeletonFromResponse({ response, slots, intersections, width, height, seed: 1 });

    expect(result.assignments.get(across.id)?.word.toUpperCase()).toBe('PLANT');
    expect(result.assignments.get(down.id)?.word.toUpperCase()).toBe('GRAPE');
    expect(result.lockedCount).toBe(2); // both came from the AI
    expect(result.unfilledSlotIds).toHaveLength(0);
    expect(result.issues).toHaveLength(0);
  });

  it('keeps a pre-placed user word locked and crosses an AI answer through it', () => {
    const { slots, intersections, width, height } = plusFixture();
    const across = slots.find(s => s.direction === 'across')!;
    const down = slots.find(s => s.direction === 'down')!;

    // Skeleton-first reality: the across slot is a must-include word already
    // placed; the user only asks the AI to fill the crossing DOWN slot.
    const withPlaced = slots.map(s =>
      s.id === across.id ? { ...s, word: 'plant', clue: 'A green organism.', isUserWord: true } : s,
    );

    const response = ['```', `${down.id}-DOWN: GRAPE | A small round fruit.`, '```'].join('\n');

    const result = fillSkeletonFromResponse({
      response, slots: withPlaced, intersections, width, height, seed: 1,
    });

    // The placed word survives verbatim; only the AI's DOWN pick is "locked".
    expect(result.assignments.get(across.id)?.word.toLowerCase()).toBe('plant');
    expect(result.assignments.get(down.id)?.word.toUpperCase()).toBe('GRAPE');
    expect(result.lockedCount).toBe(1);
    expect(result.unfilledSlotIds).toHaveLength(0);
  });

  it('rejects an AI answer that contradicts a pre-placed word, never overwriting it', () => {
    const { slots, intersections, width, height } = plusFixture();
    const across = slots.find(s => s.direction === 'across')!;
    const down = slots.find(s => s.direction === 'down')!;

    const withPlaced = slots.map(s =>
      s.id === across.id ? { ...s, word: 'plant', clue: 'A green organism.', isUserWord: true } : s,
    );

    // ZEBRA has 'B' where PLANT has 'A' at the crossing — must be rejected.
    const response = ['```', `${down.id}-DOWN: ZEBRA | A striped animal.`, '```'].join('\n');

    const result = fillSkeletonFromResponse({
      response, slots: withPlaced, intersections, width, height, seed: 1,
    });

    // Placed word untouched; the conflicting AI pick was not locked; an issue is reported.
    expect(result.assignments.get(across.id)?.word.toLowerCase()).toBe('plant');
    expect(result.lockedCount).toBe(0);
    expect(result.issues.length).toBeGreaterThanOrEqual(1);
    // Whatever ends up in the DOWN slot (bank fallback or blank) must still
    // agree with the placed crossing letter — the solver honors it via the grid.
    const downWord = result.assignments.get(down.id)?.word;
    if (downWord) expect(downWord[2].toLowerCase()).toBe('a');
  });
});
