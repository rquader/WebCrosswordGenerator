/**
 * Tests for the AI fill prompt builder and response parser used by the
 * skeleton-first ("build your own grid") + BYOG flows.
 *
 * The prompt (buildSkeletonFillPrompt) is the "Variant J" flat-pool design
 * (see Obsidian "Phase 17 - Session 14 Prompt Experiment (A-J)"): it asks the
 * AI for a POOL of real words grouped by the DISTINCT lengths of the empty
 * slots, our local solver places them, and the AI is steered hard AWAY from
 * fabrication (the dominant risk, since the app has no dictionary). It does NOT
 * ask the AI to interlock or target individual slots — the prior per-slot
 * design provably triggered fabrication on weaker models and never helped.
 *
 * The parser (parseSkeletonFillResponse) routes the resulting unlabeled
 * "WORD | clue" lines to a flat `pool`, skips "# N letters" headers, parses the
 * machine-readable "# NOTES" footer (SHORT_LENGTHS / COMMENT), and drops the
 * "omission cruft" real models emit. It still tolerates legacy labeled lines for
 * robustness, so those parser tests remain.
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
  isDiscardedClue,
} from '../../src/utils/skeletonFillPrompt';
import { fillGrid } from '../../src/logic/gridFill';

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

/**
 * A 7×7 grid with slots of several DISTINCT lengths (3, 4, 5, 7), so the
 * "LENGTHS NEEDED" header has something interesting to compute. (The pane/plus
 * fixtures are all length 5.)
 */
const MIXED_ROWS = [
  '.......',  // 7-across
  '.#.#.#.',
  '.....##',  // 5-across
  '.#.#.#.',
  '....###',  // 4-across
  '.#.####',
  '...####',  // 3-across
];

function paneFixture() {
  const { mask, width, height } = maskFromRows(PANE_ROWS);
  const { slots } = deriveSlotsFromBlockMask(mask, width, height);
  const intersections = computeIntersections(slots);
  return { slots, intersections, width, height };
}

function mixedFixture() {
  const { mask, width, height } = maskFromRows(MIXED_ROWS);
  const { slots } = deriveSlotsFromBlockMask(mask, width, height);
  const intersections = computeIntersections(slots);
  return { slots, intersections, width, height };
}

describe('buildSkeletonFillPrompt - classroom appropriateness', () => {
  it('instructs the model to avoid profanity, slurs, and offensive terms', () => {
    const { slots, intersections, width, height } = paneFixture();
    const prompt = buildSkeletonFillPrompt({
      slots, intersections, width, height, grid: emptyGrid(width, height), context: 'animals',
    });
    expect(prompt).toContain('no profanity, slurs');
    expect(prompt.toLowerCase()).toContain('classroom');
  });
});

/** The distinct lengths of a fixture's empty (no-word) slots, ascending. */
function emptySlotLengths(slots: { word?: string; length: number }[]): number[] {
  return [...new Set(slots.filter(s => !s.word).map(s => s.length))].sort((a, b) => a - b);
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

describe('buildSkeletonFillPrompt (Variant J flat-pool)', () => {
  it('asks for a flat pool, NOT a per-slot interlock, and tells the AI our software places the words', () => {
    const { slots, intersections, width, height } = paneFixture();
    const prompt = buildSkeletonFillPrompt({
      slots,
      intersections,
      width,
      height,
      grid: emptyGrid(width, height),
      context: baseContext,
    });

    // The reframe that is the whole point of Variant J: the model recalls words;
    // OUR software arranges them. The model must NOT be asked to cross/order them.
    expect(prompt.toLowerCase()).toContain('pool of words');
    expect(prompt.toLowerCase()).toContain('my software places the words');
    expect(prompt.toLowerCase()).toContain('you do not need to arrange them');

    // The old per-slot scaffolding must be GONE — no slot labels, no ASCII grid,
    // no "crosses X at letter N", no per-slot pattern lines.
    expect(prompt).not.toContain('SLOTS TO FILL');
    expect(prompt).not.toContain('THE GRID');
    expect(prompt).not.toContain('crosses ');
    expect(prompt).not.toContain('pattern _');
    for (const slot of slots) {
      const dir = slot.direction === 'across' ? 'ACROSS' : 'DOWN';
      expect(prompt).not.toContain(`${slot.id}-${dir}:`);
    }
  });

  it('computes LENGTHS NEEDED from the DISTINCT lengths of the empty slots', () => {
    const { slots, intersections, width, height } = mixedFixture();
    const prompt = buildSkeletonFillPrompt({
      slots,
      intersections,
      width,
      height,
      grid: emptyGrid(width, height),
      context: baseContext,
    });

    // The mixed fixture has empty slots of lengths {3,4,5,7}. The header must
    // list exactly those distinct lengths, ascending, comma-separated.
    const lengths = emptySlotLengths(slots);
    expect(lengths).toContain(3);
    expect(lengths).toContain(7);
    // "3, 4, 5, and 7 letters." — last item joined with "and".
    expect(prompt).toContain('LENGTHS NEEDED:');
    expect(prompt).toContain(`${lengths.slice(0, -1).join(', ')}, and ${lengths[lengths.length - 1]} letters.`);
  });

  it('uses a single-item LENGTHS NEEDED line cleanly when every slot is one length', () => {
    const { slots, intersections, width, height } = paneFixture(); // all length 5
    const prompt = buildSkeletonFillPrompt({
      slots,
      intersections,
      width,
      height,
      grid: emptyGrid(width, height),
      context: baseContext,
    });

    // No "and" / no comma list for a single length.
    expect(prompt).toContain('LENGTHS NEEDED: 5 letters.');
  });

  it('states the anti-fabrication rule and names the observed failure modes verbatim', () => {
    const { slots, intersections, width, height } = paneFixture();
    const prompt = buildSkeletonFillPrompt({
      slots,
      intersections,
      width,
      height,
      grid: emptyGrid(width, height),
      context: baseContext,
    });

    // The headline rule.
    expect(prompt).toContain('THE RULE THAT MATTERS MOST');
    expect(prompt).toContain('real, correctly-spelled English word');
    expect(prompt).toContain('better to give FEWER words');

    // The named failure modes (the exact examples from the experiment).
    expect(prompt).toContain('REAL WORDS ONLY');
    expect(prompt).toContain('"referee"'); // truncation example
    expect(prompt).toContain('"glacier"'); // misspelling example
    expect(prompt).toContain('GLACER');
    expect(prompt).toContain('FREEKKICK'); // run-together example
    expect(prompt).toContain('OFFSTRIKE'); // invented-word example
    expect(prompt).toContain('OMIT'); // "OMIT, never reshape it to fit"

    // Count is not a goal; broader subject is OK; final re-read pass.
    expect(prompt).toContain('COUNT IS NOT A GOAL');
    expect(prompt).toContain('BROADER subject');
    expect(prompt.toLowerCase()).toContain('re-read');
    expect(prompt.toLowerCase()).toContain('silently delete');
  });

  it('includes the charset, topic context fenced verbatim, and a code-block-only closing', () => {
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
    expect(prompt).toContain('letters A-Z and digits 0-9'); // charsetLines reuse
    // Topic context, fenced verbatim.
    expect(prompt).toContain('===BEGIN TOPIC CONTEXT===');
    expect(prompt).toContain(baseContext);
    expect(prompt).toContain('===END TOPIC CONTEXT===');
    // Code-block-only contract.
    expect(prompt).toContain('OUTPUT FORMAT');
    expect(prompt.toLowerCase()).toContain('fenced code block');
    expect(prompt).toContain('Nothing outside the code block.');
  });

  it('specifies the grouped-by-length output format with "# N letters" headers and "WORD | clue" lines', () => {
    const { slots, intersections, width, height } = paneFixture();
    const prompt = buildSkeletonFillPrompt({
      slots,
      intersections,
      width,
      height,
      grid: emptyGrid(width, height),
      context: baseContext,
    });

    // The exact shapes the hardened parser expects.
    expect(prompt).toContain('# 5 letters'); // header example
    expect(prompt).toContain('WORD | Clue text');
    // No inline notes on word lines (the Sonnet cruft hazard the prompt fights).
    expect(prompt.toLowerCase()).toContain('never write a note');
  });

  it('specifies the machine-readable "# NOTES" block with SHORT_LENGTHS and COMMENT', () => {
    const { slots, intersections, width, height } = paneFixture();
    const prompt = buildSkeletonFillPrompt({
      slots,
      intersections,
      width,
      height,
      grid: emptyGrid(width, height),
      context: baseContext,
    });

    expect(prompt).toContain('# NOTES');
    expect(prompt).toContain('SHORT_LENGTHS:');
    expect(prompt).toContain('COMMENT:');
    // SHORT_LENGTHS is framed as HELPFUL, not a failure (Variant J's reframe).
    expect(prompt.toLowerCase()).toContain('helpful');
  });

  it('uses single-word rules and the no-proper-noun rule by default', () => {
    const { slots, intersections, width, height } = paneFixture();
    const prompt = buildSkeletonFillPrompt({
      slots,
      intersections,
      width,
      height,
      grid: emptyGrid(width, height),
      context: baseContext,
    });

    expect(prompt).toContain('SINGLE WORDS ONLY');
    expect(prompt).toContain('No proper nouns');
    // The single-word branch forbids running two words together.
    expect(prompt).toContain('FREEKKICK');
  });

  it('switches to two-word phrasing (underscore convention) and drops the proper-noun ban when allowed', () => {
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

    // The two-word branch keeps the app's underscore convention...
    expect(prompt).toContain('EXTRA_TIME');
    expect(prompt).toContain('MUST keep the underscore');
    // ...still forbids bare concatenation...
    expect(prompt).toContain('FREEKKICK');
    // ...and the single-word rule is replaced (not "SINGLE WORDS ONLY").
    expect(prompt).not.toContain('SINGLE WORDS ONLY');
    // Proper nouns now allowed → that ban is dropped.
    expect(prompt).not.toContain('No proper nouns');
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

    expect(prompt).toContain('Á É Í Ó Ú Ü Ñ');
  });

  it('only asks for the lengths of EMPTY slots, ignoring already-placed ones', () => {
    const { slots, intersections, width, height } = mixedFixture();
    // Mark every length-7 slot as already placed; LENGTHS NEEDED must drop 7.
    const placed = slots.map(s =>
      s.length === 7 ? { ...s, word: 'abcdefg', clue: 'Seven.', isUserWord: true } : s,
    );

    const prompt = buildSkeletonFillPrompt({
      slots: placed,
      intersections,
      width,
      height,
      grid: emptyGrid(width, height),
      context: baseContext,
    });

    const remaining = emptySlotLengths(placed); // no 7 now
    expect(remaining).not.toContain(7);
    // The LENGTHS NEEDED header reflects only the remaining empty-slot lengths.
    const headerLine = prompt.split('\n').find(l => l.startsWith('LENGTHS NEEDED:'))!;
    expect(headerLine).not.toContain('7');
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

  it('keeps the primary set consistent when two crossing picks disagree, but logs no issue', () => {
    const { slots, intersections } = plusFixture();
    const across = slots.find(s => s.direction === 'across')!; // crosses down at letter 3 (pos 2)
    const down = slots.find(s => s.direction === 'down')!;

    // across PLANT (pos2 'A') disagrees with down ZEBRA (pos2 'B') at the cross.
    const response = [
      '```',
      `${across.id}-ACROSS: PLANT | A green organism.`,
      `${down.id}-DOWN: ZEBRA | A striped animal.`,
      '```',
    ].join('\n');

    const result = parseSkeletonFillResponse(response, { slots, intersections });

    // The primary set stays consistent (PLANT kept, the conflicting ZEBRA not
    // promoted to a primary assignment) — but it is NOT an error: ZEBRA is kept
    // as a candidate the solver may use, and no misleading issue is logged.
    expect(result.assignments.get(across.id)?.word).toBe('PLANT');
    expect(result.assignments.has(down.id)).toBe(false);
    expect(result.slotCandidates.get(down.id)?.map(c => c.word)).toEqual(['ZEBRA']);
    expect(result.issues).toHaveLength(0);
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
    expect(result.slotCandidates.size).toBe(0);
    expect(result.pool).toHaveLength(0);
    expect(result.issues).toHaveLength(0);
  });

  /* ── Parser robustness: alternate separators, length hints, label drift ── */

  it('accepts an em-dash as the word/clue separator on a labeled line', () => {
    const { slots, intersections } = plusFixture();
    const across = slots.find(s => s.direction === 'across')!; // length 5

    const response = ['```', `${across.id}-ACROSS: PLANT — A green organism.`, '```'].join('\n');
    const result = parseSkeletonFillResponse(response, { slots, intersections });

    expect(result.assignments.get(across.id)?.word).toBe('PLANT');
    expect(result.assignments.get(across.id)?.clue).toBe('A green organism.');
    expect(result.issues).toHaveLength(0);
  });

  it('accepts an en-dash as the word/clue separator on a labeled line', () => {
    const { slots, intersections } = plusFixture();
    const across = slots.find(s => s.direction === 'across')!;

    const response = ['```', `${across.id}-ACROSS: PLANT – A green organism.`, '```'].join('\n');
    const result = parseSkeletonFillResponse(response, { slots, intersections });

    expect(result.assignments.get(across.id)?.word).toBe('PLANT');
    expect(result.assignments.get(across.id)?.clue).toBe('A green organism.');
    expect(result.issues).toHaveLength(0);
  });

  it('accepts a spaced hyphen as the word/clue separator on a labeled line', () => {
    const { slots, intersections } = plusFixture();
    const across = slots.find(s => s.direction === 'across')!;

    const response = ['```', `${across.id}-ACROSS: PLANT - A green organism.`, '```'].join('\n');
    const result = parseSkeletonFillResponse(response, { slots, intersections });

    expect(result.assignments.get(across.id)?.word).toBe('PLANT');
    expect(result.assignments.get(across.id)?.clue).toBe('A green organism.');
    expect(result.issues).toHaveLength(0);
  });

  it('accepts a colon as the word/clue separator, not mistaking the label colon', () => {
    const { slots, intersections } = plusFixture();
    const across = slots.find(s => s.direction === 'across')!;

    // Label colon (after ACROSS) must be parsed first; the SECOND colon is the
    // word/clue separator. WORD = PLANT, CLUE = "A green organism."
    const response = ['```', `${across.id}-ACROSS: PLANT: A green organism.`, '```'].join('\n');
    const result = parseSkeletonFillResponse(response, { slots, intersections });

    expect(result.assignments.get(across.id)?.word).toBe('PLANT');
    expect(result.assignments.get(across.id)?.clue).toBe('A green organism.');
    expect(result.issues).toHaveLength(0);
  });

  it('strips a trailing (5) length hint from the word before length-checking', () => {
    const { slots, intersections } = plusFixture();
    const across = slots.find(s => s.direction === 'across')!; // length 5

    const response = ['```', `${across.id}-ACROSS: PLANT (5) | A green organism.`, '```'].join('\n');
    const result = parseSkeletonFillResponse(response, { slots, intersections });

    expect(result.assignments.get(across.id)?.word).toBe('PLANT');
    expect(result.assignments.get(across.id)?.clue).toBe('A green organism.');
    expect(result.issues).toHaveLength(0);
  });

  it('strips a trailing [5] length hint from the word before length-checking', () => {
    const { slots, intersections } = plusFixture();
    const across = slots.find(s => s.direction === 'across')!;

    const response = ['```', `${across.id}-ACROSS: PLANT [5] | A green organism.`, '```'].join('\n');
    const result = parseSkeletonFillResponse(response, { slots, intersections });

    expect(result.assignments.get(across.id)?.word).toBe('PLANT');
    expect(result.assignments.get(across.id)?.clue).toBe('A green organism.');
    expect(result.issues).toHaveLength(0);
  });

  it('tolerates the label drift "Across 2:" (direction before number)', () => {
    const { slots, intersections } = plusFixture();
    const across = slots.find(s => s.direction === 'across')!;

    const response = ['```', `Across ${across.id}: PLANT | A green organism.`, '```'].join('\n');
    const result = parseSkeletonFillResponse(response, { slots, intersections });

    expect(result.assignments.get(across.id)?.word).toBe('PLANT');
    expect(result.issues).toHaveLength(0);
  });

  it('tolerates the label drift "2 Across:" (space, no hyphen)', () => {
    const { slots, intersections } = plusFixture();
    const across = slots.find(s => s.direction === 'across')!;

    const response = ['```', `${across.id} Across: PLANT | A green organism.`, '```'].join('\n');
    const result = parseSkeletonFillResponse(response, { slots, intersections });

    expect(result.assignments.get(across.id)?.word).toBe('PLANT');
    expect(result.issues).toHaveLength(0);
  });

  it('tolerates the label drift "{2}-ACROSS:" (braces around the number)', () => {
    const { slots, intersections } = plusFixture();
    const across = slots.find(s => s.direction === 'across')!;

    const response = ['```', `{${across.id}}-ACROSS: PLANT | A green organism.`, '```'].join('\n');
    const result = parseSkeletonFillResponse(response, { slots, intersections });

    expect(result.assignments.get(across.id)?.word).toBe('PLANT');
    expect(result.issues).toHaveLength(0);
  });

  it('tolerates the label drift "(2) ACROSS:" (parens around the number)', () => {
    const { slots, intersections } = plusFixture();
    const across = slots.find(s => s.direction === 'across')!;

    const response = ['```', `(${across.id}) ACROSS: PLANT | A green organism.`, '```'].join('\n');
    const result = parseSkeletonFillResponse(response, { slots, intersections });

    expect(result.assignments.get(across.id)?.word).toBe('PLANT');
    expect(result.issues).toHaveLength(0);
  });

  it('does NOT truncate a clue that contains a dash or colon after the real separator', () => {
    const { slots, intersections } = plusFixture();
    const across = slots.find(s => s.direction === 'across')!;

    // The canonical pipe separates word from clue; an em-dash and a colon LATER
    // in the clue must survive verbatim (split on the FIRST separator only).
    const clue = 'A green organism — found in gardens: leafy.';
    const response = ['```', `${across.id}-ACROSS: PLANT | ${clue}`, '```'].join('\n');
    const result = parseSkeletonFillResponse(response, { slots, intersections });

    expect(result.assignments.get(across.id)?.word).toBe('PLANT');
    expect(result.assignments.get(across.id)?.clue).toBe(clue);
    expect(result.issues).toHaveLength(0);
  });

  it('collects multiple options for one slot as best-first candidates, no issue', () => {
    const { slots, intersections } = plusFixture();
    const across = slots.find(s => s.direction === 'across')!; // length 5

    // Three options for the SAME slot (all length 5) — alternates, not conflicts.
    const response = [
      '```',
      `${across.id}-ACROSS: PLANT | A green organism.`,
      `${across.id}-ACROSS: PLAZA | An open public square.`,
      `${across.id}-ACROSS: PLANT | A duplicate, ignored.`,
      '```',
    ].join('\n');

    const result = parseSkeletonFillResponse(response, { slots, intersections });

    // assignments keeps the first valid pick; candidates keep every option,
    // deduped within the slot, in order. Alternates raise no issue.
    expect(result.assignments.get(across.id)?.word).toBe('PLANT');
    expect(result.slotCandidates.get(across.id)?.map(c => c.word)).toEqual(['PLANT', 'PLAZA']);
    expect(result.issues).toHaveLength(0);
  });
});

/* ── Flat-pool "grouped by length + NOTES" format (parser hardening) ─────────
 *
 * A separate task moves the AI grid-fill prompt to a flat word pool grouped by
 * "# N letters" headers, followed by a machine-readable "# NOTES" block. Real
 * models (Claude Sonnet especially) also emit "omission cruft" — lines for words
 * they decided to discard ("WORD | None — omitted."). The parser must:
 *   - skip '#' header lines (never a word),
 *   - switch to NOTES mode at "# NOTES" so nothing after becomes a word,
 *   - parse SHORT_LENGTHS / COMMENT out of the NOTES block,
 *   - drop omission-cruft word lines silently (no pool entry, no issue),
 *   - dedupe pool words case-insensitively,
 * while keeping every real "WORD | clue" line a pool entry.
 *
 * The app has no dictionary, so this parser is the ONLY guard against a fake
 * word leaking into a student's puzzle. These tests are correctness-critical. */
describe('parseSkeletonFillResponse — flat-pool NOTES format', () => {
  // The flat-pool format has no slot labels: every word is an unlabeled
  // "WORD | clue" line and lands in result.pool. We still pass real slots so
  // the parser runs its normal path; the pool is what we assert on.
  function poolWords(text: string): string[] {
    const { slots, intersections } = paneFixture();
    const result = parseSkeletonFillResponse(text, { slots, intersections });
    return result.pool.map(p => p.word);
  }

  it('parses a NOTES block (SHORT_LENGTHS + COMMENT) and never pools its tokens', () => {
    const { slots, intersections } = paneFixture();
    const response = [
      '```',
      '# 3 letters',
      'CAT | A small pet that purrs.',
      '# 5 letters',
      'TIGER | A striped big cat.',
      '# NOTES',
      'SHORT_LENGTHS: 3, 8',
      'COMMENT: text',
      '```',
    ].join('\n');

    const result = parseSkeletonFillResponse(response, { slots, intersections });

    expect(result.shortLengths).toEqual([3, 8]);
    expect(result.comment).toBe('text');
    const words = result.pool.map(p => p.word.toUpperCase());
    // The real words are present...
    expect(words).toContain('CAT');
    expect(words).toContain('TIGER');
    // ...and NO NOTES token leaked in as a word (the exact bug to eliminate).
    expect(words).not.toContain('COMMENT');
    expect(words).not.toContain('SHORT');
    expect(words).not.toContain('SHORT_LENGTHS');
    expect(words).not.toContain('TEXT');
  });

  it('treats SHORT_LENGTHS: none as an empty list', () => {
    const { slots, intersections } = paneFixture();
    const response = [
      '```',
      '# NOTES',
      'SHORT_LENGTHS: none',
      'COMMENT: Plenty of words exist.',
      '```',
    ].join('\n');

    const result = parseSkeletonFillResponse(response, { slots, intersections });
    expect(result.shortLengths).toEqual([]);
    expect(result.comment).toBe('Plenty of words exist.');
  });

  it('treats COMMENT: none as an empty string', () => {
    const { slots, intersections } = paneFixture();
    const response = ['```', '# NOTES', 'SHORT_LENGTHS: 4', 'COMMENT: none', '```'].join('\n');

    const result = parseSkeletonFillResponse(response, { slots, intersections });
    expect(result.shortLengths).toEqual([4]);
    expect(result.comment).toBe('');
  });

  it('ignores non-numeric SHORT_LENGTHS tokens robustly', () => {
    const { slots, intersections } = paneFixture();
    const response = ['```', '# NOTES', 'SHORT_LENGTHS: 3, foo, 8 and 11', '```'].join('\n');

    const result = parseSkeletonFillResponse(response, { slots, intersections });
    expect(result.shortLengths).toEqual([3, 8, 11]);
  });

  it('defaults shortLengths to [] and comment to "" when no NOTES block exists', () => {
    const { slots, intersections } = paneFixture();
    const response = ['```', 'CAT | A small pet that purrs.', '```'].join('\n');

    const result = parseSkeletonFillResponse(response, { slots, intersections });
    expect(result.shortLengths).toEqual([]);
    expect(result.comment).toBe('');
  });

  it('drops omission-cruft word lines silently (no pool entry, no issue)', () => {
    const { slots, intersections } = paneFixture();
    const response = [
      '```',
      '# 5 letters',
      'TIGER | A striped big cat.',
      'TRICKEL | None — misspelled, omitted.',
      'EVAP | ',
      'RAINDROP | Not 7 letters — omitted.',
      'RUNON | Not a real word — omitted.',
      'DRIZZLE| None — 7 letters, moved below.',
      'CUMULONIMBUS| None — too long, omitted.',
      '```',
    ].join('\n');

    const result = parseSkeletonFillResponse(response, { slots, intersections });
    const words = result.pool.map(p => p.word.toUpperCase());

    // Every cruft WORD must be absent from the pool.
    expect(words).not.toContain('TRICKEL');
    expect(words).not.toContain('EVAP');
    expect(words).not.toContain('RAINDROP');
    expect(words).not.toContain('RUNON');
    expect(words).not.toContain('DRIZZLE');
    expect(words).not.toContain('CUMULONIMBUS');
    // The one real word survives.
    expect(words).toContain('TIGER');
    // Cruft is an intentional omission, not a parse error.
    expect(result.issues).toHaveLength(0);
  });

  it('keeps real descriptive clues that only resemble a trigger (no false drop)', () => {
    const { slots, intersections } = paneFixture();
    const response = [
      '```',
      'CAMEL | A desert mammal with humps.',
      'MAMMAL | An animal that feeds its young milk.',
      'LIZARD | A reptile that can drop its tail.',
      '```',
    ].join('\n');

    const result = parseSkeletonFillResponse(response, { slots, intersections });
    const words = result.pool.map(p => p.word.toUpperCase());

    // None of these real clues match a cruft pattern — all survive.
    expect(words).toContain('CAMEL');
    expect(words).toContain('MAMMAL');
    expect(words).toContain('LIZARD');
    expect(result.issues).toHaveLength(0);
  });

  it('skips "# N letters" header lines entirely (no word contributed)', () => {
    const words = poolWords(['```', '# 5 letters', 'TIGER | A striped big cat.', '```'].join('\n'));
    expect(words.map(w => w.toUpperCase())).toEqual(['TIGER']);
  });

  it('de-duplicates pool words case-insensitively, keeping the first', () => {
    const { slots, intersections } = paneFixture();
    const response = [
      '```',
      'FROZEN | Turned to ice.',
      'frozen | A duplicate, lower case.',
      'FROZEN | Another duplicate.',
      '```',
    ].join('\n');

    const result = parseSkeletonFillResponse(response, { slots, intersections });
    const frozenCount = result.pool.filter(p => p.word.toLowerCase() === 'frozen').length;
    expect(frozenCount).toBe(1);
    expect(result.pool[0].clue).toBe('Turned to ice.');
  });

  it('matches the NOTES header in several spellings (# NOTES, #NOTES, # notes)', () => {
    const { slots, intersections } = paneFixture();
    for (const header of ['# NOTES', '#NOTES', '# notes']) {
      const response = [
        '```',
        'CAT | A small pet that purrs.',
        header,
        'COMMENT: A note here.',
        '```',
      ].join('\n');
      const result = parseSkeletonFillResponse(response, { slots, intersections });
      // After the NOTES header, nothing becomes a word: COMMENT must not pool.
      expect(result.pool.map(p => p.word.toUpperCase())).not.toContain('COMMENT');
      expect(result.comment).toBe('A note here.');
    }
  });

  it('threads shortLengths + comment through fillSkeletonFromResponse', () => {
    const { slots, intersections, width, height } = paneFixture();
    const response = [
      '```',
      '# NOTES',
      'SHORT_LENGTHS: 3, 9',
      'COMMENT: Sparse topic.',
      '```',
    ].join('\n');

    const result = fillSkeletonFromResponse({ response, slots, intersections, width, height, seed: 1 });
    expect(result.shortLengths).toEqual([3, 9]);
    expect(result.comment).toBe('Sparse topic.');
  });
});

/* ── Adversarial robustness: unseen LLM output (correctness-critical) ────────
 *
 * The app has NO dictionary, so this parser is the ONLY guard against a fake /
 * garbage word reaching a student's puzzle. These tests pin the FAIL-SAFE
 * contract: drop anything that is clearly metadata, a header, a placeholder, or
 * a discard annotation — but NEVER drop a line that could be a real answer with
 * a real descriptive clue, and NEVER throw on any input. */
describe('parseSkeletonFillResponse — adversarial / unseen LLM output', () => {
  function poolWords(text: string): string[] {
    const { slots, intersections } = paneFixture();
    const result = parseSkeletonFillResponse(text, { slots, intersections });
    return result.pool.map(p => p.word.toUpperCase());
  }

  /* 1 — FALSE-POSITIVE GUARDS: real clues that merely CONTAIN a trigger word
   * must be KEPT. The bare includes('omitted'|'removed'|'moved below') was the
   * danger — a full descriptive sentence is never a discard. */
  it('keeps a real clue that contains "removed" inside a full sentence', () => {
    const words = poolWords(['```', 'OTTER | A fish often removed from nets.', '```'].join('\n'));
    expect(words).toContain('OTTER');
  });

  it('keeps a real clue that contains "moved below" inside a full sentence', () => {
    const words = poolWords(['```', 'LEDGE | A bird whose nest was moved below the roof.', '```'].join('\n'));
    expect(words).toContain('LEDGE');
  });

  it('keeps a real clue with "not" + comparison (resembles a trigger but is descriptive)', () => {
    const words = poolWords(['```', 'TIGER | A big cat, not a small one.', '```'].join('\n'));
    expect(words).toContain('TIGER');
  });

  it('still drops the SHORT meta discard "None — omitted" but keeps a long real sentence', () => {
    // isDiscardedClue: short ⇒ "omitted"/"removed"/"moved below" are discard
    // signals; a long descriptive sentence is never one.
    expect(isDiscardedClue('None — omitted')).toBe(true);
    expect(isDiscardedClue('removed')).toBe(true);
    expect(isDiscardedClue('moved below')).toBe(true);
    expect(isDiscardedClue('A fish often removed from nets.')).toBe(false);
    expect(isDiscardedClue('A bird whose nest was moved below the roof.')).toBe(false);
  });

  /* 2 — Metadata WITHOUT a "# NOTES" header: SHORT_LENGTHS / COMMENT recognized
   * anywhere; they must parse into the result and NEVER become pool words. */
  it('recognizes SHORT_LENGTHS + COMMENT as metadata even with no NOTES header', () => {
    const { slots, intersections } = paneFixture();
    const response = [
      '```',
      'CAT | A small pet that purrs.',
      'SHORT_LENGTHS: 3, 8',
      'COMMENT: few long words',
      '```',
    ].join('\n');

    const result = parseSkeletonFillResponse(response, { slots, intersections });
    expect(result.shortLengths).toEqual([3, 8]);
    expect(result.comment).toBe('few long words');
    const words = result.pool.map(p => p.word.toUpperCase());
    expect(words).not.toContain('COMMENT');
    expect(words).not.toContain('SHORTLENGTHS');
    expect(words).not.toContain('SHORT_LENGTHS');
    expect(words).not.toContain('SHORT');
    expect(words).toContain('CAT');
  });

  it('recognizes header-less metadata even with a leading bullet/marker', () => {
    const words = poolWords(['```', '- COMMENT: a stray note', '* SHORT_LENGTHS: 4', '```'].join('\n'));
    expect(words).not.toContain('COMMENT');
    expect(words).not.toContain('SHORT_LENGTHS');
    expect(words).not.toContain('SHORTLENGTHS');
  });

  /* 3 — Broadened NOTES + length-group header tolerance: never a word. */
  it('skips length-group headers in many shapes (## / **bold** / colon / bare / brackets)', () => {
    for (const header of ['## 5 letters', '**5 letters**', '5 letters:', '5 LETTERS', '[5 letters]']) {
      const words = poolWords(['```', header, 'TIGER | A striped big cat.', '```'].join('\n'));
      expect(words).toEqual(['TIGER']);
    }
  });

  it('skips a bare "notes" / "**notes**" / "=== notes" line (no word, switches NOTES mode)', () => {
    const { slots, intersections } = paneFixture();
    for (const header of ['notes', 'notes:', '**notes**', '=== notes ===']) {
      const response = [
        '```',
        'CAT | A small pet that purrs.',
        header,
        'COMMENT: a note',
        '```',
      ].join('\n');
      const result = parseSkeletonFillResponse(response, { slots, intersections });
      const words = result.pool.map(p => p.word.toUpperCase());
      expect(words).not.toContain('NOTES');
      expect(words).not.toContain('COMMENT');
      expect(result.comment).toBe('a note');
    }
  });

  /* 4 — Placeholder / punctuation-only clues ⇒ drop (word is suspect). */
  it('drops a labeled answer whose clue is a placeholder (-, skip, ..., ?, n/a, tbd)', () => {
    const { slots, intersections } = plusFixture();
    const across = slots.find(s => s.direction === 'across')!; // length 5
    for (const clue of ['-', '—', '...', '…', '?', '??', 'n/a', 'na', 'tbd', 'todo', 'skip', 'x', 'none.']) {
      const response = ['```', `${across.id}-ACROSS: PLANT | ${clue}`, '```'].join('\n');
      const result = parseSkeletonFillResponse(response, { slots, intersections });
      expect(result.assignments.has(across.id)).toBe(false);
      expect(result.slotCandidates.has(across.id)).toBe(false);
    }
  });

  it('drops a pool word whose clue is a placeholder', () => {
    const words = poolWords(['```', 'TIGER | A striped big cat.', 'OTTER | tbd', 'CAMEL | ...', '```'].join('\n'));
    expect(words).toContain('TIGER');
    expect(words).not.toContain('OTTER');
    expect(words).not.toContain('CAMEL');
  });

  it('drops a clue that is wholly non-alphabetic', () => {
    const words = poolWords(['```', 'TIGER | A striped big cat.', 'OTTER | 12345 !!!', '```'].join('\n'));
    expect(words).toContain('TIGER');
    expect(words).not.toContain('OTTER');
  });

  /* 5 — Empty / non-letter WORD token ⇒ drop (no throw). */
  it('drops a line whose word token has no letters (| clue, 123 | clue, *** | clue)', () => {
    const { slots, intersections } = paneFixture();
    for (const line of ['| A clue with no word.', '  | A clue with no word.', '123 | A numeric token.', '*** | A symbol token.']) {
      const result = parseSkeletonFillResponse(['```', line, '```'].join('\n'), { slots, intersections });
      expect(result.pool).toHaveLength(0);
    }
  });

  it('drops an empty/garbage WORD on a labeled line without throwing', () => {
    const { slots, intersections } = plusFixture();
    const across = slots.find(s => s.direction === 'across')!;
    for (const line of [`${across.id}-ACROSS: | A clue.`, `${across.id}-ACROSS: ### | A clue.`]) {
      const result = parseSkeletonFillResponse(['```', line, '```'].join('\n'), { slots, intersections });
      expect(result.assignments.has(across.id)).toBe(false);
    }
  });

  /* 6 — Broader list markers / bullets stripped from line starts; word intact. */
  it('strips assorted bullets (•, ‣, ▪, ◦, →, +, em/en dash) and keeps the word', () => {
    const { slots, intersections } = paneFixture();
    const lines = [
      '• CAMEL | A desert mammal.',
      '‣ OTTER | A river mammal.',
      '▪ ZEBRA | A striped horse.',
      '◦ HORSE | A farm animal.',
      '+ LLAMA | A woolly animal.',
      '— BISON | A large bovine.',
      '– MOOSE | A large deer.',
    ];
    const result = parseSkeletonFillResponse(['```', ...lines, '```'].join('\n'), { slots, intersections });
    const words = result.pool.map(p => p.word.toUpperCase());
    expect(words).toEqual(['CAMEL', 'OTTER', 'ZEBRA', 'HORSE', 'LLAMA', 'BISON', 'MOOSE']);
  });

  it('strips enumerators a) a. (1) i. from the line start, keeping the word', () => {
    const { slots, intersections } = paneFixture();
    const lines = [
      'a) CAMEL | A desert mammal.',
      'b. OTTER | A river mammal.',
      '(1) ZEBRA | A striped horse.',
      'i. HORSE | A farm animal.',
    ];
    const result = parseSkeletonFillResponse(['```', ...lines, '```'].join('\n'), { slots, intersections });
    expect(result.pool.map(p => p.word.toUpperCase())).toEqual(['CAMEL', 'OTTER', 'ZEBRA', 'HORSE']);
  });

  /* 7 — Exception safety / pure garbage: a valid result, NEVER a throw. */
  it('never throws on pure-garbage / pathological input', () => {
    const { slots, intersections } = paneFixture();
    const inputs = [
      ' \u{1F4A9}�​ random ✺◊∆ unicode ⟟⏧',
      'X'.repeat(50000) + ' | ' + 'y'.repeat(50000),
      '```\n```',
      '```\n# NOTES\n```',
      '# NOTES',
      '||||',
      '\n\n\n',
      '- \n— \n• \n',
    ];
    for (const input of inputs) {
      expect(() => parseSkeletonFillResponse(input, { slots, intersections })).not.toThrow();
      const result = parseSkeletonFillResponse(input, { slots, intersections });
      expect(result.assignments).toBeInstanceOf(Map);
      expect(Array.isArray(result.pool)).toBe(true);
      expect(Array.isArray(result.issues)).toBe(true);
    }
  });

  it('a 50k-char single line is handled (kept or dropped) without throwing', () => {
    const { slots, intersections } = paneFixture();
    const huge = 'WORD | ' + 'a'.repeat(50000) + ' clue.';
    expect(() => parseSkeletonFillResponse(['```', huge, '```'].join('\n'), { slots, intersections })).not.toThrow();
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

  it('falls back to an alternate candidate when the AI\u2019s first pick can\u2019t cross', () => {
    const { slots, intersections, width, height } = plusFixture();
    const across = slots.find(s => s.direction === 'across')!; // crosses down at pos 2
    const down = slots.find(s => s.direction === 'down')!;

    // The AI's FIRST across option (ZEBRA, 'B' at the centre) clashes with the
    // down option (GRAPE, 'A' at the centre). Its SECOND option (PLANT, 'A')
    // agrees. The multi-candidate solver must discard ZEBRA and use PLANT so the
    // whole grid is consistent — the headline robustness win of Part B.
    const response = [
      '```',
      `${across.id}-ACROSS: ZEBRA | A striped animal.`,
      `${across.id}-ACROSS: PLANT | A green organism.`,
      `${down.id}-DOWN: GRAPE | A small round fruit.`,
      '```',
    ].join('\n');

    const result = fillSkeletonFromResponse({ response, slots, intersections, width, height, seed: 1 });

    expect(result.assignments.get(across.id)?.word.toUpperCase()).toBe('PLANT');
    expect(result.assignments.get(down.id)?.word.toUpperCase()).toBe('GRAPE');
    expect(result.unfilledSlotIds).toHaveLength(0);
    // Both final words came from the AI's candidate options.
    expect(result.lockedCount).toBe(2);
    // No parse issues: alternates are legal, not errors.
    expect(result.issues).toHaveLength(0);
  });
});

/* ── End-to-end proof: REAL Variant J model replies → grid (correctness-critical)
 *
 * These are VERBATIM saved outputs from the prompt experiment
 * (Obsidian "**Variant J** Test Results.md"), pasted exactly as the model
 * produced them — including the "# N letters" headers, the "# NOTES" footer, and
 * (for Sonnet) the real "omission cruft" it emits. They run through the ACTUAL
 * parser + solver on a grid built from a real block mask, proving the new
 * flat-pool prompt's real-world output flows end-to-end with no fabricated /
 * cruft word leaking into a placed answer. The app has no dictionary, so this is
 * the regression guard the vault plan (Step 1) calls for. */
describe('end-to-end: real Variant J replies through parse → solve', () => {
  // A real block mask whose empty slots span lengths 3-8 — matching the length
  // groups the saved replies produce. 20 slots, well-crossed, so the solver
  // places pool words and completes the rest from the word bank.
  const E2E_ROWS = [
    '........',
    '.#.#.#.#',
    '.......#',
    '#.#.#.#.',
    '......##',
    '.#.#.###',
    '.....###',
    '#.#.####',
    '....####',
    '.#.#####',
    '...#####',
  ];

  function e2eFixture() {
    const { mask, width, height } = maskFromRows(E2E_ROWS);
    const { slots } = deriveSlotsFromBlockMask(mask, width, height);
    const intersections = computeIntersections(slots);
    return { slots, intersections, width, height };
  }

  // Claude Sonnet 4.6 (High) — "the water cycle", iteration 1. CHOSEN because it
  // is the cruft hazard: it caught its would-be fakes ("omit, don't fix") but
  // wrote them out as lines like `TRICKEL | None — misspelled, omitted.`,
  // `DRIZZLE| None — 7 letters, moved below.`, `EVAPORATE| None — 9 letters,
  // omitted.`, and an empty-clue `EVAP | `. A naive parser would resurrect those
  // fakes. It also honestly reports `SHORT_LENGTHS: 3`. (Abridged to the
  // representative groups; verbatim line shapes preserved.)
  const SONNET_WATER_CYCLE = `Here is a pool of words for your crossword.
\`\`\`
# 3 letters
DEW | Tiny water droplets that form on cool surfaces overnight.
ICE | Water in its frozen solid state.
FOG | A thick cloud of tiny water droplets close to the ground.
SEA | A large body of salt water on Earth's surface.

# 5 letters
CLOUD | A mass of tiny water droplets floating high in the sky.
VAPOR | Water in its invisible gaseous form in the air.
EVADE | None — removed to stay on topic.
RUNOF | None — omitted.
SHORE | The land along the edge of a body of water.

# 6 letters
CLOUDS | Masses of tiny water droplets floating high in the atmosphere.
FROZEN | Changed into solid ice by very cold temperatures.
DRIZZLE| None — 7 letters, moved below.
ICECAP | None — two words joined, omitted.

# 7 letters
DRIZZLE | Light, fine rain falling in very small drops.
GLACIER | A large, slow-moving mass of ice formed from compacted snow.
TRICKEL | None — misspelled, omitted.

# 8 letters
RAINFALL | The amount of rain that falls in a given area.
EVAPORATE| None — 9 letters, omitted.
PRECIPIT | None — truncated, omitted.

# NOTES
SHORT_LENGTHS: 3
COMMENT: A few candidate words were omitted at each length to ensure all survivors are real.
\`\`\``;

  // Claude Sonnet 4.6 (Low) — "the water cycle". A DIFFERENT cruft shape at the
  // low effort level: discarded words get a BLANK clue (`EVAP | `, `RUNOF |`,
  // `CLOUDS |`, `GLACIR |`) rather than a "None — ..." note. Same hazard, must
  // also be dropped. (Abridged; verbatim shapes preserved.)
  const SONNET_WATER_CYCLE_LOW = `\`\`\`
# 4 letters
RAIN | Water that falls from clouds as liquid drops.
SNOW | Frozen precipitation that falls as white flakes.
EVAP |
POOL | A small body of standing water.

# 5 letters
CLOUD | A visible mass of water droplets floating in the sky.
RIVER | A large natural stream of water flowing to the sea.
RUNOF |
STORM | A violent disturbance with heavy rain and strong winds.

# 6 letters
CLOUDS |
FROZEN | Turned to ice by very cold temperatures.
GLACIR |
SHOWER | A brief fall of rain from passing clouds.

# 7 letters
DRIZZLE | Light, fine rain falling in very small drops.
GLACIER | A large, slow-moving mass of ice formed from snow.
RAINDROP |
WETLAND | Low-lying land that is saturated with water.

# NOTES
SHORT_LENGTHS: none
COMMENT: Removed all words that were misspelled, wrong length, or multi-word compounds during final review.
\`\`\``;

  // Opus 4.8 (High) — "the French Revolution". The flawless case: zero
  // fabrication, rich on-topic vocab across every length, `SHORT_LENGTHS: none`.
  // (Abridged to the groups that fit our fixture's lengths.)
  const OPUS_FRENCH_REVOLUTION = `\`\`\`
# 3 letters
MOB | An unruly, angry crowd of people.
WAR | Armed conflict between nations or groups.
TAX | Money citizens must pay the government.
LAW | A rule enforced by authority.

# 4 letters
KING | A male hereditary ruler.
RIOT | A violent public disturbance.
DUKE | A high-ranking noble.
OATH | A solemn promise or vow.

# 5 letters
QUEEN | A female monarch.
NOBLE | A member of the aristocracy.
CROWD | A large gathering of people.
REIGN | The period a ruler holds power.

# 6 letters
REVOLT | An uprising against authority.
TYRANT | A cruel and oppressive ruler.
PALACE | A grand royal residence.
FAMINE | A severe shortage of food.

# 7 letters
LIBERTY | The state of being free.
JUSTICE | Fair treatment under the law.
TYRANNY | Cruel and unjust use of power.
TREASON | The crime of betraying one's country.

# 8 letters
REPUBLIC | A state with no monarch.
MONARCHY | Government ruled by a king or queen.
EQUALITY | The state of being equal.
UPRISING | A rebellion against authority.

# NOTES
SHORT_LENGTHS: none
COMMENT: Words drawn from revolution, monarchy, and broader political and social vocabulary.
\`\`\``;

  // Words that must NEVER appear in a placed answer: the omission cruft from the
  // Sonnet replies + any leaked NOTES token. (TRICKEL/GLACIR are the misspellings;
  // RUNOF/EVAP truncations; EVAPORATE/PRECIPIT/RAINDROP wrong-length; ICECAP a
  // joined phrase; EVADE off-topic; COMMENT/SHORT/NOTES are footer tokens.)
  const FORBIDDEN = [
    'TRICKEL', 'GLACIR', 'RUNOF', 'EVAP', 'EVAPORATE', 'PRECIPIT', 'RAINDROP',
    'ICECAP', 'EVADE', 'COMMENT', 'SHORT', 'SHORTLENGTHS', 'SHORT_LENGTHS', 'NOTES',
  ];

  it('parses the Sonnet (High) reply without throwing and extracts NOTES, dropping all cruft', () => {
    const { slots, intersections } = e2eFixture();

    let parse!: ReturnType<typeof parseSkeletonFillResponse>;
    expect(() => {
      parse = parseSkeletonFillResponse(SONNET_WATER_CYCLE, { slots, intersections });
    }).not.toThrow();

    // NOTES mined.
    expect(parse.shortLengths).toEqual([3]);
    expect(parse.comment).toContain('omitted at each length');

    // The real words made it into the pool...
    const pool = parse.pool.map(p => p.word.toUpperCase());
    expect(pool).toContain('DEW');
    expect(pool).toContain('CLOUD');
    expect(pool).toContain('GLACIER');
    expect(pool).toContain('RAINFALL');
    // ...and NONE of the cruft / footer tokens did.
    for (const bad of FORBIDDEN) expect(pool).not.toContain(bad);
    // DRIZZLE appears once as a real 7-letter word and once as 6-letter cruft;
    // the cruft line is dropped, the real one kept (deduped to a single entry).
    expect(pool.filter(w => w === 'DRIZZLE')).toHaveLength(1);
  });

  it('places the Sonnet (High) reply onto a real grid with no cruft leaking into any answer', () => {
    const { slots, intersections, width, height } = e2eFixture();

    let result!: ReturnType<typeof fillSkeletonFromResponse>;
    expect(() => {
      result = fillSkeletonFromResponse({
        response: SONNET_WATER_CYCLE, slots, intersections, width, height, seed: 1,
      });
    }).not.toThrow();

    // Slots actually fill (from pool + word bank). The bulk of a 20-slot grid
    // lands; a few hard-crossing slots may stay blank, which is by design.
    expect(result.assignments.size).toBeGreaterThanOrEqual(14);

    // The NOTES signal threads through the fill result.
    expect(result.shortLengths).toEqual([3]);
    expect(result.comment).toContain('omitted at each length');

    // The headline guarantee: NO fabricated / cruft word in ANY placed answer.
    const placed = [...result.assignments.values()].map(a => a.word.toUpperCase());
    for (const bad of FORBIDDEN) expect(placed).not.toContain(bad);

    // At least one of the AI's real pool words was actually placed (DEW, SEA and
    // CLOUD all fit short slots) — the pool genuinely contributes, not just the bank.
    const realPoolWords = ['DEW', 'ICE', 'FOG', 'SEA', 'CLOUD', 'VAPOR', 'FROZEN'];
    expect(placed.some(w => realPoolWords.includes(w))).toBe(true);
  });

  it('handles the Sonnet (Low) blank-clue cruft shape end-to-end without leaking it', () => {
    const { slots, intersections, width, height } = e2eFixture();

    const parse = parseSkeletonFillResponse(SONNET_WATER_CYCLE_LOW, { slots, intersections });
    const pool = parse.pool.map(p => p.word.toUpperCase());
    // Blank-clue discards (EVAP, RUNOF, CLOUDS, GLACIR, RAINDROP) are dropped...
    expect(pool).not.toContain('EVAP');
    expect(pool).not.toContain('RUNOF');
    expect(pool).not.toContain('GLACIR');
    expect(pool).not.toContain('RAINDROP');
    expect(pool).not.toContain('CLOUDS'); // had a blank clue in this reply
    // ...while the clued real words survive.
    expect(pool).toContain('RAIN');
    expect(pool).toContain('CLOUD');
    expect(pool).toContain('GLACIER');

    const result = fillSkeletonFromResponse({
      response: SONNET_WATER_CYCLE_LOW, slots, intersections, width, height, seed: 1,
    });
    const placed = [...result.assignments.values()].map(a => a.word.toUpperCase());
    for (const bad of FORBIDDEN) expect(placed).not.toContain(bad);
    // The bulk of the 20-slot grid fills (pool + bank); a few hard-crossing slots
    // may stay blank, which is by design. The two-phase pool-first fill trades a
    // little total fill for far more on-topic words (the deliberate tradeoff —
    // see the "crowd out" test below), so the floor is ~65%, not ~70%.
    expect(result.assignments.size).toBeGreaterThanOrEqual(13);
  });

  it('places the flawless Opus reply with rich on-topic words and SHORT_LENGTHS none', () => {
    const { slots, intersections, width, height } = e2eFixture();

    const parse = parseSkeletonFillResponse(OPUS_FRENCH_REVOLUTION, { slots, intersections });
    expect(parse.shortLengths).toEqual([]); // "none"
    expect(parse.comment).toContain('broader political');
    // The full rich pool parses (24 real, on-topic words across every length)...
    const pool = parse.pool.map(p => p.word.toUpperCase());
    expect(pool).toHaveLength(24);
    for (const w of ['MOB', 'KING', 'QUEEN', 'REVOLT', 'LIBERTY', 'REPUBLIC']) {
      expect(pool).toContain(w);
    }
    // ...with NO footer token leaking in as a word.
    for (const bad of ['COMMENT', 'NOTES', 'SHORT', 'SHORT_LENGTHS']) {
      expect(pool).not.toContain(bad);
    }

    const result = fillSkeletonFromResponse({
      response: OPUS_FRENCH_REVOLUTION, slots, intersections, width, height, seed: 1,
    });
    // A clean, rich reply fills the bulk of the grid (pool + bank complete it),
    // and the NOTES signal threads through.
    expect(result.assignments.size).toBeGreaterThanOrEqual(14);
    expect(result.shortLengths).toEqual([]);
    expect(result.issues).toHaveLength(0); // a clean reply produces no parser issues
  });

  // The bank is a GAP-FILLER, not a competitor: the full pool+bank pipeline must
  // place at least as many of the AI's on-topic words as a pool-ONLY solve can
  // interlock on the same grid. (The single-pass solver regressed here — bank
  // words committed early at crossings locked out pool words downstream, so the
  // pipeline placed far fewer on-topic words than the grid could actually hold.)
  it('does not let the word bank crowd out pool words the grid can hold', () => {
    const { slots, intersections, width, height } = e2eFixture();

    const parse = parseSkeletonFillResponse(OPUS_FRENCH_REVOLUTION, { slots, intersections });
    const poolSet = new Set(parse.pool.map(p => p.word.toLowerCase()));

    // Reference ceiling: a pool-ONLY solve (blanks allowed) — every filled slot
    // is on-topic, so its fill count is the most pool words this grid can hold.
    const poolOnly = fillGrid({
      slots, intersections, pool: parse.pool, slotCandidates: parse.slotCandidates,
      includeWordBank: false, seed: 1,
    });
    const ceiling = poolOnly.assignments.size;
    expect(ceiling).toBeGreaterThan(0);

    // The real pipeline (pool + bank). On-topic = a placed word that is in the pool.
    const result = fillSkeletonFromResponse({
      response: OPUS_FRENCH_REVOLUTION, slots, intersections, width, height, seed: 1,
    });
    const onTopicPlaced = [...result.assignments.values()]
      .filter(a => poolSet.has(a.word.toLowerCase())).length;

    // Adding the bank must not REDUCE how many pool words land.
    expect(onTopicPlaced).toBeGreaterThanOrEqual(ceiling);
  });
});

/**
 * Robustness for OUTLYING / abstract topics (e.g. "French Revolution") whose
 * replies are messier than the easy "animals" case: weak models slip in accents
 * the prompt asked them to drop, and use an em-dash instead of the "|" separator
 * in the unlabeled flat pool. Both used to silently lose a real on-topic word.
 */
describe('parser robustness — abstract-topic reply shapes', () => {
  const { mask, width, height } = maskFromRows(['.....']); // 1x5, one 5-slot
  const { slots } = deriveSlotsFromBlockMask(mask, width, height);
  const intersections = computeIntersections(slots);
  const poolWords = (text: string, language?: 'english' | 'spanish') =>
    parseSkeletonFillResponse(text, { slots, intersections, language }).pool.map(p => p.word);

  it('accepts an em-dash separator on an unlabeled pool line (inside a fence)', () => {
    // A real reply mixes "|" lines with the occasional em-dash slip. The fence is
    // detected via the pipe line; the em-dash line must NOT be lost.
    const text = '```\nKING | A male ruler\nGUILLOTINE — A machine for beheading\n```';
    expect(poolWords(text)).toEqual(expect.arrayContaining(['KING', 'GUILLOTINE']));
  });

  it('folds an accented word to the ASCII charset for an accent-free language', () => {
    // The prompt asks for plain form ("ELEVE"); a weak model sends "ÉMIGRÉ".
    // English/French/etc. (extraLetters = '') should keep it as EMIGRE, not drop it.
    const text = '```\nKING | A male ruler\nÉMIGRÉ | A person who fled the country\n```';
    expect(poolWords(text)).toContain('EMIGRE');
  });

  it('does NOT flatten accents for a language whose charset keeps them (Spanish)', () => {
    const text = '```\nREY | Un monarca masculino\nCANCIÓN | Una pieza musical\n```';
    expect(poolWords(text, 'spanish')).toEqual(expect.arrayContaining(['REY', 'CANCIÓN']));
  });

  it('does NOT treat an em-dash in loose prose as an entry (lenient, no fence)', () => {
    // No fence -> lenient whole-text mode -> only "|" splits, so a dash in the
    // model's chatter ("Sure — here you go") can never become a spurious word.
    const text = 'Sure — here you go\nKING | A male ruler';
    const words = poolWords(text);
    expect(words).toContain('KING');
    expect(words).not.toContain('SURE');
  });
});
